const xpath = require("xpath");
const { insertZMarkingRecap, getMarkingByConfirmationNumber } = require("../../postgres-db/services/marking/library");
const { insertZOrdersLink } = require("../../postgres-db/services/orders_link/library");
const { insertZCertification } = require("../../postgres-db/services/loipro/library");
const { insertZSpecialGroups } = require("../../postgres-db/services/loipro/library");

async function populateZTables(docXml){
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0]?.textContent : null;
    var orderNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrder']", docXml);
    var orderValue = orderNode.length > 0 ? orderNode[0]?.textContent : null;
    var orderTypeNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrderType']", docXml);
    var orderTypeValue = orderTypeNode.length > 0 ? orderTypeNode[0]?.textContent : null;
    var wbsNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='WBE']]/*[local-name()='Value']", docXml);
    var wbsValue = wbsNode.length > 0 ? wbsNode[0]?.textContent : null;
    var projectNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='COMMESSA']]/*[local-name()='Value']", docXml);
    var projectValue = projectNode.length > 0 ? projectNode[0]?.textContent : null;
    var operationNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='ManufacturingOrderMESReference']/*[local-name()='MESOperation']", docXml);
    var durationOpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='StandardWorkFormulaParamGroup']/*[local-name()='WorkCenterFormulaParam2']/*[local-name()='WorkCenterStandardWorkQty']", docXml);
    var confirmationNumberOpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='OperationCustomFields']/*[local-name()='CONFIRMATION_NUMBER']", docXml);
    var materialNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='Material']", docXml);
    var materialValue = materialNode.length > 0 ? materialNode[0]?.textContent : null;
    var parentOrderNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrderParentOrder']", docXml);
    var parentOrderValue = parentOrderNode.length > 0 ? parentOrderNode[0]?.textContent : null;
    var parentMaterialNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='MATERIALE PADRE']]/*[local-name()='Value']", docXml);
    var parentMaterialValue = parentMaterialNode.length > 0 ? parentMaterialNode[0]?.textContent : null;    
    var parentAssemblyNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='PARENT_ASSEMBLY']]/*[local-name()='Value']", docXml);
    var parentAssemblyValueFromSAP = parentAssemblyNode.length > 0 ? parentAssemblyNode[0]?.textContent : null;
    var parentAssemblyValue = parentAssemblyValueFromSAP === "X";
    var workCenterErpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='WorkCenterErp']", docXml);

    
    //Faccio le 4 insert in parallelo
    const results = await Promise.allSettled([
        insertZMarkingTable(parentAssemblyValue,orderTypeValue,plantValue, orderValue, wbsValue, projectValue, operationNodes, durationOpNodes, confirmationNumberOpNodes),
        insertZOrdersLinkTable(plantValue, projectValue, parentOrderValue, parentMaterialValue, orderValue, materialValue, parentAssemblyValue),
        insertZCertificationTable(plantValue,workCenterErpNodes,operationNodes),
        insertZSpecialGroupsTable(plantValue,projectValue,wbsValue,orderValue,orderTypeValue,parentAssemblyValue,false)
    ]);

    // Raccogliamo gli errori dalle promise fallite
    const errors = results
    .filter(result => result.status === "rejected")
    .map(result => {
        // Prendo il messaggio di errore
        if (result.reason instanceof Error) {
            return result.reason.message;  // Se l'errore è un'istanza di Error, prendi il messaggio
        }
        return JSON.stringify(result.reason);  // Altrimenti lo converto in una stringa JSON
    });

    // Se ci sono errori, li uniamo e li restituiamo al chiamante
    if (errors.length > 0) {
        let errorMessage = `Errori durante l'elaborazione populateZTables: ${errors.join(" | ")}`;
        throw { status: 500, message: errorMessage};
    }
}

async function insertZMarkingTable(parentAssemblyValue,orderTypeValue,plant,order,wbs,project,operationNodes,durationOpNodes,confirmationNumberOpNodes){
    if(parentAssemblyValue || orderTypeValue == "ZMGF") return;
    const promises = operationNodes.map((currentOperation, ii) => {
        let op = operationNodes[ii]?.textContent;
        let durationOp = durationOpNodes[ii]?.textContent;
        let durationUoMOp = durationOpNodes[ii]?.getAttribute("pp:unitCode") || "";
        let confirmationNumber = confirmationNumberOpNodes[ii]?.textContent;
        if(confirmationNumberOpNodes && confirmationNumberOpNodes!==""){
            return insertZMarkingRecapIfConfirmationIsNew(plant, project, wbs, op, order, confirmationNumber,durationOp, durationUoMOp, durationUoMOp, durationOp, durationUoMOp, durationUoMOp);
        }
    });
    // Esegui tutte le promesse in parallelo
    await Promise.all(promises);
}
async function insertZMarkingRecapIfConfirmationIsNew(plant, project, wbs, op, order, confirmationNumber,durationOp, durationUoMOp, durationUoMOp, durationOp, durationUoMOp, durationUoMOp){
    let responseMarkingByConfirmation = await getMarkingByConfirmationNumber(confirmationNumber);
    if(responseMarkingByConfirmation.length==0){
        await insertZMarkingRecap(plant, project, wbs, op, order, confirmationNumber,durationOp, durationUoMOp, 0, durationUoMOp, durationOp, durationUoMOp, 0, durationUoMOp,null,false);
    }
    return;
}

async function insertZOrdersLinkTable(plantValue,projectValue,parentOrderValue,parentMaterialValue,orderValue,materialValue,parentAssemblyValue){
    await insertZOrdersLink(plantValue,projectValue,parentOrderValue,parentMaterialValue,orderValue,materialValue,parentAssemblyValue);
    return;
}

async function insertZCertificationTable(plant, workCenterErpNodes, operationNodes) {
    if (workCenterErpNodes.length !== operationNodes.length) {
        throw { status: 500, message: "WorkCenter|Operations not compiled correctly" };
    }

    // Creiamo tutte le promise per le insert
    const insertPromises = workCenterErpNodes.map((workCenterNode, index) => 
        insertZCertification(plant, operationNodes[index].textContent, workCenterNode.textContent, false)
    );

    // Eseguiamo tutte le insert in parallelo
    await Promise.all(insertPromises);
}

async function insertZSpecialGroupsTable(plantValue,projectValue,wbsValue,orderValue,orderTypeValue,parentAssemblyValue,elaborated){
    if( ((orderTypeValue.includes("GRP") || orderTypeValue.includes("ZPA1")  || orderTypeValue.includes("ZPF1") ) && parentAssemblyValue) || (orderTypeValue=="ZMGF") ){
        await insertZSpecialGroups(plantValue,projectValue,wbsValue,orderValue,orderTypeValue,parentAssemblyValue,elaborated);
    }
}

module.exports = { populateZTables }