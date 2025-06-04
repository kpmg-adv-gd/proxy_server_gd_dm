const { callPost, callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageRelabelSfc(plant,order,sfcs){

    var responseGetOrder = await getOrderResponse(plant,order);
    var customValues = responseGetOrder?.customValues;
    let wbsField = customValues.find(obj => obj.attribute == "WBE");
    let wbsValue = wbsField.value || "";
    let orderTypeField = customValues.find(obj => obj.attribute == "ORDER_TYPE");
    let orderTypeValue = orderTypeField.value || "";
    let parentAssemblyField = customValues.find(obj => obj.attribute == "PARENT_ASSEMBLY");
    let parentAssemblyValueFromSAP = parentAssemblyField.value || "";
    let parentAssemblyValue = parentAssemblyValueFromSAP === "X";

    let newSfcs = await manageSfc(sfcs,wbsValue,plant);
    if(parentAssemblyValue || orderTypeValue=="ZMGF"){
        await manageParentAssemblyMGFOrder(newSfcs,plant);
    }

}

async function manageSfc(sfcs,wbsValue,plant){
    if(!wbsValue || sfcs.length==0){
        return;
    }
    var sfcArray = [];
    for(let sfc of sfcs){
        let sfcOld = sfc.sfc;
        let sfcNew = wbsValue + "_" + sfcOld;
        let url = hostname + "/sfc/v1/sfcs/relabel";
        let body = {
            "plant": plant,
            "sfc": sfcOld,
            "newSfc": sfcNew,
            "copyWorkInstructionData": true,
            "copyComponentTraceabilityData": true,
            "copyNonConformanceData": true,
            "copyBuyoffData": true,
            "copyDataCollectionData": true,
            "copyActivityLogData": true
        };
        var updateSfcResponse = await callPost(url,body);
        sfcArray.push(sfcNew);
    }

    return sfcArray;
    
}

async function manageParentAssemblyMGFOrder(newSfcs,plantValue){
    let urlStartOp = hostname + "/sfc/v1/sfcs/start";
    let urlCompleteOp = hostname + "/sfc/v1/sfcs/complete";
    var body = {
        "plant": plantValue,
        "operation": "DUMMY_OPERATION",
        "resource": "DEFAULT",
        "sfcs": newSfcs
    };
    let responseStart = await callPost(urlStartOp,body);
    let responseComplete = await callPost(urlCompleteOp,body);
}

async function getOrderResponse(plant,order) {
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    const orderResponse = await callGet(url);
    return orderResponse;
}

module.exports = { manageRelabelSfc }