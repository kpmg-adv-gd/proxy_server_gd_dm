const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { ordersChildrenRecursion } = require("../../postgres-db/services/verbali/library");
const { getTotalQuantityFromOrders } = require("../../postgres-db/services/mancanti/library");
const { getModificheToDataCollections } = require("../../postgres-db/services/modifiche/library");
const { getSumMarkedLaborByOrder, getSumVarianceLaborByOrder } = require("../../postgres-db/services/marking/library");
const { ref } = require("pdfkit");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function autoCompileFieldsDataCollectionDispatcher(plant, data, parametriAuto, selected, refresh) {
    var filter = `(DATA_FIELD_VALUE eq '${selected.project_parent}' and DATA_FIELD eq 'COMMESSA')`;
    var mockReq = {
        path: "/mdo/ORDER_CUSTOM_DATA",
        query: { $apply: `filter(${filter})` },
        method: "GET"
    };
    var outMock = await dispatch(mockReq);
    var dcData = (outMock?.data?.value && outMock.data.value.length > 0) ? outMock.data.value : [];

    for (var i = 0; i < parametriAuto.length; i++) {
        var numParametro = parametriAuto[i].parametro;
        var group = parametriAuto[i].group;
        var parameterName = parametriAuto[i].parameterName;
        // switch sulla funzione da chiamare
        switch (numParametro) {
            case "0":
                data = await ruleParameter0(data, group, parameterName, dcData, refresh);
                break;
            case "1":
                data = await ruleParameter1(data, group, parameterName, selected, refresh);
                break;
            case "2":
                data = await ruleParameter2(data, group, parameterName, dcData, refresh);
                break;
            case "3":
                data = await ruleParameter3(data, group, parameterName, selected, refresh);
                break;
            case "4":
                data = await ruleParameter4(data, group, parameterName, selected, plant, refresh);
                break;
            case "5":
                data = await ruleParameter5(data, group, parameterName, selected, plant, refresh);
                break;
            case "6":
                data = await ruleParameter6(data, group, parameterName, selected, plant, refresh);
                break;
            case "7":
                data = await ruleParameter7(data, group, parameterName, selected, plant, refresh);
                break;
            case "8":
                data = await ruleParameter8(data, group, parameterName, selected, plant, refresh);
                break;
            case "9":
                data = await ruleParameter9(data, group, parameterName, selected, plant, refresh);
                break;
            default:
                // Nessuna azione
                break;
        }
    }
    return data;
}

async function autoCompileFieldsDataCollectionTestingdDispatcher(plant, data, parametriAuto, selected, refresh) {
    for (var i = 0; i < parametriAuto.length; i++) {
        var numParametro = parametriAuto[i].parametro;
        var group = parametriAuto[i].group;
        var parameterName = parametriAuto[i].parameterName;
        // switch sulla funzione da chiamare
        switch (numParametro) {
            case "0":
                data = await ruleParameter0Testing(data, group, parameterName, selected, refresh);
                break;
            case "1":
                data = await ruleParameter1Testing(data, group, parameterName, selected, refresh);
                break;
            case "2":
                data = await ruleParameter2Testing(data, group, parameterName, selected, refresh);
                break;
            case "3":
                data = await ruleParameter3Testing(data, group, parameterName, selected, plant, refresh);
                break;
            case "4":
                data = await ruleParameter4Testing(data, group, parameterName, selected, plant, refresh);
                break;
            case "5":
                data = await ruleParameter5Testing(data, group, parameterName, selected, plant, refresh);
                break;
            default:
                // Nessuna azione
                break;
        }
    }
    return data;
}


