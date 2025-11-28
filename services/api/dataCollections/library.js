const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

// Elaborazione delle data collections per il supervisore assembly
async function elaborateDataCollectionsSupervisoreAssembly(plant, sfc, resource, datacollections) {
    var results = [];
    try {
        for (var i = 0; i < datacollections.length; i++) {
            var dc = datacollections[i], data = { group: dc.group, description: dc.description, parameters: [] };
            for (var j = 0; j < dc.parameters.length; j++) {
                var param = dc.parameters[j], dataParameter = { parameterName: param.parameterName };
                var dataCollectionFilter = `(PLANT eq '${plant}' and SFC eq '${sfc}' AND RESOURCE eq '${resource}' and DC_GROUP eq '${dc.group}' and DC_PARAMETER_NAME eq '${param.parameterName}' and IS_DELETED eq 'false')`;
                var mockReqDC = {
                    path: "/mdo/DATA_COLLECTION",
                    query: { $apply: `filter(${dataCollectionFilter})` },
                    method: "GET"
                };
                var dcData = await dispatch(mockReqDC);
                if (dcData.length > 0) {
                    dcData.sort((a, b) => new Date(b.REPORTED_AT) - new Date(a.REPORTED_AT));
                    dataParameter.value = dcData[0].DC_PARAMETER_VALUE;
                    dataParameter.reported_at = dcData[0].REPORTED_AT;
                    dataParameter.comment = dcData[0].COMMENT;
                } else {
                    dataParameter.value = "";
                    dataParameter.reported_at = "";
                    dataParameter.comment = "";
                }
                // Estraggo dataType
                if (param.dcParameterType == "TEXT" && (!param.unitOfMeasure || param.unitOfMeasure == "")) dataParameter.dataType = "TEXT";
                else if (param.dcParameterType == "TEXT" && param.unitOfMeasure && param.unitOfMeasure == "TAG") dataParameter.dataType = "DATA";
                else if (param.dcParameterType == "NUMBER") dataParameter.dataType = "NUMBER";
                else if (param.dcParameterType == "BOOLEAN") dataParameter.dataType = "BOOLEAN";
                else if (param.dcParameterType == "DATA_FIELD_LIST") {
                    dataParameter.dataType = "LIST";
                    // Recupero menu a tendina dalla shared memory
                    var lists = await getZSharedMemoryData(plant, param.listTypeDataField);
                    if (lists.length > 0) lists = lists[0].value; else lists = [];
                    dataParameter.listValues = JSON.parse(lists);
                }
                data.parameters.push(dataParameter);
            }
            results.push(data);
        }
    } catch (error) {
        res.status(500).json({ error: "Error while executing query" });
    }
    return results;
}

// Esporta la funzione
module.exports = { elaborateDataCollectionsSupervisoreAssembly };