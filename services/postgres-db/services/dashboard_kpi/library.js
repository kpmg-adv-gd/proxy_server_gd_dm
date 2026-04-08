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
    var scostamentoAll = getScostamentoDetails(plant, project, wbe, sfc); // tutti i dati
    var mancantiDetails  = getMancantiDetails(plant, project, wbe, sfc, section);
    var evasiDetails     = getEvasiDetails(orderClassification);
    var modificheDetails = await getModificheDetails(plant, project, wbe, sfc, section, material);
    var varianzeDetails  = await getVarianzeDetails(plant, order);
    var ncPresenzaData   = await _getNcPresenza(plant, orderClassification);

    // 2. Filtra scostamento per workcenter
    var scostamentoGD = {
        columns: scostamentoAll.columns,
        data: scostamentoAll.data.filter(function(r) { return r.workCenter === "GD"; })
    };
    var scostamentoFornitori = {
        columns: scostamentoAll.columns,
        data: scostamentoAll.data.filter(function(r) { return r.workCenter !== "GD"; })
    };

    // 3. Calcola valori chart dai dati delle tabelle
    var result = {};

    result.gruppiLevels = {
        gruppi: _calcGruppiLevelChart(sfcGruppi.data),
        aggr:   _calcGruppiLevelChart(sfcAggr.data),
        macr:   _calcGruppiLevelChart(sfcMacr.data)
    };

    result.mancanti = _calcMancantiSummary(mancantiDetails.data);

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
        mancanti: _calcMancantiChart(mancantiDetails.data),
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
        mancanti:            mancantiDetails,
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
            markingLookup[key] = (markingLookup[key] || 0) + (parseFloat(row.marked_labor) || 0);
        });
    } catch (e) {
        console.log("Error fetching marking recap for dashboard: " + e.message);
    }

    // Mappe per calcolo cumulativo ore effettive e marcate
    var ownOreEffettiveMap = {};
    var ownOreMarcateMap = {};

    var data = orderClassification.all.map(function(item) {
        var type = "Gruppo";
        if (item.orderType === "MACH") type = "Macchina";
        else if (item.orderType === "MACR") type = "Macroaggregato";
        else if (item.orderType === "AGGR") type = "Aggregato";

        var ownOreEffettive = 0;
        var ownOreMarcate = 0;

        var children = (item.routingSteps || []).map(function(step) {
            var dur = (parseFloat(String(step.duration || "").replace(/\./g, "")) || 0) / 1000;
            var oreEffettive = 0;
            var oreMarcate = "";

            if (step.workCenter && step.workCenter.startsWith("F_")) {
                // Workcenter F_: ore effettive in base a status, ore marcate sempre vuota
                if (step.status === "Done") {
                    oreEffettive = dur;
                } else {
                    oreEffettive = 0;
                }
                oreMarcate = "";
            } else {
                // Altri workcenter: leggi da z_marking_recap
                var key = item.order + "_" + step.operation;
                var markedLabor = markingLookup[key] || 0;
                oreEffettive = markedLabor;
                oreMarcate = markedLabor;
            }

            ownOreEffettive += (typeof oreEffettive === "number" ? oreEffettive : 0);
            ownOreMarcate += (typeof oreMarcate === "number" ? oreMarcate : 0);

            return {
                operation: step.operation,
                description: step.description,
                workCenter: step.workCenter,
                status: step.status,
                duration: dur,
                oreEffettive: oreEffettive,
                oreMarcate: oreMarcate
            };
        });

        ownOreEffettiveMap[item.order] = ownOreEffettive;
        ownOreMarcateMap[item.order] = ownOreMarcate;

        return {
            type: type,
            order: item.order,
            sfc: item.sfc,
            percentualeCompletamento: "0,00%",
            duration: cumulativeDurations[item.order] || 0,
            oreEffettive: 0,
            oreMarcate: 0,
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

    // Imposta valori cumulativi e ricalcola % completamento
    data.forEach(function(row) {
        var cumOreEff = getCumulativeOreEffettive(row.order);
        var cumOreMarcate = getCumulativeOreMarcate(row.order);
        var cumDuration = cumulativeDurations[row.order] || 0;

        row.oreEffettive = cumOreEff;
        row.oreMarcate = cumOreMarcate;

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
        { key: "aggregato",       label: "Aggregato",       width: "180px" },
        { key: "macroaggregato",  label: "Macroaggregato",  width: "180px" },
        { key: "macchina",        label: "Macchina",        width: "180px" },
        { key: "totalOps",      label: "Tot. Operazioni", width: "120px" },
        { key: "completedOps",  label: "Op. Completate",  width: "120px" },
        { key: "percentualeCompletamentoOps", label: "% completamento", width: "120px" }
    ];

    var opsColumns = [
        { key: "order",       label: "Order",       width: "180px" },
        { key: "macchina",        label: "Macchina",        width: "180px" },
        { key: "macroaggregato",  label: "Macroaggregato",  width: "180px" },
        { key: "aggregato",       label: "Aggregato",       width: "180px" },
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
 * 2.2.3 Scostamento Details - Tabella scostamenti (netto varianza)
 * Colonne: Type, SFC, Work Center, Status, % completamento, Ore pianificate, Ore effettive montaggio, Ore varianza, Time spent, Scostamento, Alert
 */
function getScostamentoDetails(plant, project, wbe, sfc, workcenter) {
    // TODO: Implementare query reale
    var columns = [
        { key: "type",                     label: "Type",               width: "160px" },
        { key: "sfc",                      label: "SFC",                width: "200px" },
        { key: "workCenter",               label: "Work Center",        width: "100px" },
        { key: "status",                   label: "Status",             width: "100px" },
        { key: "percentualeCompletamento", label: "% completamento",    width: "110px" },
        { key: "orePianificate",           label: "Ore pianificate",    width: "110px" },
        { key: "oreEffettiveMontaggio",    label: "Ore eff. montaggio", width: "120px" },
        { key: "oreVarianza",              label: "Ore varianza",       width: "100px" },
        { key: "timeSpent",               label: "Time spent",          width: "90px"  },
        { key: "scostamento",              label: "Scostamento",        width: "100px" },
        { key: "alert",                    label: "Alert",              width: "60px"  }
    ];
    var allData = [
        { type: "MACCHINA",             sfc: "C005.25001.MKM01_121 MK_223",  workCenter: "GD",      status: "Start",       percentualeCompletamento: "38,98%",  orePianificate: 59,  oreEffettiveMontaggio: 23, oreVarianza: 16, timeSpent: 39, scostamento: 36, alert: "" },
        { type: "Lavorazione macchina", sfc: "",                              workCenter: "F_14441", status: "Start",       percentualeCompletamento: "0,00%",   orePianificate: 7,   oreEffettiveMontaggio: 0,  oreVarianza: 2,  timeSpent: 2,  scostamento: 7,  alert: "" },
        { type: "Aggregato 1",         sfc: "C005.25001.MKM01_MK_COMPL...",  workCenter: "GD",      status: "Start",       percentualeCompletamento: "33,33%",  orePianificate: 3,   oreEffettiveMontaggio: 1,  oreVarianza: 0,  timeSpent: 1,  scostamento: 2,  alert: "" },
        { type: "Lavorazione aggregato",sfc: "",                              workCenter: "GD",      status: "Start",       percentualeCompletamento: "33,33%",  orePianificate: 3,   oreEffettiveMontaggio: 1,  oreVarianza: 0,  timeSpent: 1,  scostamento: 2,  alert: "" },
        { type: "Aggregato 2",         sfc: "C005.25001.MKM01_MK_ELE...",    workCenter: "GD",      status: "Start",       percentualeCompletamento: "44,90%",  orePianificate: 49,  oreEffettiveMontaggio: 22, oreVarianza: 14, timeSpent: 36, scostamento: 27, alert: "" },
        { type: "Lavorazione aggregato",sfc: "",                              workCenter: "GD",      status: "Complete",    percentualeCompletamento: "100,00%", orePianificate: 5,   oreEffettiveMontaggio: 5,  oreVarianza: 1,  timeSpent: 6,  scostamento: 0,  alert: "" },
        { type: "Gruppo 1",            sfc: "C005.25001.MKM01_28MK_AGG...",  workCenter: "GD",      status: "Start",       percentualeCompletamento: "54,84%",  orePianificate: 31,  oreEffettiveMontaggio: 17, oreVarianza: 10, timeSpent: 27, scostamento: 14, alert: "" },
        { type: "Lavorazione 1",       sfc: "",                              workCenter: "GD",      status: "Not started", percentualeCompletamento: "0,00%",   orePianificate: 2,   oreEffettiveMontaggio: 0,  oreVarianza: 0,  timeSpent: 0,  scostamento: 2,  alert: "" },
        { type: "Lavorazione 2",       sfc: "",                              workCenter: "GD",      status: "Complete",    percentualeCompletamento: "100,00%", orePianificate: 4,   oreEffettiveMontaggio: 4,  oreVarianza: 2,  timeSpent: 6,  scostamento: 0,  alert: "" },
        { type: "Lavorazione 3",       sfc: "",                              workCenter: "GD",      status: "Start",       percentualeCompletamento: "60,00%",  orePianificate: 5,   oreEffettiveMontaggio: 3,  oreVarianza: 1,  timeSpent: 4,  scostamento: 2,  alert: "" },
        { type: "Lavorazione 4",       sfc: "",                              workCenter: "F_16013", status: "Start",       percentualeCompletamento: "33,33%",  orePianificate: 3,   oreEffettiveMontaggio: 4,  oreVarianza: 3,  timeSpent: 7,  scostamento: -1, alert: "!!" },
        { type: "Lavorazione 5",       sfc: "",                              workCenter: "F_16014", status: "Start",       percentualeCompletamento: "0,00%",   orePianificate: 1,   oreEffettiveMontaggio: 0,  oreVarianza: 1,  timeSpent: 1,  scostamento: 1,  alert: "" },
        { type: "Lavorazione 6",       sfc: "",                              workCenter: "F_16015", status: "Complete",    percentualeCompletamento: "100,00%", orePianificate: 7,   oreEffettiveMontaggio: 7,  oreVarianza: 3,  timeSpent: 10, scostamento: 0,  alert: "" },
        { type: "Lavorazione 7",       sfc: "",                              workCenter: "F_16016", status: "Start",       percentualeCompletamento: "50,00%",  orePianificate: 4,   oreEffettiveMontaggio: 4,  oreVarianza: 0,  timeSpent: 4,  scostamento: 0,  alert: "!!" },
        { type: "Lavorazione 8",       sfc: "",                              workCenter: "F_16017", status: "Not started", percentualeCompletamento: "0,00%",   orePianificate: 5,   oreEffettiveMontaggio: 0,  oreVarianza: 0,  timeSpent: 0,  scostamento: 5,  alert: "" }
    ];
    // Filtra per workcenter: GD = solo work center "GD", Fornitori = tutti i non-GD (F_xxxxx)
    var data = allData;
    if (workcenter === "GD") {
        data = allData.filter(function(item) { return item.workCenter === "GD"; });
    } else if (workcenter === "Fornitori") {
        data = allData.filter(function(item) { return item.workCenter !== "GD"; });
    }
    return { columns: columns, data: data };
}

/**
 * 2.3 Mancanti Details - Report Mancanti
 * Apertura report Mancanti esistente, prefiltrato con Project/WBS/Section/SFC
 */
function getMancantiDetails(plant, project, wbe, sfc, section) {
    // TODO: Implementare query reale - si integrerà con il report Mancanti esistente
    var columns = [
        { key: "sfc",               label: "SFC",           width: "120px" },
        { key: "componente",        label: "Componente",    width: "120px" },
        { key: "materiale",         label: "Materiale",     width: "120px" },
        { key: "descrizione",       label: "Descrizione",   width: "220px" },
        { key: "quantitaRichiesta", label: "Qty Richiesta", width: "100px" },
        { key: "quantitaEvasa",     label: "Qty Evasa",     width: "100px" },
        { key: "quantitaMancante",  label: "Qty Mancante",  width: "110px" },
        { key: "bsd",               label: "BSD",           width: "100px" },
        { key: "scaduto",           label: "Scaduto",       width: "80px"  }
    ];
    var data = [
        { sfc: "SFC-10001", componente: "COMP-001", materiale: "MAT-A100", descrizione: "Supporto flangia DN200",  quantitaRichiesta: 4,  quantitaEvasa: 2,  quantitaMancante: 2, bsd: "01/03/2026", scaduto: "SI" },
        { sfc: "SFC-10001", componente: "COMP-002", materiale: "MAT-A200", descrizione: "Modulo BKP standard",     quantitaRichiesta: 10, quantitaEvasa: 10, quantitaMancante: 0, bsd: "05/03/2026", scaduto: "NO" },
        { sfc: "SFC-10001", componente: "COMP-003", materiale: "MAT-B101", descrizione: "Connettore elettrico M12", quantitaRichiesta: 8,  quantitaEvasa: 3,  quantitaMancante: 5, bsd: "10/03/2026", scaduto: "SI" },
        { sfc: "SFC-10001", componente: "COMP-004", materiale: "MAT-B202", descrizione: "Cavo segnale 5m",         quantitaRichiesta: 12, quantitaEvasa: 12, quantitaMancante: 0, bsd: "15/03/2026", scaduto: "NO" },
        { sfc: "SFC-10001", componente: "COMP-005", materiale: "MAT-C301", descrizione: "Piastra montaggio 400x300", quantitaRichiesta: 2, quantitaEvasa: 0,  quantitaMancante: 2, bsd: "20/03/2026", scaduto: "SI" },
        { sfc: "SFC-10001", componente: "COMP-006", materiale: "MAT-C402", descrizione: "Guarnizione OR 50mm",     quantitaRichiesta: 20, quantitaEvasa: 15, quantitaMancante: 5, bsd: "25/03/2026", scaduto: "NO" }
    ];
    return { columns: columns, data: data };
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
            var dur = (parseFloat(String(step.duration || "").replace(/\./g, "")) || 0) / 1000;
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
 * Calcola Scostamento chart (Pianificato vs Marcato) dalle lavorazioni filtrate per workcenter
 */
function _calcScostamentoChart(aData) {
    var pianificato = 0, marcato = 0;
    aData.forEach(function(row) {
        if (!row.type.startsWith("Lavorazione")) return;
        pianificato += row.orePianificate || 0;
        marcato += row.oreEffettiveMontaggio || 0;
    });
    return [
        { label: "Pianificato", value: pianificato },
        { label: "Marcato",     value: marcato }
    ];
}

/**
 * Calcola summary mancanti (percentuale e totale) dai dati tabella
 */
function _calcMancantiSummary(aData) {
    var totalRichiesta = 0, totalMancante = 0;
    aData.forEach(function(row) {
        totalRichiesta += row.quantitaRichiesta || 0;
        totalMancante  += row.quantitaMancante || 0;
    });
    var pct = totalRichiesta > 0 ? (totalMancante / totalRichiesta * 100).toFixed(1).replace(".", ",") : "0";
    return { percentuale: pct + "%", totale: totalMancante + "/" + totalRichiesta };
}

/**
 * Calcola Mancanti chart (con mancanti / scaduti / no mancanti) dai dati tabella
 */
function _calcMancantiChart(aData) {
    var conMancanti = 0, mancantiScaduti = 0, noMancanti = 0;
    aData.forEach(function(row) {
        if ((row.quantitaMancante || 0) === 0) noMancanti++;
        else if (row.scaduto === "SI") mancantiScaduti++;
        else conMancanti++;
    });
    return [
        { label: "Con mancanti",     value: conMancanti },
        { label: "Mancanti scaduti", value: mancantiScaduti },
        { label: "No mancanti",      value: noMancanti }
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