const { callGet } = require("./CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getBomInfoByOrder(plant,order){
    let orderResponse = await getOrderInfoByOrder(plant,order);
    let bomResponse = await getBomInfoByBom(plant,orderResponse.bom.bom,orderResponse.bom.type);
    return bomResponse;
}

async function getOrderInfoByOrder(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    return orderResponse;
}

async function getBomInfoByBom(plant,bom,bomType){
    var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom + "&type=" + bomType;
    var bomResponse = await callGet(url);
    return bomResponse;
}

module.exports = { getBomInfoByOrder, getOrderInfoByOrder, getBomInfoByBom }