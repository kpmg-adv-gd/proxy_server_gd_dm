const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { ordersChildrenRecursion } = require("../../postgres-db/services/verbali/library");
const { getTotalQuantityFromOrders } = require("../../postgres-db/services/mancanti/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function autoCompileFieldsDataCollectionDispatcher(plant, data, parametriAuto, selected) {
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
                data = await ruleParameter0(data, group, parameterName, selected, dcData);
                break;
            case "1":
                data = await ruleParameter1(data, group, parameterName, selected);
                break;
            case "2":
                data = await ruleParameter2(data, group, parameterName, selected, dcData);
                break;
            case "3":
                data = await ruleParameter3(data, group, parameterName, selected);
                break;
            case "4":
                data = await ruleParameter4(data, group, parameterName, selected, plant);
                break;
            case "5":
                data = await ruleParameter5(data, group, parameterName, selected);
                break;
            case "6":
                data = await ruleParameter6(data, group, parameterName, selected);
                break;
            case "7":
                data = await ruleParameter7(data, group, parameterName, selected);
                break;
            case "8":
                data = await ruleParameter8(data, group, parameterName, selected);
                break;
            default:
                // Nessuna azione
                break;
        }
    }
    return data;
}

async function ruleParameter0(data, group, parameterName, selected, dcData) {
    if (dcData.length > 0) {
        var filter2 = `(MFG_ORDER eq '${dcData[0].MFG_ORDER}' and DATA_FIELD eq 'CO')`;
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
                        if (data[i].parameters[j].parameterName === parameterName && data[i].parameters[j].valueText == "") {
                            data[i].parameters[j].valueText = dcData2[0].DATA_VALUE;
                        }
                    }
                }
            }
        }
    }
    return data;
}
async function ruleParameter1(data, group, parameterName, selected) {
    var project = selected.project_parent;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && data[i].parameters[j].valueText == "") {
                    data[i].parameters[j].valueText = project;
                }
            }
        }
    }
    return data;
}
async function ruleParameter2(data, group, parameterName, selected, dcData) {
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
                        if (data[i].parameters[j].parameterName === parameterName && data[i].parameters[j].valueText == "") {
                            data[i].parameters[j].valueText = dcData2[0].DATA_VALUE;
                        }
                    }
                }
            }
        }
    }
    return data;
}
async function ruleParameter3(data, group, parameterName, selected) {
    var material = selected.material;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && data[i].parameters[j].valueText == "") {
                    data[i].parameters[j].valueText = material;
                }
            }
        }
    }
    return data;
}
async function ruleParameter4(data, group, parameterName, selected, plant) {
    var ordersToCheck = await ordersChildrenRecursion(plant, selected.order);
    var quantity = await getTotalQuantityFromOrders(plant, "'" + ordersToCheck.join("','") + "'");
    quantity = quantity == null ? "0" : quantity
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            for (var j = 0; j < data[i].parameters.length; j++) {
                if (data[i].parameters[j].parameterName === parameterName && data[i].parameters[j].valueText == "") {
                    data[i].parameters[j].valueText = quantity;
                }
            }
        }
    }
    return data;
}
async function ruleParameter5(data, group, parameterName, selected) {
    return data;
}
async function ruleParameter6(data, group, parameterName, selected) {
    return data;
}
async function ruleParameter7(data, group, parameterName, selected) {
    return data;
}
async function ruleParameter8(data, group, parameterName, selected) {
    return data;
}

// Esporta la funzione
module.exports = { autoCompileFieldsDataCollectionDispatcher }