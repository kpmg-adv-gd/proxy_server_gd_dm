const postgresdbService = require('../../connection');
const queryDashKPI = require("./queries");

const { getModificheTestingData } = require("../../../api/modifiche/library");
const { getVerbaliSupervisoreAssembly } = require("../../../api/verbali/library");
const { ordersChildrenRecursion } = require("../verbali/library");
const { callGet } = require("../../../../utility/CommonCallApi");
const { dispatch } = require("../../../mdo/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getDashboardKPI(plant, project, wbe, sfc, section, material, order) {

    // 1. Raccolta dati da tutte le tabelle details
    var orderClassification = await _classifyOrders(plant, order);
    var hierarchyResult = await _calcCumulativeDurations(plant, orderClassification.all);
    var cumulativeDurations = hierarchyResult.durations;
    var childToParent = hierarchyResult.childToParent;
    var machineDetails = await getMachineProgressDetails(plant, wbe, orderClassification, cumulativeDurations, hierarchyResult.childrenMap);
    var sfcGruppi  = _getSFCProgressFromClassification(orderClassification, "gruppi", childToParent);
    var sfcAggr    = _getSFCProgressFromClassification(orderClassification, "aggr", childToParent);
    var sfcMacr    = _getSFCProgressFromClassification(orderClassification, "macr", childToParent);
    var scostamentoGD       = getScostamentoDetails(machineDetails, "GD", hierarchyResult.childrenMap);
    var scostamentoFornitori = getScostamentoDetails(machineDetails, "Fornitori", hierarchyResult.childrenMap);
    var mancantiDetails  = await getMancantiDetails(plant, wbe, orderClassification);
    var evasiDetails     = getEvasiDetails(orderClassification);
    var modificheDetails = await getModificheDetails(plant, project, wbe, sfc, section, material);
    var varianzeDetails  = await getVarianzeDetails(plant, order);
    var ncPresenzaData   = await _getNcPresenza(plant, orderClassification);

    // 2. Calcola valori chart dai dati delle tabelle
    var result = {};

    result.gruppiLevels = {
        gruppi: _calcGruppiLevelChart(sfcGruppi.data),
        aggr:   _calcGruppiLevelChart(sfcAggr.data),
        macr:   _calcGruppiLevelChart(sfcMacr.data)
    };

    result.mancanti = _calcMancantiSummary(mancantiDetails);

    var modificheCounts = _calcModificheTotals(modificheDetails.data);
    result.nonConformita = {
        ordiniConNC: ncPresenzaData.ordiniConNC,
        maOpen: String(modificheCounts.open),
        maClosed: String(modificheCounts.closed)
    };

    result.chartData = {
        machineProgress: _calcMachineProgressChart(machineDetails.data),
        scostamentoLevels: {
            GD:        _calcScostamentoChart(scostamentoGD.data),
            Fornitori: _calcScostamentoChart(scostamentoFornitori.data)
        },
        mancanti: _calcMancantiChart(mancantiDetails),
        evasi:    _calcEvasiChart(evasiDetails.data),
        ncPresenza: [
            { label: "NC open", value: ncPresenzaData.ncOpen },
            { label: "NC bloccanti", value: ncPresenzaData.ncBloccanti },
            { label: "NC closed", value: ncPresenzaData.ncClosed }
        ],
        modificheOpen:   _calcModificheChart(modificheDetails.data, "Open"),
        modificheClosed: _calcModificheChart(modificheDetails.data, "Closed"),
        tipologiaVarianze:      _calcTipologiaVarianzeChart(varianzeDetails.data),
        responsabilitaVarianze: _calcResponsabilitaVarianzeChart(varianzeDetails.data)
    };

    // 4. Include tutti i dati delle tabelle details (pre-caricati per il frontend)
    result.details = {
        machineProgress: machineDetails,
        sfcProgress: {
            gruppi: sfcGruppi,
            aggr:   sfcAggr,
            macr:   sfcMacr
        },
        scostamento: {
            GD:        scostamentoGD,
            Fornitori: scostamentoFornitori
        },
        mancanti:            { columns: mancantiDetails.columns, data: mancantiDetails.data },
        evasi:               evasiDetails,
        modifiche:           modificheDetails,
        tipologiaVarianze:   varianzeDetails.detailsTipologia,
        responsabilitaVarianze: varianzeDetails.detailsResponsabilita
    };

    return result;
}

async function getDataFilterDashboardKPI(plant, project, phase, customer, section) {
    var treeData = await getVerbaliSupervisoreAssembly(plant, project || "", "", true);
    if (!treeData || treeData === false) return [];

    // Restituisce direttamente la struttura ad albero raggruppata per progetto
    // Ogni nodo parent ha: project, children[]
    // Ogni child ha: project, wbe, section, sfc, order, material, status, reportStatus
    var result = treeData.map(function(projectNode) {
        var children = (projectNode.Children || []).map(function(child) {
            return {
                project: "",
                wbe: child.wbs || "",
                section: child.material || "",
                sfc: child.sfc || "",
                order: child.order || "",
                material: child.material || "",
                status: child.status || "",
                reportStatus: child.reportStatus || "",
                customer: child.customer || "",
                project_parent: child.project_parent || projectNode.project || "",
                children: []
            };
        });

        // Filtro lato server sui children
        if (section) {
            children = children.filter(function(item) {
                return item.section === section;
            });
        }
        // Filtro lato server sui customer
        if (customer) {
            children = children.filter(function(item) {
                return item.customer === customer;
            });
        }
        // todo: il filtro phase attualmente non è in uso, poichè è attiva solo la scelta "Assembly"

        return {
            project: projectNode.project || "",
            wbe: "",
            section: "",
            sfc: "",
            order: "",
            material: "",
            status: "",
            reportStatus: "",
            children: children
        };
    });

    // Rimuovi progetti senza children dopo il filtro
    result = result.filter(function(node) {
        return node.children.length > 0;
    });

    return result;
}

// ========== REAL DATA FUNCTIONS ==========

/**
 * Classifica tutti gli ordini (figli/nipoti) per ORDER_TYPE.
 * Per ogni ordine recupera: order, orderType, sfc, totalOps, completedOps, percentuale
 */
