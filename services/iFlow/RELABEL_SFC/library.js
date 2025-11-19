const { callPost, callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageRelabelSfc(plant,order,sfcs){

    var responseGetOrder = await getOrderResponse(plant,order);
    let material =  responseGetOrder?.material?.material || "";
    var customValues = responseGetOrder?.customValues;
    let wbsField = customValues.find(obj => obj.attribute == "WBE");
    let wbsValue = wbsField.value || "";
    let orderTypeField = customValues.find(obj => obj.attribute == "ORDER_TYPE");
    let orderTypeValue = orderTypeField.value || "";
    let parentAssemblyField = customValues.find(obj => obj.attribute == "PARENT_ASSEMBLY");
    let parentAssemblyValueFromSAP = parentAssemblyField.value || "";
    let parentAssemblyValue = parentAssemblyValueFromSAP === "X";

    let newSfcs = await manageSfc(sfcs,wbsValue,material,plant);
    if(parentAssemblyValue || orderTypeValue=="ZMGF"){
        await manageParentAssemblyMGFOrder(newSfcs,plant);
    }

}

async function manageSfc(sfcs,wbsValue,material,plant){
    if(!wbsValue || sfcs.length==0){
        return;
    }
    var sfcArray = [];
    for(let sfc of sfcs){
        let sfcOld = sfc.sfc;
        let sfcNew = wbsValue + "_" + material + "_" + sfcOld;
        // Convertiamo a MAIUSCOLO perché la regex accetta solo lettere maiuscole
        sfcNew = sfcNew.toUpperCase();
        // Puliamo i caratteri non validi
        sfcNew = sanitizeSfc(sfcNew);
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

function sanitizeSfc(input) {
    // Caratteri ammessi secondo la regex sap di creazione sfc
    const allowedChars = /[0-9A-Z_$!)(+~@^=\-*. ]/;

    let result = "";

    for (let char of input) {
        if (allowedChars.test(char)) {
            result += char;
        }
    }

    // Rimuove eventuali spazi iniziali o finali (vietati dalla regex)
    result = result.trim();

    return result;
}


module.exports = { manageRelabelSfc }