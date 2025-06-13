const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { callGet, callPost } = require("../../../utility/CommonCallApi");
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

module.exports = { sendCloseDefectToSap };