async function _classifyOrders(plant, order) {
    var allOrders = await ordersChildrenRecursion(plant, order);
    var gruppi = [], aggregati = [], macroaggregati = [];

    // Recupera ORDER_TYPE per tutti gli ordini in parallelo (batch)
    var orderDetails = await Promise.all(allOrders.map(async function(ord) {
        try {
            var url = hostname + "/order/v1/orders?order=" + ord + "&plant=" + plant;
            var orderResp = await callGet(url);
            var orderTypeField = orderResp?.customValues?.find(function(obj) { return obj.attribute === "ORDER_TYPE"; });
            var orderType = orderTypeField?.value || "";
            var unloadPointField = orderResp?.customValues?.find(function(obj) { return obj.attribute === "UNLOAD_POINT"; });
            var unloadPoint = unloadPointField?.value || null;
            var plannedStartDate = orderResp?.plannedStartDate || null;
            var sfcValue = orderResp?.sfcs?.[0] || "";
            return { order: ord, orderType: orderType, unloadPoint: unloadPoint, plannedStartDate: plannedStartDate, sfc: sfcValue };
        } catch (e) {
            console.log("Error fetching order detail for " + ord + ": " + e.message);
            return { order: ord, orderType: "", unloadPoint: null, plannedStartDate: null, sfc: "" };
        }
    }));

    // Per ogni ordine recupera % completamento dall'SFC (ponderata su DURATION) e routing steps
    var enriched = await Promise.all(orderDetails.map(async function(item) {
        var pct = "0,00%";
        var routingSteps = [];
        var totalOps = 0, completedOps = 0;
        var pctOps = "0,00%";
        if (item.sfc) {
            try {
                var urlSfc = hostname + "/sfc/v1/sfcdetail?plant=" + plant + "&sfc=" + item.sfc;
                var sfcDetail = await callGet(urlSfc);
                var steps = sfcDetail?.steps || [];
                var totalOps = steps.length;
                var completedOps = steps.filter(function(s) { return s.quantityDone === 1; }).length;
                var pctOps = "0,00%";
                if (totalOps > 0) {
                    pctOps = (completedOps / totalOps * 100).toFixed(2).replace(".", ",") + "%";
                }
                // Recupera routing steps con DURATION
                var routing = sfcDetail?.routing?.routing;
                var routingVersion = sfcDetail?.routing?.version;
                var routingType = sfcDetail?.routing?.type === "SHOPORDER_SPECIFIC" ? "SHOP_ORDER" : sfcDetail?.routing?.type;
                var routingStepsData = [];
                if (routing) {
                    try {
                        var urlRouting = hostname + "/routing/v1/routings/routingSteps?plant=" + plant + "&routing=" + routing + "&type=" + routingType + "&version=" + routingVersion;
                        var routingResp = await callGet(urlRouting);
                        routingStepsData = routingResp?.routingSteps || [];
                    } catch (e2) {
                        console.log("Error fetching routing steps for " + routing + ": " + e2.message);
                    }
                }

                // Combina sfcdetail steps con routing steps per DURATION
                steps.forEach(function(sfcStep) {
                    var stepOp = sfcStep?.operation?.operation || "";
                    var status = "New";
                    if (sfcStep.quantityDone === 1) status = "Done";
                    else if (sfcStep.quantityInWork === 1) status = "In Work";
                    else if (sfcStep.quantityInQueue === 1) status = "In Queue";

                    // Cerca DURATION nel routing step corrispondente
                    var duration = "";
                    var matchedRouting = routingStepsData.find(function(rs) {
                        return rs?.routingOperation?.operationActivity?.operationActivity === stepOp;
                    });
                    if (matchedRouting) {
                        var durationField = matchedRouting?.routingOperation?.customValues?.find(function(cv) { return cv.attribute === "DURATION"; });
                        duration = durationField?.value || "";
                    }

                    routingSteps.push({
                        stepId: sfcStep.stepId || "",
                        operation: stepOp,
                        description: sfcStep?.operation?.description || "",
                        workCenter: sfcStep?.plannedWorkCenter || "",
                        status: status,
                        duration: duration
                    });
                });

                // Calcola % completamento ponderata su DURATION
                var totalDuration = 0, completedDuration = 0;
                routingSteps.forEach(function(rs) {
                    var dur = (parseFloat(String(rs.duration || "").replace(/\./g, "")) || 0) / 1000;
                    totalDuration += dur;
                    if (rs.status === "Done") completedDuration += dur;
                });
                if (totalDuration > 0) {
                    pct = (completedDuration / totalDuration * 100).toFixed(2).replace(".", ",") + "%";
                }
            } catch (e) {
                console.log("Error fetching sfc detail for " + item.sfc + ": " + e.message);
            }
        }
        return {
            order: item.order,
            orderType: item.orderType,
            sfc: item.sfc,
            totalOps: totalOps || 0,
            completedOps: completedOps || 0,
            percentualeCompletamento: pct,
            percentualeCompletamentoOps: pctOps || "0,00%",
            unloadPoint: item.unloadPoint,
            plannedStartDate: item.plannedStartDate,
            routingSteps: routingSteps
        };
    }));

    // Classifica
    enriched.forEach(function(item) {
        if (item.orderType === "MACH" || item.orderType === "MACR" || item.orderType === "AGGR") {
            if (item.orderType === "AGGR") aggregati.push(item);
            else if (item.orderType === "MACR") macroaggregati.push(item);
            // MACH non va in nessuna lista di conteggio
        } else {
            gruppi.push(item);
        }
    });

    return { all: enriched, gruppi: gruppi, aggregati: aggregati, macroaggregati: macroaggregati };
}

/**
 * Calcola la duration cumulativa per ogni ordine (propria + tutti i discendenti).
 * Usa z_orders_link per ricostruire la gerarchia.
 */