async function ruleParameter0(data, group, parameterName, dcData, refresh) {
    if (dcData.length > 0) {
        var ordersList = dcData.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        var filter2 = `((${ordersList}) and DATA_FIELD eq 'CO_PREV')`;
        var mockReq2 = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter2})` },
            method: "GET"
        };
        var outMock2 = await dispatch(mockReq2);
        var dcData2 = (outMock2?.data?.value && outMock2.data.value.length > 0) ? outMock2.data.value : [];
        if (dcData2.length > 0) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].group === group) {
                    for (var j = 0; j < data[i].parameters.length; j++) {
                        if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                            data[i].parameters[j].valueText = dcData2[0].DATA_FIELD_VALUE;
                        }
                    }
                }
            }
        }
    }
    return data;
}
async function ruleParameter1(data, group, parameterName, selected, refresh) {
    var project = selected.project_parent;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                    data[i].parameters[j].valueText = project;
                }
            }
        }
    }
    return data;
}
async function ruleParameter2(data, group, parameterName, dcData, refresh) {
    if (dcData.length > 0) {
        var ordersList = dcData.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        var filter2 = `((${ordersList}) and DATA_FIELD eq 'CUSTOMER')`;
        var mockReq2 = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter2})` },
            method: "GET"
        };
        var outMock2 = await dispatch(mockReq2);
        var dcData2 = (outMock2?.data?.value && outMock2.data.value.length > 0) ? outMock2.data.value : [];
        if (dcData2.length > 0) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].group === group) {
                    for (var j = 0; j < data[i].parameters.length; j++) {
                        if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                            data[i].parameters[j].valueText = dcData2[0].DATA_FIELD_VALUE;
                        }
                    }
                }
            }
        }
    }
    return data;
}
async function ruleParameter3(data, group, parameterName, selected, refresh) {
    var material = selected.material;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                    data[i].parameters[j].valueText = material;
                }
            }
        }
    }
    return data;
}
async function ruleParameter4(data, group, parameterName, selected, plant, refresh) {
    var ordersToCheck = await ordersChildrenRecursion(plant, selected.order);
    var quantity = await getTotalQuantityFromOrders(plant, ordersToCheck);
    quantity = quantity == null ? "0" : quantity
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueList == "" || refresh)) {
                    data[i].parameters[j].valueList = quantity > 0 ? "SI" : "NO";
                    data[i].parameters[j].comment = "Quantity: " + quantity.toString();
                }
            }
        }
    }
    return data;
}
async function ruleParameter5(data, group, parameterName, selected, plant, refresh) {
    var result = await getModificheToDataCollections(plant, selected.project_parent, selected.wbs, selected.material, "MK");
    if (result.length > 0) {
        // Creo commento concatenando prog_eco e process_id delle modifiche trovate
        var commento = "";
        for (var i = 0; i < result.length; i++) {
            commento += `Prog/Eco: ${result[i].prog_eco} - Process ID: ${result[i].process_id}\n`;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueList == "" || refresh)) {
                    data[i].parameters[j].valueList = result.length > 0 ? "NO" : "SI";
                    if (result.length > 0) data[i].parameters[j].comment = commento;
                }
            }
        }
    }
    return data;
}
async function ruleParameter6(data, group, parameterName, selected, plant, refresh) {
    var result = await getModificheToDataCollections(plant, selected.project_parent, selected.wbs, selected.material, "MT");
    if (result.length > 0) {
        // Creo commento concatenando prog_eco e material delle modifiche trovate
        var commento = "";
        for (var i = 0; i < result.length; i++) {
            commento += `Prog/Eco: ${result[i].prog_eco} - Material: ${result[i].material}\n`;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueList == "" || refresh)) {
                    data[i].parameters[j].valueList = result.length > 0 ? "NO" : "SI";
                    if (result.length > 0) data[i].parameters[j].comment = commento;
                }
            }
        }
    }
    return data;
}
async function ruleParameter7(data, group, parameterName, selected, plant, refresh) {
    var result = await getModificheToDataCollections(plant, selected.project_parent, selected.wbs, selected.material, "MA");
    if (result.length > 0) {
        // Creo commento concatenando process id e material delle modifiche trovate
        var commento = "";
        for (var i = 0; i < result.length; i++) {
            commento += `Process ID: ${result[i].process_id} - Material: ${result[i].material}\n`;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueList == "" || refresh)) {
                    data[i].parameters[j].valueList = result.length > 0 ? "NO" : "SI";
                    if (result.length > 0) data[i].parameters[j].comment = commento;
                }
            }
        }
    }
    return data;
}
async function ruleParameter8(data, group, parameterName, selected, plant, refresh) {
    var optDaConsiderare = await getIncompleteOperations(plant, selected);
    var totalTime = 0;
    for (var i = 0; i < optDaConsiderare.length; i++) {
        var url = hostname+"/routing/v1/routings/routingSteps?plant="+plant+"&routing="+optDaConsiderare[i].routing+"&type=SHOP_ORDER";
        var responseRouting = await callGet(url);
        var selectedOpt = responseRouting?.routingSteps?.filter(item => item.routingOperation.operationActivity.operationActivity == optDaConsiderare[i].operation).length > 0 
            ? responseRouting.routingSteps.filter(item => item.routingOperation.operationActivity.operationActivity == optDaConsiderare[i].operation)[0] : null;
        if (selectedOpt != null) {
            var time = selectedOpt?.routingOperation?.customValues?.filter(obj => obj.attribute == "DURATION").length > 0 ? selectedOpt.routingOperation.customValues.find(obj => obj.attribute == "DURATION").value : 0;
            totalTime += parseFloat(time);
        }
    }
    // Aggiorno il parametro
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueNumber == "" || refresh)) {
                    data[i].parameters[j].valueNumber = totalTime;
                }
            }
        }
    }
    return data;
}
async function ruleParameter9(data, group, parameterName, selected, plant, refresh) {
    var optDaConsiderare = await getIncompleteOperations(plant, selected);
    var operazioniRodaggioShared = await getZSharedMemoryData(plant,"OPERAZIONI_RODAGGIO");
    try {
        var operazioniRodaggio = operazioniRodaggioShared.length > 0 ? JSON.parse(operazioniRodaggioShared[0].value).values : [];
    } catch (error) {
        console.log("Errore nel parsing di OPERAZIONI_RODAGGIO da shared memory:", error);
        return data;
    }
    // Verifico quante operazioni di rodaggio sono presenti in optDaConsiderare
    var rigaTrovata = false;
    for (var i = 0; i < optDaConsiderare.length; i++) {
        if (operazioniRodaggio.includes(optDaConsiderare[i].operation)) {
            rigaTrovata = true;
            break;
        }
    }
    // Aggiorno il parametro
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueList == "" || refresh)) {
                    data[i].parameters[j].valueList = rigaTrovata ? "NO" : "SI";
                }
            }
        }
    }
    return data;
}


