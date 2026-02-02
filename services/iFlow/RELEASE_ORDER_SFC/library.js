const { callPost, callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageRelease(plant,routing){

    var orderValue = routing;
    var responseGetOrder = await getOrderResponse(plant,orderValue);
    let customValues = responseGetOrder?.customValues || [];
    let phaseField= customValues.find(obj => obj.attribute == "PHASE");
    let phaseValue = phaseField ? phaseField.value : "";
    if(phaseValue=="TESTING"){
        return;
    }
    var quantityToReleaseValue = responseGetOrder?.orderedQuantity || 1;
    
    var url = hostname + "/order/v2/orders/release";
    var body = {
        order: orderValue,
        plant: plant,
        quantityToRelease: quantityToReleaseValue
    };

    let responseReleaseOrder = await callPost(url,body);


}

async function getOrderResponse(plant,order) {
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    const orderResponse = await callGet(url);
    return orderResponse;
}

module.exports = { manageRelease }