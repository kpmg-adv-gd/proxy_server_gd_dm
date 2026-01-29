const { callPost, callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageRelabelSfc(plant,order,sfcs){

    var responseGetOrder = await getOrderResponse(plant,order);
    var customValues = responseGetOrder?.customValues;
    let wbsField = customValues.find(obj => obj.attribute == "WBE");
    let wbsValue = wbsField ? wbsField.value : "";
    let orderTypeField = customValues.find(obj => obj.attribute == "ORDER_TYPE");
    let orderTypeValue = orderTypeField ? orderTypeField.value : "";
    let parentAssemblyField = customValues.find(obj => obj.attribute == "PARENT_ASSEMBLY");
    let parentAssemblyValueFromSAP = parentAssemblyField ? parentAssemblyField.value : "";
    let parentAssemblyValue = parentAssemblyValueFromSAP === "X";
    let phaseField= customValues.find(obj => obj.attribute == "PHASE");
    let phaseValue = phaseField ? phaseField.value : "";
    let wbeTestingField = customValues.find(obj => obj.attribute == "COMMESSA");
    let wbeTesting = wbeTestingField ? wbeTestingField.value : "";
    let material = responseGetOrder?.material?.material || "";
    
    let newSfcs = await manageSfc(sfcs,wbsValue,plant,wbeTesting,phaseValue,material);
    if(parentAssemblyValue || orderTypeValue=="ZMGF"){
        await manageParentAssemblyMGFOrder(newSfcs,plant);
    }

}

async function manageSfc(sfcs,wbsValue,plant,wbeTesting,phaseValue,material){
    if( (!wbsValue && !wbeTesting) || sfcs.length==0){
        return;
    }
    var sfcArray = [];
    for(let sfc of sfcs){
        let sfcOld = sfc.sfc;
        let sfcNew = wbsValue + "_" + sfcOld;
        if(phaseValue=="TESTING"){
            sfcNew = wbeTesting + "_" +  material + "_" + sfcOld;
        }
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