async function ruleParameter0Testing(data, group, parameterName, selected, refresh) {
    var co = selected.co;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                    data[i].parameters[j].valueText = co;
                }
            }
        }
    }
    return data;
}
async function ruleParameter1Testing(data, group, parameterName, selected, refresh) {
    var project = selected.project;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                    data[i].parameters[j].valueText = project;
                }
            }
        }
    }
    return data;
}
async function ruleParameter2Testing(data, group, parameterName, selected, refresh) {
    var customer = selected.customer;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                    data[i].parameters[j].valueText = customer;
                }
            }
        }
    }
    return data;
}
async function ruleParameter3Testing(data, group, parameterName, selected, plant, refresh) {
    // Parametro 3 -> Campo Ore Base Line
    try {
        const order = selected.order || '';
        
        // Step 1: Recupero ROUTING e ROUTING_VERSION da SAP_MDO_ORDER_V
        const filterOrder = `(MFG_ORDER eq '${order}' and PLANT eq '${plant}')`;
        const mockReqOrder = {
            path: "/mdo/ORDER",
            query: { $apply: `filter(${filterOrder})` },
            method: "GET"
        };
        const outMockOrder = await dispatch(mockReqOrder);
        const orderData = outMockOrder?.data?.value?.length > 0 ? outMockOrder.data.value[0] : null;
        
        if (!orderData || !orderData.ROUTING || !orderData.ROUTING_VERSION) {
            // Se non trovo routing, imposto valore vuoto
            for (var i = 0; i < data.length; i++) {
                if (data[i].group === group) {
                    for (var j = 0; j < data[i].parameters.length; j++) {
                        if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                            data[i].parameters[j].valueText = "0";
                        }
                    }
                }
            }
            return data;
        }
        
        const routing = orderData.ROUTING;
        const routingVersion = orderData.ROUTING_VERSION;
        
        // Step 2: Recupero lista operazioni da SAP_MDO_ROUTING_STEP_V
        const filterRoutingStep = `(ROUTING eq '${routing}' and ROUTING_VERSION eq '${routingVersion}' and ROUTING_STEP_OPERATION_ACTIVITY ne null)`;
        const mockReqRoutingStep = {
            path: "/mdo/ROUTING_STEP",
            query: { $apply: `filter(${filterRoutingStep})` },
            method: "GET"
        };
        const outMockRoutingStep = await dispatch(mockReqRoutingStep);
        const routingStepData = outMockRoutingStep?.data?.value?.length > 0 ? outMockRoutingStep.data.value : [];
        
        if (routingStepData.length === 0) {
            // Nessuna operazione trovata
            for (var i = 0; i < data.length; i++) {
                if (data[i].group === group) {
                    for (var j = 0; j < data[i].parameters.length; j++) {
                        if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                            data[i].parameters[j].valueText = "0";
                        }
                    }
                }
            }
            return data;
        }
        
        // Estraggo le operazioni distinte
        const operations = [...new Set(routingStepData.map(item => item.ROUTING_STEP_OPERATION_ACTIVITY).filter(op => op))];
        
        // Step 3: Recupero PLAN_SETUP_TIME e PLAN_PROCESSING_TIME da SAP_MDO_ORDER_SCHEDULE_V per ogni operazione
        const operationsFilter = operations.map(op => `OPERATION_ACTIVITY eq '${op}'`).join(' or ');
        const filterSchedule = `(MFG_ORDER eq '${order}' and PLANT eq '${plant}' and ROUTING eq '${routing}' and ROUTING_VERSION eq '${routingVersion}' and (${operationsFilter}))`;
        const mockReqSchedule = {
            path: "/mdo/ORDER_SCHEDULE",
            query: { $apply: `filter(${filterSchedule})` },
            method: "GET"
        };
        const outMockSchedule = await dispatch(mockReqSchedule);
        const scheduleData = outMockSchedule?.data?.value?.length > 0 ? outMockSchedule.data.value : [];
        
        // Sommo PLAN_SETUP_TIME e PLAN_PROCESSING_TIME
        let totalHours = 0;
        for (const schedule of scheduleData) {
            const setupTime = parseFloat(schedule.PLAN_SETUP_TIME || 0);
            const processingTime = parseFloat(schedule.PLAN_PROCESSING_TIME || 0);
            totalHours += setupTime + processingTime;
        }
        
        // Arrotondo a 2 decimali
        totalHours = Math.round(totalHours * 100) / 100;
        
        // Aggiorno i parametri
        for (var i = 0; i < data.length; i++) {
            if (data[i].group === group) {
                for (var j = 0; j < data[i].parameters.length; j++) {
                    if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                        data[i].parameters[j].valueText = totalHours.toString();
                    }
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error in ruleParameter3 Testing:", error);
        return data;
    }
}
async function ruleParameter4Testing(data, group, parameterName, selected, plant, refresh) {
    // Parametro 4 -> Campo Ore consuntivo (somma marked_labor da Z_MARKING_RECAP convertita da HCN a ore)
    try {
        const order = selected.order || '';
        
        // Recupero la somma di marked_labor da Z_MARKING_RECAP
        const totalMarkedLabor = await getSumMarkedLaborByOrder(plant, order);
        
        // Converto da HCN (centesimi di ora) a ore: divido per 100
        const totalHours = totalMarkedLabor / 100;
        
        // Arrotondo a 2 decimali
        const roundedHours = Math.round(totalHours * 100) / 100;
        
        for (var i = 0; i < data.length; i++) {
            if (data[i].group === group) {
                for (var j = 0; j < data[i].parameters.length; j++) {
                    if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                        data[i].parameters[j].valueText = roundedHours.toString();
                    }
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error in ruleParameter4 Testing:", error);
        return data;
    }
}
async function ruleParameter5Testing(data, group, parameterName, selected, plant, refresh) {
    // Parametro 5 -> Campo Ore varianza (somma variance_labor da Z_MARKING_RECAP convertita da HCN a ore)
    try {
        const order = selected.order || '';
        
        // Recupero la somma di variance_labor da Z_MARKING_RECAP
        const totalVarianceLabor = await getSumVarianceLaborByOrder(plant, order);
        
        // Converto da HCN (centesimi di ora) a ore: divido per 100
        const totalHours = totalVarianceLabor / 100;
        
        // Arrotondo a 2 decimali
        const roundedHours = Math.round(totalHours * 100) / 100;
        
        for (var i = 0; i < data.length; i++) {
            if (data[i].group === group) {
                for (var j = 0; j < data[i].parameters.length; j++) {
                    if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueText == "" || refresh)) {
                        data[i].parameters[j].valueText = roundedHours.toString();
                    }
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error in ruleParameter5 Testing:", error);
        return data;
    }
}

// utils
// Funzione per estrarre operazioni non concluse
async function getIncompleteOperations(plant, selected) {
    var optDaConsiderare = [];
    // Ricavo routing e routing_version
    var ordersToCheck = await ordersChildrenRecursion(plant, selected.order);
    for (var i = 0; i < ordersToCheck.length; i++) {
        var url = hostname + "/order/v1/orders?order=" + ordersToCheck[i] + "&plant=" + plant;
        var selectedOrder = await callGet(url);
        if (selectedOrder.executionStatus != 'COMPLETED' && selectedOrder.executionStatus != 'DISCARDED' && selectedOrder.executionStatus != 'HOLD') {
            var url = hostname+"/sfc/v1/sfcdetail?plant="+plant+"&sfc="+selectedOrder.sfcs[0];
            var response = await callGet(url);
            var stepNotDone = response?.steps?.filter(step => step.stepDone == false) || [];
            stepNotDone.forEach(element => {
                optDaConsiderare.push({
                    operation: element.operation.operation,
                    routing: element.stepRouting.routing,
                    routingVersion: element.stepRouting.version,
                    routingType: element.stepRouting.type
                });
            });
        }         
    }
    return optDaConsiderare;
}

// Esporta la funzione
module.exports = { autoCompileFieldsDataCollectionDispatcher, autoCompileFieldsDataCollectionTestingdDispatcher }