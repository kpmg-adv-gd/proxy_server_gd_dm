const { callPatch } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

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

module.exports = { updateCustomDefectOrder };