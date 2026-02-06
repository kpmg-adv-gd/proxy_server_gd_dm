const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { ordersChildrenRecursion } = require("../../postgres-db/services/verbali/library");
const { getTotalQuantityFromOrders } = require("../../postgres-db/services/mancanti/library");
const { getModificheToDataCollections } = require("../../postgres-db/services/modifiche/library");
const { getMarkingTestingDataByOrder } = require("../../postgres-db/services/marking/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function autoCompileFieldsDataCollectionDispatcher(plant, data, parametriAuto, selected, refresh) {
    var filter = `(DATA_FIELD_VALUE eq '${selected.project_parent}' and DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}')`;
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
        // escludiamo valori vuoti
        dcData2 = dcData2.filter(item => item.DATA_FIELD_VALUE && item.DATA_FIELD_VALUE.trim() !== '');
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
            // check time è un numero valido
            if (isNaN(time) || time == "") time = 0;
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
    // Parametro 3 -> Campo Ore Base Line (somma planned_labor da z_marking_testing)
    try {
        const order = selected.order || '';
        
        // Recupero dati da z_marking_testing con type="T"
        const markingData = await getMarkingTestingDataByOrder(plant, order, "T");
        
        // Sommo planned_labor e converto da HCN a ore se necessario
        let totalHours = 0;
        console.log("ore base line markingData:", JSON.stringify(markingData));
        for (const marking of markingData) {
            const plannedLabor = parseFloat(marking.planned_labor || 0);
            const uom = marking.uom_planned_labor || '';
            
            if (uom === 'HCN') {
                // Conversione HCN a ore: diviso per (100 * 60) = 6000
                totalHours += plannedLabor / 100;
            } else {
                // Assumo che sia già in ore
                totalHours += plannedLabor;
            }
        }
        
        // Arrotondo a 2 decimali
        totalHours = Math.round(totalHours * 100) / 100;
        
        // Aggiorno i parametri
        for (var i = 0; i < data.length; i++) {
            if (data[i].group === group) {
                for (var j = 0; j < data[i].parameters.length; j++) {
                    if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueNumber == "" || refresh)) {
                        data[i].parameters[j].valueNumber = totalHours.toString();
                    }
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error in ruleParameter3Testing:", error);
        return data;
    }
}
async function ruleParameter4Testing(data, group, parameterName, selected, plant, refresh) {
    // Parametro 4 -> Campo Ore consuntivo (somma marked_labor da z_marking_testing)
    try {
        const order = selected.order || '';
        
        // Recupero dati da z_marking_testing con type="T"
        const markingData = await getMarkingTestingDataByOrder(plant, order, "T");
        
        // Sommo marked_labor e converto da HCN a ore se necessario
        let totalHours = 0;
        for (const marking of markingData) {
            const markedLabor = parseFloat(marking.marked_labor || 0);
            const uom = marking.uom_marked_labor || '';
            
            if (uom === 'HCN') {
                totalHours += markedLabor / 100;
            } else {
                // Assumo che sia già in ore
                totalHours += markedLabor;
            }
        }
        
        // Arrotondo a 2 decimali
        totalHours = Math.round(totalHours * 100) / 100;
        
        for (var i = 0; i < data.length; i++) {
            if (data[i].group === group) {
                for (var j = 0; j < data[i].parameters.length; j++) {
                    if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueNumber == "" || refresh)) {
                        data[i].parameters[j].valueNumber = totalHours.toString();
                    }
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error in ruleParameter4Testing:", error);
        return data;
    }
}
async function ruleParameter5Testing(data, group, parameterName, selected, plant, refresh) {
    // Parametro 5 -> Campo Ore varianza (somma variance_labor da z_marking_testing)
    try {
        const order = selected.order || '';
        
        // Recupero dati da z_marking_testing con type="T"
        const markingData = await getMarkingTestingDataByOrder(plant, order, "T");
        
        // Sommo variance_labor e converto da HCN a ore se necessario
        let totalHours = 0;
        for (const marking of markingData) {
            const varianceLabor = parseFloat(marking.variance_labor || 0);
            const uom = marking.uom_variance || '';
            
            if (uom === 'HCN') {
                // Conversione HCN a ore: diviso per (100 * 60) = 6000
                totalHours += varianceLabor / 100;
            } else {
                // Assumo che sia già in ore
                totalHours += varianceLabor;
            }
        }
        
        // Arrotondo a 2 decimali
        totalHours = Math.round(totalHours * 100) / 100;
        
        for (var i = 0; i < data.length; i++) {
            if (data[i].group === group) {
                for (var j = 0; j < data[i].parameters.length; j++) {
                    if (data[i].parameters[j].parameterName === parameterName && (data[i].parameters[j].valueNumber == "" || refresh)) {
                        data[i].parameters[j].valueNumber = totalHours.toString();
                    }
                }
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error in ruleParameter5Testing:", error);
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