async function _calcCumulativeDurations(plant, enrichedOrders) {
    var allOrderIds = enrichedOrders.map(function(item) { return item.order; });

    // Recupera gerarchia parent->children da DB
    var hierarchyRows = [];
    try {
        hierarchyRows = await postgresdbService.executeQuery(queryDashKPI.getOrdersHierarchyQuery, [plant, allOrderIds]) || [];
    } catch (e) {
        console.log("Error fetching orders hierarchy: " + e.message);
    }

    // Mappa parent -> [children]
    var childrenMap = {};
    hierarchyRows.forEach(function(row) {
        if (!childrenMap[row.parent_order]) childrenMap[row.parent_order] = [];
        childrenMap[row.parent_order].push(row.child_order);
    });

    // Mappa order -> somma duration proprie routing steps
    var ownDurationMap = {};
    enrichedOrders.forEach(function(item) {
        var sum = 0;
        (item.routingSteps || []).forEach(function(rs) { sum += (parseFloat(String(rs.duration || "").replace(/\./g, "")) || 0) / 1000; });
        ownDurationMap[item.order] = sum;
    });

    // Ricorsione per sommare duration di tutti i discendenti
    var cache = {};
    function getCumulativeDuration(orderId) {
        if (cache[orderId] !== undefined) return cache[orderId];
        var total = ownDurationMap[orderId] || 0;
        var children = childrenMap[orderId] || [];
        children.forEach(function(childId) {
            total += getCumulativeDuration(childId);
        });
        cache[orderId] = total;
        return total;
    }

    // Calcola per tutti gli ordini
    var result = {};
    allOrderIds.forEach(function(orderId) {
        result[orderId] = getCumulativeDuration(orderId);
    });

    // Mappa child -> parent (inversa)
    var childToParent = {};
    hierarchyRows.forEach(function(row) {
        childToParent[row.child_order] = row.parent_order;
    });

    return { durations: result, childToParent: childToParent, childrenMap: childrenMap };
}

/**
 * 2.2.1 Machine Progress Details - TreeTable con ordini (parent) e routing steps (children)
 * Aggiunge Ore effettive e Ore marcate.
 * - Workcenter F_*: Done -> oreEffettive = orePianificate, altrimenti 0; oreMarcate sempre vuota
 * - Altri workcenter: oreEffettive = oreMarcate = marked_labor da z_marking_recap
 * - % completamento = Ore Effettive / Ore Pianificate (cumulative)
 */
async function getMachineProgressDetails(plant, wbe, orderClassification, cumulativeDurations, childrenMap) {
    var parentColumns = [
        { key: "type",                     label: "Type",            width: "120px" },
        { key: "order",                    label: "Order",           width: "180px" },
        { key: "sfc",                      label: "SFC",             width: "220px" },
        { key: "percentualeCompletamento", label: "% completamento", width: "120px" },
    ];
    var childColumns = [
        { key: "operation",    label: "Operation",       width: "140px" },
        { key: "description",  label: "Description",     width: "200px" },
        { key: "workCenter",   label: "Work Center",     width: "130px" },
        { key: "status",       label: "Status",          width: "100px" },
        { key: "duration",     label: "Ore pianificate", width: "100px" },
        { key: "oreEffettive", label: "Ore effettive",   width: "110px" },
        { key: "oreMarcate",   label: "Ore marcate",     width: "110px" }
    ];

    // Query z_marking_recap in batch per tutti gli ordini
    var allOrderIds = orderClassification.all.map(function(item) { return item.order; });
    var markingLookup = {};
    try {
        var markingRows = await postgresdbService.executeQuery(
            queryDashKPI.getMarkingRecapForDashboardQuery,
            [plant, wbe, allOrderIds]
        );
        (markingRows || []).forEach(function(row) {
            var key = row.mes_order + "_" + row.operation;
            if (!markingLookup[key]) markingLookup[key] = { marked: 0, variance: 0 };
            markingLookup[key].marked += (parseFloat(row.marked_labor) || 0);
            markingLookup[key].variance += (parseFloat(row.variance_labor) || 0);
        });
    } catch (e) {
        console.log("Error fetching marking recap for dashboard: " + e.message);
    }

    // Mappe per calcolo cumulativo ore effettive, marcate e varianza
    var ownOreEffettiveMap = {};
    var ownOreMarcateMap = {};
    var ownOreVarianzaMap = {};

    var data = orderClassification.all.map(function(item) {
        var type = "Gruppo";
        if (item.orderType === "MACH") type = "Macchina";
        else if (item.orderType === "MACR") type = "Macroaggregato";
        else if (item.orderType === "AGGR") type = "Aggregato";

        var ownOreEffettive = 0;
        var ownOreMarcate = 0;
        var ownOreVarianza = 0;

        var children = (item.routingSteps || []).map(function(step) {
            var dur = (parseFloat(String(step.duration || "").replace(/\./g, "")) || 0) / 1000;
            var oreEffettive = 0;
            var oreMarcate = "";
            var oreVarianza = "";

            if (step.workCenter && step.workCenter.startsWith("F_")) {
                // Workcenter F_: ore effettive in base a status, ore marcate e varianza sempre vuote
                if (step.status === "Done") {
                    oreEffettive = dur;
                } else {
                    oreEffettive = 0;
                }
                oreMarcate = "";
                oreVarianza = "";
            } else {
                // Altri workcenter: leggi da z_marking_recap
                var key = item.order + "_" + step.operation;
                var lookup = markingLookup[key] || { marked: 0, variance: 0 };
                oreEffettive = lookup.marked;
                oreMarcate = lookup.marked;
                oreVarianza = lookup.variance;
            }

            ownOreEffettive += (typeof oreEffettive === "number" ? oreEffettive : 0);
            ownOreMarcate += (typeof oreMarcate === "number" ? oreMarcate : 0);
            ownOreVarianza += (typeof oreVarianza === "number" ? oreVarianza : 0);

            return {
                operation: step.operation,
                description: step.description,
                workCenter: step.workCenter,
                status: step.status,
                duration: dur,
                oreEffettive: oreEffettive,
                oreMarcate: oreMarcate,
                oreVarianza: oreVarianza
            };
        });

        ownOreEffettiveMap[item.order] = ownOreEffettive;
        ownOreMarcateMap[item.order] = ownOreMarcate;
        ownOreVarianzaMap[item.order] = ownOreVarianza;

        return {
            type: type,
            order: item.order,
            sfc: item.sfc,
            percentualeCompletamento: "0,00%",
            duration: cumulativeDurations[item.order] || 0,
            oreEffettive: 0,
            oreMarcate: 0,
            oreVarianza: 0,
            children: children
        };
    });

    // Calcolo cumulativo ore effettive (proprie + discendenti)
    var cacheEff = {};
    function getCumulativeOreEffettive(orderId) {
        if (cacheEff[orderId] !== undefined) return cacheEff[orderId];
        var total = ownOreEffettiveMap[orderId] || 0;
        var chl = (childrenMap || {})[orderId] || [];
        chl.forEach(function(childId) {
            total += getCumulativeOreEffettive(childId);
        });
        cacheEff[orderId] = total;
        return total;
    }

    // Calcolo cumulativo ore marcate (proprie + discendenti)
    var cacheMarc = {};
    function getCumulativeOreMarcate(orderId) {
        if (cacheMarc[orderId] !== undefined) return cacheMarc[orderId];
        var total = ownOreMarcateMap[orderId] || 0;
        var chl = (childrenMap || {})[orderId] || [];
        chl.forEach(function(childId) {
            total += getCumulativeOreMarcate(childId);
        });
        cacheMarc[orderId] = total;
        return total;
    }

    // Calcolo cumulativo ore varianza (proprie + discendenti)
    var cacheVar = {};
    function getCumulativeOreVarianza(orderId) {
        if (cacheVar[orderId] !== undefined) return cacheVar[orderId];
        var total = ownOreVarianzaMap[orderId] || 0;
        var chl = (childrenMap || {})[orderId] || [];
        chl.forEach(function(childId) {
            total += getCumulativeOreVarianza(childId);
        });
        cacheVar[orderId] = total;
        return total;
    }

    // Imposta valori cumulativi e ricalcola % completamento
    data.forEach(function(row) {
        var cumOreEff = getCumulativeOreEffettive(row.order);
        var cumOreMarcate = getCumulativeOreMarcate(row.order);
        var cumOreVarianza = getCumulativeOreVarianza(row.order);
        var cumDuration = cumulativeDurations[row.order] || 0;

        row.oreEffettive = cumOreEff;
        row.oreMarcate = cumOreMarcate;
        row.oreVarianza = cumOreVarianza;

        // % completamento = Ore Effettive / Ore Pianificate
        if (cumDuration > 0) {
            row.percentualeCompletamento = (cumOreEff / cumDuration * 100).toFixed(2).replace(".", ",") + "%";
        } else {
            row.percentualeCompletamento = "0,00%";
        }
    });

    return { parentColumns: parentColumns, childColumns: childColumns, data: data, isTree: true };
}

