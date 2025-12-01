const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function autoCompileFieldsDataCollectionDispatcher(data, parametriAuto, selected) {
    for (var i = 0; i < parametriAuto.length; i++) {
        var numParametro = parametriAuto[i].parametro;
        var group = parametriAuto[i].group;
        var parameterName = parametriAuto[i].parameterName;
        // switch sulla funzione da chiamare
        switch (numParametro) {
            case "1":
                data = await ruleParameter1(data, group, parameterName, selected);
                break;
            case "2":
                data = await ruleParameter2(data, group, parameterName, selected);
                break;
            case "3":
                data = await ruleParameter3(data, group, parameterName, selected);
                break;
            case "4":
                data = await ruleParameter4(data, group, parameterName, selected);
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
            case "9":
                data = await ruleParameter9(data, group, parameterName, selected);
                break;
            default:
                // Nessuna azione
                break;
        }
    }
    return data;
}

async function ruleParameter1(data, group, parameterName, selected) {
    var filter = `(COMMESSA eq '${selected.parent_project}' and SFC eq '${sfc}' AND RESOURCE eq '${resource}' and DC_GROUP eq '${listSection[i].section}' and DC_PARAMETER_NAME eq '${listSection[i].dcVotoSezione}' and IS_DELETED eq 'false')`;
    var mockReq = {
        path: "/mdo/ORDER_CUSTOM_DATA",
        query: { $apply: `filter(${filter})` },
        method: "GET"
    };
    var outMock = await dispatch(mockReq);
    var dcData = (outMock?.data?.value && outMock.data.value.length > 0) ? outMock.data.value : [];
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
                    data[i].parameters.forEach(param => {
                        if (param.parameterName === parameterName) {
                            param.value = dcData2[0].DATA_VALUE;
                        }
                    });
                }
            }
        }
    }
    return data;
}
async function ruleParameter2(data, group, parameterName, selected) {
    var project = selected.parent_project;
    for (var i = 0; i < data.length; i++) {
        if (data[i].group === group) {
            data[i].parameters.forEach(param => {
                if (param.parameterName === parameterName) {
                    param.value = project;
                }
            });
        }
    }
    return data;
}
async function ruleParameter3(data, group, parameterName, selected) {
    return data;
}
async function ruleParameter4(data, group, parameterName, selected) {
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
async function ruleParameter9(data, group, parameterName, selected) {
    return data;
}

// Esporta la funzione
module.exports = { autoCompileFieldsDataCollectionDispatcher }