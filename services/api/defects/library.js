const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { callGet, callPost, callPatch } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function sendCloseDefectToSap(plant, dataForSap) {
    var pathCloseDefect = await getZSharedMemoryData(plant, "CLOSE_DEFECT");
    if (pathCloseDefect.length > 0) pathCloseDefect = pathCloseDefect[0].value;
    var url = hostname + pathCloseDefect;
    console.log("URL SAP: " + url);

    console.log("SAP body:" + JSON.stringify(dataForSap));
    let response = await callPost(url, dataForSap);
    console.log("RESPONSE SAP: " + JSON.stringify(response));

    return response;
}

async function updateCustomDefectOrder(plant,order,value){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"DEFECTS",
        "value": value
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    let response = await callPatch(url,body);
}

module.exports = { sendCloseDefectToSap, updateCustomDefectOrder };