/**
 * 2.2.2 SFC Progress Details per livello (gruppi/aggr/macr) dalla classificazione
 */
function _getSFCProgressFromClassification(orderClassification, level, childToParent) {
    // Mappa order -> orderType per risalire la gerarchia
    var orderTypeMap = {};
    orderClassification.all.forEach(function(item) { orderTypeMap[item.order] = item.orderType; });

    // Risale la catena parent per trovare Aggregato, Macroaggregato, Macchina
    function _getAncestors(orderId) {
        var ancestors = { aggregato: "", macroaggregato: "", macchina: "" };
        var current = orderId;
        var visited = {};
        while (childToParent[current] && !visited[current]) {
            visited[current] = true;
            var parent = childToParent[current];
            var parentType = orderTypeMap[parent] || "";
            if (parentType === "AGGR" && !ancestors.aggregato) ancestors.aggregato = parent;
            else if (parentType === "MACR" && !ancestors.macroaggregato) ancestors.macroaggregato = parent;
            else if (parentType === "MACH" && !ancestors.macchina) ancestors.macchina = parent;
            current = parent;
        }
        return ancestors;
    }

    var columns = [
        { key: "order",  label: "Order",   width: "180px" },
        { key: "sfc",    label: "SFC",     width: "220px" },
        { key: "macroaggregato",  label: "Macroaggregato",  width: "180px" },
        { key: "aggregato",       label: "Aggregato",       width: "180px" },
        { key: "macchina",        label: "Macchina",        width: "180px" },
        { key: "totalOps",      label: "Tot. Operazioni", width: "120px" },
        { key: "completedOps",  label: "Op. Completate",  width: "120px" },
        { key: "percentualeCompletamentoOps", label: "% completamento", width: "120px" }
    ];

    var opsColumns = [
        { key: "order",       label: "Order",       width: "180px" },
        { key: "macroaggregato",  label: "Macroaggregato",  width: "180px" },
        { key: "aggregato",       label: "Aggregato",       width: "180px" },
        { key: "macchina",        label: "Macchina",        width: "180px" },
        { key: "operation",   label: "Operation",   width: "140px" },
        { key: "description", label: "Description",  width: "200px" },
        { key: "workCenter",  label: "Work Center",  width: "130px" },
        { key: "status",      label: "Status",       width: "100px" },
        { key: "duration",    label: "Ore pianificate",     width: "100px" }
    ];

    var dataMap = {
        gruppi: orderClassification.gruppi,
        aggr: orderClassification.aggregati,
        macr: orderClassification.macroaggregati
    };

    var sLevel = level || "gruppi";
    var items = dataMap[sLevel] || [];
    var data = items.map(function(item) {
        var anc = _getAncestors(item.order);
        return {
            order: item.order,
            sfc: item.sfc,
            aggregato: anc.aggregato,
            macroaggregato: anc.macroaggregato,
            macchina: anc.macchina,
            totalOps: item.totalOps,
            completedOps: item.completedOps,
            percentualeCompletamentoOps: item.percentualeCompletamentoOps
        };
    });

    // Flat list di tutte le operazioni di tutti gli ordini del livello
    var allOps = [];
    items.forEach(function(item) {
        var anc = _getAncestors(item.order);
        (item.routingSteps || []).forEach(function(step) {
            allOps.push({
                order: item.order,
                aggregato: anc.aggregato,
                macroaggregato: anc.macroaggregato,
                macchina: anc.macchina,
                operation: step.operation,
                description: step.description,
                workCenter: step.workCenter,
                status: step.status,
                duration: step.duration
            });
        });
    });

    return {
        columns: columns,
        data: data,
        opsColumns: opsColumns,
        opsData: allOps
    };
}

/**
 * Wrapper per compatibilità export (usata dal frontend details)
 */
function getSFCProgressDetails(plant, project, wbe, sfc, level) {
    // Fallback vuoto se chiamata direttamente senza classificazione
    return { columns: [], data: [] };
}

/**
 * 2.2.3 Scostamento Details - TreeTable uguale a Machine Progress ma filtrata per workcenter.
 * GD = workcenter che NON inizia con F_, Fornitori = workcenter che inizia con F_
 */
