const postgresdbService = require('../../connection');
const queryModifiche = require("./queries");

async function insertZModifiche(prog_eco, process_id, plant, wbe, type, sfc, order, material,child_order, child_material, qty, flux_type, status, send_to_sap){
    let dateNow = new Date();
    if(!prog_eco) prog_eco="";
    if(!process_id) process_id="";
    if(!qty) qty=0;
    const data = await postgresdbService.executeQuery(queryModifiche.insertZModificheQuery, [prog_eco, process_id, plant, wbe, type, sfc, order, material,child_order, child_material, qty, flux_type, status, send_to_sap,dateNow,dateNow]);
    return data;
}

async function getModificheData(plant, sfc, order){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheDataQuery, [plant, sfc, order]);
    return data;
}

async function updateStatusModifica(plant, prog_eco, newStatus){
    let dateNow = new Date();
    const data = await postgresdbService.executeQuery(queryModifiche.updateStatusModificaQuery, [plant, prog_eco, newStatus,dateNow]);
    return data;
}

async function updateResolutionModificaMA(plant, process_id, resolution){
    let dateNow = new Date();
    const data = await postgresdbService.executeQuery(queryModifiche.updateResolutionModificaMAQuery, [plant, process_id, resolution,dateNow]);
    return data;
}

async function getOperationModificheBySfc(plant, project, order){
    const data = await postgresdbService.executeQuery(queryModifiche.getOperationModificheBySfcQuery, [plant, project, order]);
    return data;
}

async function getModificheToDo(plant, sfc, order){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheToDoQuery, [plant, sfc, order]);
    return data;
}

async function updateZModifyByOrder(plant,newSfc,newOrder,oldSfc,oldOrder){
    let dateNow = new Date();
    const data = await postgresdbService.executeQuery(queryModifiche.updateZModifyByOrderQuery, [plant,newSfc,newOrder,oldSfc,oldOrder,dateNow]);
    return data;
}

module.exports = { insertZModifiche, getModificheData, updateStatusModifica, updateResolutionModificaMA, getOperationModificheBySfc, getModificheToDo, updateZModifyByOrder }