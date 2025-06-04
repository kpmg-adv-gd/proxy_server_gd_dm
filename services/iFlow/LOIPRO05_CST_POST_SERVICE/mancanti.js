const { getZOrdersLinkByPlantProjectParentOrderChildMaterial } = require("../../postgres-db/services/bom/library");
const { callGet, callPatch } = require("../../../utility/CommonCallApi");

const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const xpath = require("xpath");


async function manageMancanti(docXml){
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0]?.textContent : null;
    var orderNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrder']", docXml);
    var orderValue = orderNode.length > 0 ? orderNode[0]?.textContent : null;
    var orderTypeNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrderType']", docXml);
    var orderTypeValue = orderTypeNode.length > 0 ? orderTypeNode[0]?.textContent : null;
    var projectNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='COMMESSA']]/*[local-name()='Value']", docXml);
    var projectValue = projectNode.length > 0 ? projectNode[0]?.textContent : null;

    if(orderTypeValue.slice(0, 3)=="GRP" || orderTypeValue.slice(0, 3)=="ZPA" || orderTypeValue.slice(0, 4)=="TOOL"){
        await manageMancantiGruppi(plantValue,orderValue);
    } else {
        await manageMancantiAggr(plantValue,orderValue,projectValue);
    }

}

async function manageMancantiGruppi(plant,order){

    // setTimeout(async () => {
        var bom = await getBomByOrderAndPlant(plant,order);
        var bodyUpdatedBomCompCustomValues = await getBomDetailUpdated(plant,bom);
        await updateBomCompCustomValues(bodyUpdatedBomCompCustomValues);
    // },7000);
}

async function manageMancantiAggr(plant,order,project){
    // setTimeout(async () => {
        var bom = await getBomByOrderAndPlant(plant,order);
        var bomDetailBody = await getBomDetail(plant,bom);
        var bodyUpdatedBomCompCustomValues = await getUpdateBomComponentAggr(bomDetailBody,project,order,plant);
        await updateBomCompCustomValues(bodyUpdatedBomCompCustomValues);
    // },8000);

}

async function getBomByOrderAndPlant(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var bomResponse = await callGet(url);
    return [bomResponse?.bom?.bom, bomResponse?.bom?.type];
}

async function getBomDetailUpdated(plant,bom){
    var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom[0] + "&type=" + bom[1];
    var bomComponentsResponse = await callGet(url);
    let customValueMancanti = 
        { 
            "attribute": "COMPONENTE MANCANTE", 
            "value": "false" 
        };
    for(comp of bomComponentsResponse[0]?.components){
        comp.customValues.push(customValueMancanti);
    }
    return bomComponentsResponse;
}

async function updateBomCompCustomValues(bodyUpdatedBomCompCustomValues){
    console.log("LUDO BODY PATCH BOM + "+JSON.stringify(bodyUpdatedBomCompCustomValues));
    var url = hostname + "/bom/v1/boms";
    var responseUpdateBomCompCustomValues = await callPatch(url,bodyUpdatedBomCompCustomValues);
}

async function getBomDetail(plant,bom){
    var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom[0] + "&type=" + bom[1];
    var bomComponentsResponse = await callGet(url);
    return bomComponentsResponse;
}

async function getUpdateBomComponentAggr(bomDetailBody, project, order,plantOrder) {
    let components = bomDetailBody[0]?.components || [];

    await Promise.all(components.map(async (el) => {
        let plant = el?.material?.plant;
        let material = el?.material?.material;

        let responseZOrdersLink = await getZOrdersLinkByPlantProjectParentOrderChildMaterial(plant, project, order, material);
        
        if (responseZOrdersLink.length > 0) {
            let mancante = "false";

            // Parallelizziamo le chiamate
            let orderChecks = await Promise.all(responseZOrdersLink.map(async (childOrder) => {
                let url = `${hostname}/order/v1/orders?order=${childOrder.child_order}&plant=${plant}`;
                let orderResponse = await callGet(url);
                return orderResponse?.executionStatus !== "COMPLETED" ? "true" : "false";
            }));

            // Se uno dei risultati è "true", allora c'è un mancante
            if (orderChecks.includes("true")) {
                await updateCustomMancanteOrder(plantOrder,order);
                mancante = "true";
            }

            el.customValues.push({
                "attribute": "COMPONENTE MANCANTE",
                "value": mancante
            });
        }
    }));

    return bomDetailBody; // Ritorna l'oggetto aggiornato
}

async function updateCustomMancanteOrder(plant,order){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"MANCANTI",
        "value": "true"
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    let response = await callPatch(url,body);

}

module.exports = { manageMancanti }