function getScostamentoDetails(machineDetails, workcenter, childrenMap) {
    var parentColumns = [
        { key: "type",                     label: "Type",            width: "120px" },
        { key: "order",                    label: "Order",           width: "180px" },
        { key: "sfc",                      label: "SFC",             width: "220px" },
        { key: "percentualeCompletamento", label: "% completamento", width: "120px" },
    ];
    var childColumns = [
        { key: "operation",    label: "Operation",       width: "140px" },
        { key: "description",  label: "Description",     width: "200px" },
        { key: "workCenter",   label: "Work Center",     width: "130px" },
        { key: "status",       label: "Status",          width: "100px" },
        { key: "duration",     label: "Ore pianificate", width: "100px" },
        { key: "oreEffettive", label: "Ore effettive",   width: "110px" },
        { key: "oreMarcate",   label: "Ore marcate",     width: "110px" },
        { key: "oreVarianza",  label: "Ore varianza",    width: "110px" }
    ];

    var isGD = workcenter === "GD";

    // Mappa order -> somme proprie (solo operazioni filtrate per workcenter)
    var ownDurationMap = {};
    var ownOreEffettiveMap = {};
    var ownOreMarcateMap = {};
    var ownOreVarianzaMap = {};

    // Filtra children per workcenter e calcola somme proprie
    var data = machineDetails.data.map(function(row) {
        var filteredChildren = (row.children || []).filter(function(child) {
            var wc = child.workCenter || "";
            if (isGD) return !wc.startsWith("F_");
            return wc.startsWith("F_");
        });

        var ownDuration = 0, ownOreEffettive = 0, ownOreMarcate = 0, ownOreVarianza = 0;
        filteredChildren.forEach(function(child) {
            ownDuration += (typeof child.duration === "number" ? child.duration : 0);
            ownOreEffettive += (typeof child.oreEffettive === "number" ? child.oreEffettive : 0);
            ownOreMarcate += (typeof child.oreMarcate === "number" ? child.oreMarcate : 0);
            ownOreVarianza += (typeof child.oreVarianza === "number" ? child.oreVarianza : 0);
        });

        ownDurationMap[row.order] = ownDuration;
        ownOreEffettiveMap[row.order] = ownOreEffettive;
        ownOreMarcateMap[row.order] = ownOreMarcate;
        ownOreVarianzaMap[row.order] = ownOreVarianza;

        return {
            type: row.type,
            order: row.order,
            sfc: row.sfc,
            percentualeCompletamento: "0,00%",
            duration: 0,
            oreEffettive: 0,
            oreMarcate: 0,
            oreVarianza: 0,
            children: filteredChildren
        };
    });

    // Calcolo cumulativo (proprie + discendenti) per ogni metrica
    function getCumulative(ownMap, orderId, cache) {
        if (cache[orderId] !== undefined) return cache[orderId];
        var total = ownMap[orderId] || 0;
        var chl = (childrenMap || {})[orderId] || [];
        chl.forEach(function(childId) {
            total += getCumulative(ownMap, childId, cache);
        });
        cache[orderId] = total;
        return total;
    }

    var cacheDur = {}, cacheEff = {}, cacheMarc = {}, cacheVar = {};

    // Imposta valori cumulativi e ricalcola % completamento
    data.forEach(function(row) {
        row.duration = getCumulative(ownDurationMap, row.order, cacheDur);
        row.oreEffettive = getCumulative(ownOreEffettiveMap, row.order, cacheEff);
        row.oreMarcate = getCumulative(ownOreMarcateMap, row.order, cacheMarc);
        row.oreVarianza = getCumulative(ownOreVarianzaMap, row.order, cacheVar);

        if (row.duration > 0) {
            row.percentualeCompletamento = (row.oreEffettive / row.duration * 100).toFixed(2).replace(".", ",") + "%";
        }
    });

    // Rimuovi ordini senza operazioni proprie E senza discendenti con operazioni
    data = data.filter(function(row) {
        return row.children.length > 0 || row.duration > 0;
    });

    return { parentColumns: parentColumns, childColumns: childColumns, data: data, isTree: true };
}

/**
 * 2.3 Mancanti Details - Dati reali da z_report_mancanti
 * Per ogni ordine gruppo, verifica presenza in z_report_mancanti e classifica:
 *   - No mancanti: ordine non presente nella tabella
 *   - Con mancanti: ordine presente, data di ricezione >= oggi
 *   - Mancanti scaduti: ordine presente, data di ricezione < oggi
 */
async function getMancantiDetails(plant, wbe, orderClassification) {
    var gruppiOrders = orderClassification.gruppi.map(function(item) { return item.order; });
    if (gruppiOrders.length === 0) {
        return { columns: [], data: [], totalMissing: 0, gruppiCount: 0 };
    }

    var columns = [
        { key: "order",                label: "Order",                width: "150px" },
        { key: "missingComponent",     label: "Componente Mancante",  width: "150px" },
        { key: "componentDescription", label: "Descrizione",          width: "220px" },
        { key: "missingQuantity",      label: "Qty Mancante",         width: "110px" },
        { key: "coverElement",         label: "Cover Element",        width: "150px" },
        { key: "dataRicezione",        label: "Data Ricezione",       width: "120px" },
        { key: "stato",                label: "Stato",                width: "120px" }
    ];

    var rows = await postgresdbService.executeQuery(queryDashKPI.getMancantiForDashboardQuery, [plant, wbe, gruppiOrders]);
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Raggruppa i record per ordine per classificare a livello gruppo
    var orderMap = {}; // order -> array of rows
    rows.forEach(function(r) {
        if (!orderMap[r.order]) orderMap[r.order] = [];
        orderMap[r.order].push(r);
    });

    var data = [];
    var totalMissing = 0;

    gruppiOrders.forEach(function(ord) {
        var recs = orderMap[ord];
        if (!recs || recs.length === 0) {
            // Ordine senza mancanti - non aggiungere righe al dettaglio
            return;
        }
        recs.forEach(function(r) {
            var receiptDate = _getReceiptDate(r);
            var stato = "Con mancanti";
            if (receiptDate && receiptDate < today) {
                stato = "Mancanti scaduti";
            }

            var formattedDate = "";
            if (receiptDate) {
                var dd = String(receiptDate.getDate()).padStart(2, '0');
                var mm = String(receiptDate.getMonth() + 1).padStart(2, '0');
                var yyyy = receiptDate.getFullYear();
                formattedDate = dd + "/" + mm + "/" + yyyy;
            }

            totalMissing += parseFloat(r.missing_quantity) || 0;

            data.push({
                order: r.order,
                missingComponent: r.missing_component,
                componentDescription: r.component_description,
                missingQuantity: parseFloat(r.missing_quantity) || 0,
                coverElement: r.cover_element,
                dataRicezione: formattedDate,
                stato: stato
            });
        });
    });

    return { columns: columns, data: data, totalMissing: totalMissing, totalComponentQty: await _getTotalComponentQty(plant, gruppiOrders), gruppiCount: gruppiOrders.length, orderMap: orderMap };
}

