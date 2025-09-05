const postgresdbService = require('../../connection');
const queryModifiche = require("./queries");

async function insertZModifiche(prog_eco, process_id, plant, wbe, type, sfc, order, material,child_order, child_material, qty, flux_type, status, send_to_sap, isCO2){
    let dateNow = new Date();
    if(!prog_eco) prog_eco="";
    if(!process_id) process_id="";
    if(!qty) qty=0;
    if(!status) status=0;
    const data = await postgresdbService.executeQuery(queryModifiche.insertZModificheQuery, [prog_eco, process_id, plant, wbe, type, sfc, order, material,child_order, child_material, qty, flux_type, status, send_to_sap,dateNow,dateNow,isCO2]);
    return data;
}

async function getModificheData(plant, sfc){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheDataQuery, [plant, sfc]);
    return data;
}

async function getModificheDataGroupMA(plant, child_order){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheDataGroupMAQuery, [plant, child_order]);
    return data;
}

async function updateStatusModifica(plant, prog_eco, newStatus, note){
    if(!note) note="";
    let dateNow = new Date();
    console.log("prog_eco= "+prog_eco+" and newStatus= "+newStatus);
    const data = await postgresdbService.executeQuery(queryModifiche.updateStatusModificaQuery, [plant, prog_eco, newStatus,note, dateNow]);
    return data;
}

async function updateStatusModificaMA(plant, wbe, process_id, child_material, newStatus, resolution, note){
    let dateNow = new Date();
    const data = await postgresdbService.executeQuery(queryModifiche.updateStatusModificaMAQuery, [plant, wbe, process_id, child_material, newStatus, resolution, note, dateNow]);
    return data;
}

async function getAllModificaMA(plant, wbe, process_id){
    const data = await postgresdbService.executeQuery(queryModifiche.getAllModificaMAQuery, [plant, wbe, process_id]);
    return data;
}

async function getOperationModificheBySfc(plant, project, order){
    const data = await postgresdbService.executeQuery(queryModifiche.getOperationModificheBySfcQuery, [plant, project, order]);
    return data;
}

async function getModificheToDo(plant, sfc){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheToDoQuery, [plant, sfc]);
    return data;
}

async function updateZModifyByOrder(plant,newSfc,oldSfc){
    let dateNow = new Date();
    const data = await postgresdbService.executeQuery(queryModifiche.updateZModifyByOrderQuery, [plant,newSfc,oldSfc,dateNow]);
    return data;
}

async function updateZModifyCO2ByOrder(plant,newSfc,oldSfc){
    let dateNow = new Date();
    var data = await postgresdbService.executeQuery(queryModifiche.updateZModifyCO2ByOrderQuery, [plant,newSfc,oldSfc,dateNow]); 
    return data;
}

module.exports = { insertZModifiche, getModificheData, getModificheDataGroupMA, getAllModificaMA, updateStatusModifica, updateStatusModificaMA, getOperationModificheBySfc, getModificheToDo, updateZModifyByOrder, updateZModifyCO2ByOrder }