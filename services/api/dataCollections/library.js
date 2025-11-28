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
            var dc = datacollections[i].group, data = { group: dc.group, description: dc.description, parameters: [] };
            for (var j = 0; j < dc.parameters.length; j++) {
                var param = dc.parameters[j];
                var dataParameter = { parameterName: param.parameterName, description: param.description };
                var dataCollectionFilter = `(PLANT eq '${plant}' and SFC eq '${sfc}' AND RESOURCE eq '${resource}' and DC_GROUP eq '${dc.group}' and DC_PARAMETER_NAME eq '${param.parameterName}' and IS_DELETED eq 'false')`;
                var mockReqDC = {
                    path: "/mdo/DATA_COLLECTION",
                    query: { $apply: `filter(${dataCollectionFilter})` },
                    method: "GET"
                };
                var outMock = await dispatch(mockReqDC);
                var dcData = outMock?.data?.value.length>0 ? outMock.data.value : [];
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
                    var sharedResult = await getZSharedMemoryData(plant, param.listTypeDataField);
                    var listValues = [];
                    if (sharedResult.length > 0) {
                        try {
                            listValues = JSON.parse(sharedResult[0].value);
                        } catch (error) {
                            console.log("Error parsing list values from shared memory: " + error.message);
                            listValues = [];
                        }
                    } else { 
                        listValues = [];
                    }
                    listValues.unshift({ key: "", value: "" });
                    dataParameter.listValues = listValues;
                }
                data.parameters.push(dataParameter);
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomNC = await getZSharedMemoryData(plant, "CUSTOM_TABLE_NC");
            if (sharedResultCustomNC.length > 0) {
                try {
                    sharedResultCustomNC = JSON.parse(sharedResultCustomNC[0].value);
                    if (sharedResultCustomNC.some(item => item.group === dc.group)) data.viewCustomTableNC = true;
                    else data.viewCustomTableNC = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_NC from shared memory: " + error.message);
                    data.viewCustomTableNC = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_RESULTS");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableResults = true;
                    else data.viewCustomTableResults = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_RESULTS from shared memory: " + error.message);
                    data.viewCustomTableResults = false;
                }
            }
            results.push(data);
        }
        return results;
    } catch (error) {
        console.log("Error in elaborateDataCollectionsSupervisoreAssembly: " + error.message);
        return false;
    }
}

// Esporta la funzione
module.exports = { elaborateDataCollectionsSupervisoreAssembly };