/**
 * Interroga MDO per ottenere SUM(QUANTITY_TOTAL) dei componenti BOM associati agli ordini.
 * Step 1: /mdo/ORDER per ottenere BOM e BOM_VERSION per plant+orders
 * Step 2: /mdo/BOM_COMPONENT per sommare QUANTITY_TOTAL dove IS_DELETED = false
 */
async function _getTotalComponentQty(plant, orders) {
    try {
        // Step 1: Recupera BOM e BOM_VERSION dagli ordini
        var orderFilter = orders.map(function(o) { return "MFG_ORDER eq '" + o + "'"; }).join(" or ");
        var reqOrder = {
            path: "/mdo/ORDER",
            query: { $apply: "filter(PLANT eq '" + plant + "' and (" + orderFilter + "))" },
            method: "GET"
        };
        var resOrder = await dispatch(reqOrder);
        var orderRows = (resOrder && resOrder.data && resOrder.data.value) || [];

        // Raccogli coppie BOM + BOM_VERSION uniche
        var bomSet = {};
        orderRows.forEach(function(row) {
            if (row.BOM && row.BOM_VERSION) {
                var key = row.BOM + "|" + row.BOM_VERSION;
                bomSet[key] = { bom: row.BOM, version: row.BOM_VERSION };
            }
        });
        var bomPairs = Object.keys(bomSet).map(function(k) { return bomSet[k]; });
        if (bomPairs.length === 0) return 0;

        // Step 2: Query BOM_COMPONENT con aggregate SUM(QUANTITY_TOTAL)
        var bomFilter = bomPairs.map(function(p) {
            return "(BOM eq '" + p.bom + "' and BOM_VERSION eq '" + p.version + "')";
        }).join(" or ");
        var reqBom = {
            path: "/mdo/BOM_COMPONENT",
            query: {
                $apply: "filter(PLANT eq '" + plant + "' and IS_DELETED eq false and (" + bomFilter + "))/aggregate(QUANTITY_TOTAL with sum as TOTAL_COMPONENT_QTY)"
            },
            method: "GET"
        };
        var resBom = await dispatch(reqBom);
        var bomRows = (resBom && resBom.data && resBom.data.value) || [];
        return (bomRows.length > 0 && bomRows[0].TOTAL_COMPONENT_QTY) ? parseFloat(bomRows[0].TOTAL_COMPONENT_QTY) : 0;
    } catch (e) {
        console.log("Error fetching total component qty from MDO: " + e.message);
        return 0;
    }
}

/**
 * Calcola la data di ricezione in base al cover_element
 */
