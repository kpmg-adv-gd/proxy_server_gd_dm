const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { ordersChildrenRecursion } = require("../../postgres-db/services/verbali/library");
const { getTotalQuantityFromOrders } = require("../../postgres-db/services/mancanti/library");
const { getModificheToDataCollections } = require("../../postgres-db/services/modifiche/library");
const { ref } = require("pdfkit");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function autoCompileFieldsDataCollectionDispatcher(plant, data, parametriAuto, selected, refresh) {
    var filter = `(DATA_FIELD_VALUE eq '${selected.parent_project}' and DATA_FIELD eq 'COMMESSA')`;
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

async function ruleParameter0(data, group, parameterName, dcData, refresh) {
    if (dcData.length > 0) {
        var filter2 = `(MFG_ORDER eq '${dcData[0].MFG_ORDER}' and DATA_FIELD eq 'CO_PREV')`;
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
                            data[i].parameters[j].valueText = dcData2[0].DATA_VALUE;
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
        var filter2 = `(MFG_ORDER eq '${dcData[0].MFG_ORDER}' and DATA_FIELD eq 'CUSTOMER')`;
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
                            data[i].parameters[j].valueText = dcData2[0].DATA_VALUE;
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
    // Sommo i tempi PLAN_SETUP_TIME e PLAN_PROCESS_TIME di ogni orderScheduleData non presente in optNotIncluded
    var totalTime = 0;
    for (var i = 0; i < optDaConsiderare.length; i++) {
        totalTime += (optDaConsiderare[i].PLAN_SETUP_TIME || 0) + (optDaConsiderare[i].PLAN_PROCESS_TIME || 0);
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
        for (var j = 0; j < operazioniRodaggio.length; j++) {
            // controllo in like (contiene pezzo di stringa)
            if (optDaConsiderare[i].OPERATION_ACTIVITY.includes(operazioniRodaggio[j])) {
                rigaTrovata = true;
                break;
            }
        }
        if (rigaTrovata) {
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

// utils
// Funzione per estrarre operazioni non concluse
async function getIncompleteOperations(plant, selected) {
    // Ricavo routing e routing_version
    var ordersToCheck = await ordersChildrenRecursion(plant, selected.order);
    const orderFilter = ordersToCheck.map(order => `MFG_ORDER eq '${order}'`).join(' or ');
    var filter = `(PLANT eq '${plant}' and (${orderFilter}) )`;
    var mockReq = {
        path: "/mdo/ORDER",
        query: { $apply: `filter(${filter})` },
        method: "GET"
    };
    var outMock = await dispatch(mockReq);
    var orderData = (outMock?.data?.value && outMock.data.value.length > 0) ? outMock.data.value : [];
    if (orderData.length == 0) return [];
    // prendo primo elemento e ci entro in mdo ROUTING_STEP
    var filter2 = `(PLANT eq '${plant}' and ROUTING eq '${orderData[0].ROUTING}' and ROUTING_VERSION eq '${orderData[0].ROUTING_VERSION}')`;
    var mockReq2 = {
        path: "/mdo/ROUTING_STEP",
        query: { $apply: `filter(${filter2})` },
        method: "GET"
    };
    var outMock2 = await dispatch(mockReq2);
    var routingStepData = (outMock2?.data?.value && outMock2.data.value.length > 0) ? outMock2.data.value : [];
    // recupero la lista di operazioni (not null) in ROUTING_STEP_OPERATION_ACTIVITY: con queste entro in mdo ORDER_SCHEDULE per estrarre PLAN_SETUP_TIME e PLAN_PROCESS_TIME (da sommare poi)
    var operationList = routingStepData.filter(rs => rs.ROUTING_STEP_OPERATION_ACTIVITY != null).map(rs => rs.OPERATION);
    if (operationList.length > 0) {
        var filter3 = `(PLANT eq '${plant}' and MFG_ORDER eq '${orderData[0].MFG_ORDER}' and ROUTING eq '${orderData[0].ROUTING}' and ROUTING_VERSION eq '${orderData[0].ROUTING_VERSION}'
            and (${operationList.map(op => `OPERATION_ACTIVITY eq '${op}'`).join(' or ')}))`;
        var mockReq3 = {
            path: "/mdo/ORDER_SCHEDULE",
            query: { $apply: `filter(${filter3})` },
            method: "GET"
        };
        var outMock3 = await dispatch(mockReq3);
        var orderScheduleData = (outMock3?.data?.value && outMock3.data.value.length > 0) ? outMock3.data.value : [];
        // Estraggo operazioni da non includere nella somma finale dalla mdo SFC_STEP_STATUS
        var filter4 = `(PLANT eq '${plant}' and MFG_ORDER eq '${orderData[0].MFG_ORDER}' and ROUTING eq '${orderData[0].ROUTING}' and ROUTING_VERSION eq '${orderData[0].ROUTING_VERSION}'
            and (${operationList.map(op => `OPERATION_ACTIVITY eq '${op}'`).join(' or ')}))`;
        var mockReq4 = {
            path: "/mdo/SFC_STEP_STATUS",
            query: { $apply: `filter(${filter4})` },
            method: "GET"
        };
        var outMock4 = await dispatch(mockReq4);
        var optNotIncluded = (outMock4?.data?.value && outMock4.data.value.length > 0) ? outMock4.data.value.filter(item => item.COMPLETED_AT != null) : [];
        var optDaConsiderare = orderScheduleData.filter(op => !optNotIncluded.find(item => item.OPERATION_ACTIVITY === op.OPERATION_ACTIVITY));
        return optDaConsiderare;
    } else {
        return [];
    }
}

// Esporta la funzione
module.exports = { autoCompileFieldsDataCollectionDispatcher }