const { callPost } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const xpath = require("xpath");

async function releaseOrder(docXml){
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0]?.textContent : null;
    var orderNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrder']", docXml);
    var orderValue = orderNode.length > 0 ? orderNode[0]?.textContent : null;
    var quantityToReleaseNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='MfgOrderPlannedTotalQty']", docXml);
    var quantityToReleaseValue = quantityToReleaseNode.length > 0 ? quantityToReleaseNode[0]?.textContent : null;
    var wbsNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='WBE']]/*[local-name()='Value']", docXml);
    var wbsValue = wbsNode.length > 0 ? wbsNode[0]?.textContent : null;
    var orderTypeNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrder']", docXml);
    var orderTypeValue = orderTypeNode.length > 0 ? orderTypeNode[0]?.textContent : null;
    var parentAssemblyNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrderParentAssembly']", docXml);
    var parentAssemblyValueFromSAP = parentAssemblyNode.length > 0 ? parentAssemblyNode[0]?.textContent : null;
    var parentAssemblyValue = parentAssemblyValueFromSAP === "X";

    var url = hostname + "/order/v2/orders/release";
    var body = {
        order: orderValue,
        plant: plantValue,
        quantityToRelease: quantityToReleaseValue
    };
    let responseReleaseOrder = await callPost(url,body);
    let newSfc = await manageSfc(responseReleaseOrder,wbsValue,plantValue);
    if(parentAssemblyValue || orderTypeValue=="ZMGF"){
        await manageParentAssemblyMGFOrder(newSfc,plantValue);
    }

}

async function manageSfc(response,wbsValue,plant){
    if(!wbsValue || !response || response?.sfcs.length==0){
        return;
    }

    var sfcOld = response.sfcs[0].identifier;
    var sfcNew = wbsValue + "_" + sfcOld;
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
    return sfcNew;
    
}

async function manageParentAssemblyMGFOrder(newSfc,plantValue){
    let urlStartOp = hostname + "/sfc/v1/sfcs/start";
    let urlCompleteOp = hostname + "/sfc/v1/sfcs/complete";
    var body = {
        "plant": plantValue,
        "operation": "DUMMY_OPERATION",
        "resource": "DEFAULT",
        "sfcs": [
            newSfc
        ]
    };
    let responseStart = await callPost(urlStartOp,body);
    let responseComplete = await callPost(urlCompleteOp,body);
}

module.exports = { releaseOrder }