function _getReceiptDate(row) {
    var cover = (row.cover_element || "").toUpperCase();
    var dateStr = null;
    if (cover === "PURCHASE REQUISITION" || cover === "PURCHASE ORDER") {
        dateStr = row.receipt_expected_date || row.first_conf_date || row.mrp_date;
    } else if (cover === "PROD" || cover === "PLANNED ORDER") {
        dateStr = row.date_from_workshop || row.mrp_date;
    } else {
        dateStr = row.receipt_expected_date || row.first_conf_date || row.mrp_date || row.date_from_workshop;
    }
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * 2.4 Evasi Details - Verifica campo custom UNLOAD_POINT su tutti gli ordini
 * Include solo ordini con UNLOAD_POINT presente
 */
function getEvasiDetails(orderClassification) {
    var columns = [
        { key: "order",           label: "Order",           width: "200px" },
        { key: "unloadPoint",     label: "Unload Point",    width: "200px" },
        { key: "plannedStartDate",label: "Planned Start",   width: "150px" },
        { key: "stato",           label: "Stato",           width: "150px" }
    ];

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var data = orderClassification.all
        .filter(function(item) { return item.unloadPoint != null && item.unloadPoint !== ""; })
        .map(function(item) {
            var val = (item.unloadPoint || "").toUpperCase();
            var stato = "Non evaso";
            if (val === "EVASO") {
                stato = "Evaso";
            } else {
                // UNLOAD_POINT valorizzato ma diverso da EVASO
                if (item.plannedStartDate) {
                    var psd = new Date(item.plannedStartDate);
                    psd.setHours(0, 0, 0, 0);
                    if (psd < today) {
                        stato = "Non evaso scaduto";
                    } else {
                        stato = "Non evaso";
                    }
                } else {
                    stato = "Non evaso";
                }
            }

            var formattedDate = "";
            if (item.plannedStartDate) {
                var d = new Date(item.plannedStartDate);
                var dd = String(d.getDate()).padStart(2, '0');
                var mm = String(d.getMonth() + 1).padStart(2, '0');
                var yyyy = d.getFullYear();
                formattedDate = dd + "/" + mm + "/" + yyyy;
            }

            return {
                order: item.order,
                unloadPoint: item.unloadPoint,
                plannedStartDate: formattedDate,
                stato: stato
            };
        });
    return { columns: columns, data: data };
}

/**
 * 2.5.2 Modifiche Engineering Details - TreeTable Modifiche (dedicata)
 * Recupera dati reali da getModificheTestingData, filtra per material
 */
async function getModificheDetails(plant, project, wbe, sfc, section, material) {
    var treeData = await getModificheTestingData(plant, project);
    if (!treeData || treeData === false) treeData = [];

    // Colonne parent (livello 1)
    var parentColumns = [
        { key: "type",                 label: "Type",         width: "70px"  },
        { key: "prog_eco",             label: "Prog. Number", width: "140px" },
        { key: "process_id",           label: "Process Id",   width: "100px" },
        { key: "wbe_element",          label: "WBS Element",  width: "120px" },
        { key: "material",             label: "Material",     width: "110px" },
        { key: "material_description", label: "Description",  width: "200px" }
    ];

    // Colonne child (livello 2)
    var childColumns = [
        { key: "child_material",    label: "Child Material",  width: "120px" },
        { key: "quantity",          label: "Qty",             width: "60px"  },
        { key: "flux_type",         label: "Flux",            width: "90px"  },
        { key: "resolution",        label: "Resolution",      width: "100px" },
        { key: "status",            label: "Status",          width: "80px"  },
        { key: "statusDescription", label: "Status Desc.",    width: "120px" },
        { key: "owner",             label: "Owner",           width: "130px" },
        { key: "due_date",          label: "Due Date",        width: "100px" },
        { key: "sfc",               label: "SFC",             width: "120px" },
        { key: "order",             label: "Order",           width: "100px" },
        { key: "note",              label: "Note",            width: "150px" }
    ];

    return { parentColumns: parentColumns, childColumns: childColumns, data: treeData, isTree: true };
}

/**
 * 2.6 Varianze Details - Dati reali da z_op_confirmations + z_variance_type
 */
async function getVarianzeDetails(plant, order) {
    var data = [];
    try {
        var allOrders = await ordersChildrenRecursion(plant, order);
        var rows = await postgresdbService.executeQuery(queryDashKPI.getTipologiaVarianzeQuery, [plant, allOrders]);
        if (rows && rows.length > 0) data = rows;
    } catch (e) {
        console.error("Errore getVarianzeDetails:", e);
    }

    // Calcolo totale ore per percentuali
    var totalOre = 0;
    data.forEach(function(row) { totalOre += parseFloat(row.variance_labor) || 0; });

    // Details Tipologia: reason_for_variance, description, variance_labor, percentuale
    var tipologiaColumns = [
        { key: "reason_for_variance", label: "Varianza",      width: "120px" },
        { key: "description",         label: "Descrizione",   width: "250px" },
        { key: "variance_labor",      label: "Ore Varianza",  width: "120px" },
        { key: "percentuale",         label: "Percentuale",   width: "120px" }
    ];
    var tipologiaData = data.map(function(row) {
        var ore = parseFloat(row.variance_labor) || 0;
        var pct = totalOre > 0 ? (ore / totalOre * 100).toFixed(1) : "0";
        return {
            reason_for_variance: row.reason_for_variance || "",
            description: row.description || "",
            variance_labor: ore,
            percentuale: pct + "%"
        };
    });

    // Details Responsabilità: attribution, ore sommate, percentuale
    var attrGroups = {};
    data.forEach(function(row) {
        var attr = row.attribution || "Non attribuita";
        var ore = parseFloat(row.variance_labor) || 0;
        attrGroups[attr] = (attrGroups[attr] || 0) + ore;
    });
    var responsabilitaColumns = [
        { key: "attribution",    label: "Responsabilità", width: "250px" },
        { key: "variance_labor", label: "Ore Varianza",   width: "120px" },
        { key: "percentuale",    label: "Percentuale",    width: "120px" }
    ];
    var responsabilitaData = Object.keys(attrGroups).map(function(key) {
        var ore = attrGroups[key];
        var pct = totalOre > 0 ? (ore / totalOre * 100).toFixed(1) : "0";
        return { attribution: key, variance_labor: ore, percentuale: pct + "%" };
    }).sort(function(a, b) { return b.variance_labor - a.variance_labor; });

    return {
        data: data,
        detailsTipologia: { columns: tipologiaColumns, data: tipologiaData },
        detailsResponsabilita: { columns: responsabilitaColumns, data: responsabilitaData }
    };
}

async function getActualDate(plant, wbe, machSection) {
    const data = await postgresdbService.executeQuery(queryDashKPI.getActualDate, [plant, wbe, machSection]);
    if (data && data.length > 0 && data[0].actual_date) {
        var d = new Date(data[0].actual_date);
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yyyy = d.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
    }
    return "";
}

async function _getNcPresenza(plant, orderClassification) {
    var allOrders = orderClassification.all.map(function(item) { return item.order; });
    try {
        var rows = await postgresdbService.executeQuery(queryDashKPI.getNcPresenzaQuery, [plant, allOrders]);
        var ncOpen = 0, ncClosed = 0, ncBloccanti = 0;
        if (rows && rows.length > 0) {
            ncOpen = parseInt(rows[0].nc_open) || 0;
            ncClosed = parseInt(rows[0].nc_closed) || 0;
            ncBloccanti = parseInt(rows[0].nc_bloccanti) || 0;
        }

        // Calcola % ordini con NC
        var ordiniConNC = "0%";
        if (allOrders.length > 0) {
            var ncRows = await postgresdbService.executeQuery(queryDashKPI.getOrdersConNcQuery, [plant, allOrders]);
            var ordersWithDefect = (ncRows || []).length;
            ordiniConNC = Math.round(ordersWithDefect / allOrders.length * 100) + "%";
        }

        return { ncOpen: ncOpen, ncClosed: ncClosed, ncBloccanti: ncBloccanti, ordiniConNC: ordiniConNC };
    } catch (e) {
        console.error("Errore getNcPresenza:", e);
    }
    return { ncOpen: 0, ncClosed: 0, ncBloccanti: 0, ordiniConNC: "0%" };
}

module.exports = { 
    getDashboardKPI, 
    getDataFilterDashboardKPI,
    getActualDate,
    getMachineProgressDetails,
    getSFCProgressDetails,
    getScostamentoDetails,
    getMancantiDetails,
    getEvasiDetails,
    getModificheDetails,
    getVarianzeDetails
}

// ========== FUNZIONI DI CALCOLO CHART DA DATI TABELLE ==========

/**
 * Calcola % Gruppi (Completati / Iniziati / Da iniziare) dal detail SFC per livello
 */
function _calcGruppiLevelChart(aData) {
    var total = aData.length;
    if (total === 0) return [
        { label: "Completati", value: 0 },
        { label: "Iniziati", value: 0 },
        { label: "Da iniziare", value: 0 }
    ];
    var completati = 0, iniziati = 0, daIniziare = 0;
    aData.forEach(function(row) {
        var pct = row.percentualeCompletamentoOps || "0,00%";
        if (pct === "100,00%") completati++;
        else if (pct === "0,00%") daIniziare++;
        else iniziati++;
    });
    return [
        { label: "Completati",  value: Math.round(completati / total * 100) },
        { label: "Iniziati",    value: Math.round(iniziati / total * 100) },
        { label: "Da iniziare", value: Math.round(daIniziare / total * 100) }
    ];
}

/**
 * Calcola Machine Progress chart ponderato su DURATION.
 * Per ogni ordine somma le DURATION degli step completati / in lavorazione / da iniziare.
 */
function _calcMachineProgressChart(aData) {
    var durCompletati = 0, durIniziati = 0, durDaIniziare = 0;
    aData.forEach(function(row) {
        (row.children || []).forEach(function(step) {
            var dur = typeof step.duration === "number" ? step.duration : (parseFloat(String(step.duration || "").replace(/\./g, "")) || 0) / 1000;
            if (step.status === "Done") durCompletati += dur;
            else if (step.status === "In Work") durIniziati += dur;
            else durDaIniziare += dur;
        });
    });
    return [
        { label: "Completati",  value: durCompletati },
        { label: "Iniziati",    value: durIniziati },
        { label: "Da iniziare", value: durDaIniziare }
    ];
}

/**
 * Calcola Scostamento chart (Pianificato, Marcato, Varianza) dai dati TreeTable filtrati per workcenter
 * Somma i valori dalle operazioni (children) di tutti gli ordini
 */
function _calcScostamentoChart(aData) {
    var pianificato = 0, marcato = 0, varianza = 0;
    aData.forEach(function(row) {
        (row.children || []).forEach(function(child) {
            pianificato += (typeof child.duration === "number" ? child.duration : 0);
            marcato += (typeof child.oreMarcate === "number" ? child.oreMarcate : 0);
            varianza += (typeof child.oreVarianza === "number" ? child.oreVarianza : 0);
        });
    });
    return [
        { label: "Ore pianificate", value: pianificato },
        { label: "Ore marcate",     value: marcato },
        { label: "Ore varianza",    value: varianza }
    ];
}

/**
 * Calcola summary mancanti: percentuale = totalMissing / totalComponentQty * 100, totale = "totalMissing / totalComponentQty"
 */
function _calcMancantiSummary(mancantiDetails) {
    var totalMissing = mancantiDetails.totalMissing || 0;
    var totalComponentQty = mancantiDetails.totalComponentQty || 0;
    var pct = totalComponentQty > 0 ? (totalMissing / totalComponentQty * 100).toFixed(1).replace(".", ",") : "0";
    return { percentuale: pct + "%", totale: totalMissing + "/" + totalComponentQty };
}

/**
 * Calcola Mancanti chart (con mancanti / scaduti / no mancanti) per ordine gruppo
 * Classifica ogni ordine gruppo in base alla presenza in orderMap e alla data di ricezione
 */
function _calcMancantiChart(mancantiDetails) {
    var conMancanti = 0, mancantiScaduti = 0, noMancanti = 0;
    var orderMap = mancantiDetails.orderMap || {};
    var gruppiCount = mancantiDetails.gruppiCount || 0;
    var data = mancantiDetails.data || [];

    // Conta ordini distinti con almeno un record
    var ordersWithMancanti = {};
    var ordersScaduti = {};
    data.forEach(function(row) {
        ordersWithMancanti[row.order] = true;
        if (row.stato === "Mancanti scaduti") {
            ordersScaduti[row.order] = true;
        }
    });

    var countWithMancanti = Object.keys(ordersWithMancanti).length;
    // Un ordine è "scaduto" se almeno un suo record è scaduto
    var countScaduti = Object.keys(ordersScaduti).length;
    var countConMancanti = countWithMancanti - countScaduti;
    var countNoMancanti = gruppiCount - countWithMancanti;

    return [
        { label: "Con mancanti",     value: countConMancanti },
        { label: "Mancanti scaduti", value: countScaduti },
        { label: "No mancanti",      value: countNoMancanti }
    ];
}

/**
 * Calcola Evasi chart (Evaso / Non Evaso) dal campo UNLOAD_POINT
 */
function _calcEvasiChart(aData) {
    var evasi = 0, nonEvasi = 0, nonEvasiScaduti = 0;
    aData.forEach(function(row) {
        var stato = row.stato || "";
        if (stato === "Evaso") evasi++;
        else if (stato === "Non evaso scaduto") nonEvasiScaduti++;
        else nonEvasi++;
    });
    return [
        { label: "Evaso",              value: evasi },
        { label: "Non evaso",           value: nonEvasi },
        { label: "Non evaso scaduto",   value: nonEvasiScaduti }
    ];
}

/**
 * Conta totale modifiche Open (status != '2') e Closed (status == '2')
 */
function _calcModificheTotals(aData) {
    var open = 0, closed = 0;
    aData.forEach(function(parent) {
        if (!parent.children) return;
        parent.children.forEach(function(child) {
            var status = String(child.status != null ? child.status : "");
            if (status === "2") { closed++; } else { open++; }
        });
    });
    return { open: open, closed: closed };
}

/**
 * Calcola Modifiche chart (raggruppate per MT/MK/MA dal type, filtrate per status)
 * Open: status != '2'
 * Closed: status = '2'
 */
function _calcModificheChart(aData, sStatusFilter) {
    var groups = { "MT": 0, "MK": 0, "MA": 0 };
    // aData è un array tree: ogni elemento ha .type e .children[]
    aData.forEach(function(parent) {
        var rawType = (parent.type || "").toUpperCase();
        var type = "Other";
        if (rawType.indexOf("MT") !== -1) { type = "MT"; }
        else if (rawType.indexOf("MK") !== -1) { type = "MK"; }
        else if (rawType.indexOf("MA") !== -1) { type = "MA"; }
        if (!parent.children) return;
        parent.children.forEach(function(child) {
            var status = String(child.status != null ? child.status : "");
            var match = false;
            if (sStatusFilter === "Open") {
                match = status !== "2";
            } else {
                match = status === "2";
            }
            if (match) {
                groups[type] = (groups[type] || 0) + 1;
            }
        });
    });
    return ["MT", "MK", "MA"].map(function(key) {
        return { label: key, value: groups[key] || 0 };
    });
}

/**
 * Calcola Tipologia Varianze chart (raggruppato per reason_for_variance, somma ore varianza)
 */
function _calcTipologiaVarianzeChart(aData) {
    return aData.map(function(row) {
        return { label: row.reason_for_variance || "NA", value: parseFloat(row.variance_labor) || 0 };
    }).sort(function(a, b) { return b.value - a.value; });
}

/**
 * Calcola Responsabilità Varianze chart (raggruppato per attribution, somma ore varianza)
 */
function _calcResponsabilitaVarianzeChart(aData) {
    var groups = {};
    aData.forEach(function(row) {
        var key = row.attribution || "Non attribuita";
        groups[key] = (groups[key] || 0) + (parseFloat(row.variance_labor) || 0);
    });
    return Object.keys(groups).map(function(key) {
        return { label: key, value: groups[key] };
    }).sort(function(a, b) { return b.value - a.value; });
}