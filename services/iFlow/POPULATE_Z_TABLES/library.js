const { callGet } = require("../../../utility/CommonCallApi");
const { insertZMarkingRecap, getMarkingByConfirmationNumber } = require("../../postgres-db/services/marking/library");
const { insertZOrdersLink } = require("../../postgres-db/services/orders_link/library");
const { insertZCertification } = require("../../postgres-db/services/loipro/library");
const { insertZSpecialGroups } = require("../../postgres-db/services/loipro/library");
const { updateZverbaleLev1TableWithSfc, updateZverbaleLev2TableWithSfc } = require("../../postgres-db/services/verbali/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function populateZTables(plantValue,orderValue){
    var orderDetail = await getOrderDetailByOrderAndPlant(plantValue,orderValue);
    let materialValue = orderDetail?.material?.material;
    let routing = orderDetail?.routing?.routing;
    let routingType = orderDetail?.routing?.type;
    var customValues = orderDetail?.customValues;
    let phaseField= customValues.find(obj => obj.attribute == "PHASE");
    let phaseValue = phaseField ? phaseField.value : "";
    let sfc = orderDetail?.sfcs && orderDetail.sfcs.length>0 ? orderDetail.sfcs[0] : "";
    if(phaseValue=="TESTING"){
        await updateWithSfcZverbaleLevTables(plantValue,orderValue,sfc);
        return;
    }
    let projectField = customValues.find(obj => obj.attribute == "COMMESSA");
    let projectValue =  projectField ? projectField.value : "";  
    let wbsField = customValues.find(obj => obj.attribute == "WBE");
    let wbsValue = wbsField ? wbsField.value : "";
    let orderTypeField = customValues.find(obj => obj.attribute == "ORDER_TYPE");
    let orderTypeValue = orderTypeField ? orderTypeField.value : "";
    let parentOrderField = customValues.find(obj => obj.attribute == "ORDINE PADRE");
    let parentOrderValue = parentOrderField ? parentOrderField.value : "";
    let machineSectionField = customValues.find(obj => obj.attribute == "SEZIONE MACCHINA");
    let machineSectionValue = machineSectionField ? machineSectionField.value : "";
    let parentMaterialField = customValues.find(obj => obj.attribute == "MATERIALE PADRE");
    let parentMaterialValue = parentMaterialField ? parentMaterialField.value : "";
    let parentAssemblyField = customValues.find(obj => obj.attribute == "PARENT_ASSEMBLY");
    let parentAssemblyValueFromSAP = parentAssemblyField ? parentAssemblyField.value : "";
    let parentAssemblyValue = parentAssemblyValueFromSAP === "X";
    
    var operationNodes = [];
    var durationOpNodes  = [];
    var confirmationNumberOpNodes = [];
    var workCenterErpNodes = [];
    var routingDetail = await getRoutingDetailByRoutingAndPlant(plantValue,routing,routingType);
    var routingSteps = routingDetail.length > 0 ? routingDetail[0].routingSteps : [];

    for(let step of routingSteps){
        let routingStepGroupType = step?.routingStepGroup?.routingStepGroupType || null;
        // SE NON è SIMULTAENOUS 
        if(!routingStepGroupType || routingStepGroupType!=="SIMULTANEOUS_ORDER_GROUP"){
            let operationActivty = step?.routingOperation?.operationActivity?.operationActivity;
            let customValuesRoutingStep = step?.routingOperation?.customValues || [];
            let durationField = customValuesRoutingStep.find(obj => obj.attribute == "DURATION");
            let durationValue = durationField?.value || 0;
            let confiNumberField = customValuesRoutingStep.find(obj => obj.attribute == "CONFIRMATION_NUMBER");
            let confiNumberValue = confiNumberField?.value || "";
            let workCenterErpField = customValuesRoutingStep.find(obj => obj.attribute == "WORK_CENTER_ERP");
            let workCenterErpValue = workCenterErpField?.value || "";
            operationNodes.push(operationActivty);
            durationOpNodes.push(durationValue);
            confirmationNumberOpNodes.push(confiNumberValue);
            workCenterErpNodes.push(workCenterErpValue);
        }
    }
    
    //Faccio le 4 insert in parallelo
    const results = await Promise.allSettled([
        insertZMarkingTable(parentAssemblyValue,orderTypeValue,plantValue, orderValue, wbsValue, projectValue, operationNodes, durationOpNodes, confirmationNumberOpNodes),
        insertZOrdersLinkTable(plantValue, projectValue, parentOrderValue, parentMaterialValue, orderValue, materialValue, parentAssemblyValue, orderTypeValue, machineSectionValue),
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

async function getOrderDetailByOrderAndPlant(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    return orderResponse;
}

async function getRoutingDetailByRoutingAndPlant(plant,routing,routingType){
    var url = hostname + "/routing/v1/routings?plant=" + plant + "&type=" + routingType + "&routing=" + routing;
    const responseRouting = await callGet(url);
    return responseRouting;
}


async function insertZMarkingTable(parentAssemblyValue,orderTypeValue,plant,order,wbs,project,operationNodes,durationOpNodes,confirmationNumberOpNodes){
    if(parentAssemblyValue || orderTypeValue == "ZMGF") return;
    const promises = operationNodes.map((currentOperation, ii) => {
        let op = operationNodes[ii];
        let durationOp = durationOpNodes[ii];
        let durationUoMOp = "HCN"; //durationOpNodes[ii]?.getAttribute("pp:unitCode") || "";
        let confirmationNumber = confirmationNumberOpNodes[ii];
        if(confirmationNumber && confirmationNumber !==""){
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

async function insertZOrdersLinkTable(plantValue,projectValue,parentOrderValue,parentMaterialValue,orderValue,materialValue,parentAssemblyValue,orderType,machineSection){
    await insertZOrdersLink(plantValue,projectValue,parentOrderValue,parentMaterialValue,orderValue,materialValue,parentAssemblyValue,orderType,machineSection);
    return;
}

async function insertZCertificationTable(plant, workCenterErpNodes, operationNodes) {
    if (workCenterErpNodes.length !== operationNodes.length) {
        throw { status: 500, message: "WorkCenter|Operations not compiled correctly" };
    }

    // Creiamo tutte le promise per le insert
    const insertPromises = workCenterErpNodes.map((workCenterNode, index) => {
        if(!!workCenterNode && workCenterNode!==""){
            return insertZCertification(plant, operationNodes[index], workCenterNode, false);
        }
    });

    // Eseguiamo tutte le insert in parallelo
    await Promise.all(insertPromises);
}

async function insertZSpecialGroupsTable(plantValue,projectValue,wbsValue,orderValue,orderTypeValue,parentAssemblyValue,elaborated){
    if( ((orderTypeValue.includes("GRP") || orderTypeValue.includes("ZPA1")  || orderTypeValue.includes("ZPF1") ) && parentAssemblyValue) || (orderTypeValue=="ZMGF") ){
        await insertZSpecialGroups(plantValue,projectValue,wbsValue,orderValue,orderTypeValue,parentAssemblyValue,elaborated);
    }
}

async function updateWithSfcZverbaleLevTables(plant,order,sfc){
    // Implementazione della logica per l'aggiornamento delle tabelle lev2 e lev 3 con SFC
    await updateZverbaleLev1TableWithSfc(plant,order,sfc);
    await updateZverbaleLev2TableWithSfc(plant,order,sfc);
    return;
}

module.exports = { populateZTables }