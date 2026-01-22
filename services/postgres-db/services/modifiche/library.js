const postgresdbService = require('../../connection');
const queryModifiche = require("./queries");
const { dispatch } = require("../../../mdo/library");

async function insertZModifiche(prog_eco, process_id, plant, wbe, type, sfc, order, material,child_order, child_material, qty, flux_type, status, send_to_sap, isCO2, wbeMachine, section, project, phase) {
    let dateNow = new Date();
    if(!prog_eco) prog_eco="";
    if(!process_id) process_id="";
    if(!qty) qty=0;
    if(!status) status=0;
    const data = await postgresdbService.executeQuery(queryModifiche.insertZModificheQuery, [prog_eco, process_id, plant, wbe, type, sfc, order, material,child_order, child_material, qty, flux_type, status, send_to_sap,dateNow,dateNow,isCO2, wbeMachine, section, project, phase]);
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

async function getModificheToDataCollections(plant,project,wbe,section, type){
    let dateNow = new Date();
    var data = await postgresdbService.executeQuery(queryModifiche.getModificheToDataCollections, [plant,project,wbe,section, type]); 
    return data;
}

async function getModificheToTesting(plant, project){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheToTestingQuery, [plant, project]);
    // Creazione TreeTable
    var treeTable = [], childId = 0;
    for (var i=0;i<data.length;i++) {
        var child = {
            level: 2,
            wbe: data[i].wbe,
            childMaterial: data[i].child_material,
            qty: data[i].qty,
            fluxType: data[i].flux_type,
            status: data[i].status,
            order: data[i].order,
            resolution: data[i].resolution,
            note: data[i].note,
            mark: data[i].type == "MA",
            order: data[i].order,
            childId: childId++
        }
        if (treeTable.filter(item => item.progEco ==  parseInt(data[i].prog_eco, 10) && item.processId == parseInt(data[i].process_id, 10) && item.material == data[i].material).length == 0) {
            treeTable.push({
                level: 1,
                type: data[i].type,
                progEco: parseInt(data[i].prog_eco, 10),
                processId: parseInt(data[i].process_id, 10),  
                material: data[i].material,
                mark: data[i].type == "MT" || data[i].type == "MK",
                project: data[i].project,
                machineSection: data[i].machine_section,
                wbe: data[i].wbe,
                Children: [child]
            });
        }else{
            treeTable.filter(item => item.progEco == data[i].prog_eco && item.processId == data[i].process_id && item.material == data[i].material)[0]
                .Children.push(child);
        }
    }
    return treeTable;
}


async function getModificheToVerbaleTesting(plant, project, wbeMachine, section){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheToVerbaleTestingQuery, [plant, wbeMachine, section, project]);
    // Recupero descrizione materiali
    for (var i=0;i<data.length;i++) {
        var filter = `PLANT eq '${plant}' and (MATERIAL eq '${data[i].material}' or MATERIAL eq '${data[i].child_material}')`;
        var mockReq = {
            path: "/mdo/MATERIAL_TEXT",
            query: { $apply: `filter(${filter})` },
            method: "GET"
        };
        var result = await dispatch(mockReq);
        if (result && result.length > 0) {
            data[i].material_description = result.find(item => item.MATERIAL == data[i].material)?.DESCRIPTION || "";
            data[i].child_material_description = result.find(item => item.MATERIAL == data[i].child_material)?.DESCRIPTION || "";
        }
    }
    // Creazione TreeTable
    var treeTable = [], childId = 0;
    for (var i=0;i<data.length;i++) {
        var child = {
            level: 2,
            wbe: data[i].wbe,
            childMaterial: data[i].child_material,
            childMaterialDescription: data[i].child_material_description,
            qty: data[i].qty,
            fluxType: data[i].flux_type,
            status: data[i].status,
            order: data[i].order,
            resolution: data[i].resolution,
            note: data[i].note,
            mark: data[i].type == "MA",
            childId: childId++
        }
        if (treeTable.filter(item => item.progEco == data[i].prog_eco && item.processId == data[i].process_id && item.material == data[i].material).length == 0) {
            treeTable.push({
                level: 1,
                type: data[i].type,
                progEco: data[i].prog_eco,
                processId: data[i].process_id,
                material: data[i].material,
                materialDescription: data[i].material_description,
                mark: data[i].type == "MT" || data[i].type == "MK",
                Children: [child]
            });
        }else{
            treeTable.filter(item => item.progEco == data[i].prog_eco && item.processId == data[i].process_id && item.material == data[i].material)[0]
                .Children.push(child);
        }
    }
    return treeTable;
}

async function updateModificheToTesting(plant, wbe, section, project){
    await postgresdbService.executeQuery(queryModifiche.updateModificheToTestingQuery, [plant, wbe, section, project]);
}

async function getModificheTestingByOrders(plant, project){
    const data = await postgresdbService.executeQuery(queryModifiche.getModificheTestingByOrdersQuery, [plant, project]);
    return data;
}

module.exports = { insertZModifiche, getModificheData, getModificheDataGroupMA, getAllModificaMA, updateStatusModifica, updateStatusModificaMA, getOperationModificheBySfc, getModificheToDo, updateZModifyByOrder, updateZModifyCO2ByOrder, getModificheToTesting, getModificheToVerbaleTesting, getModificheToDataCollections, updateModificheToTesting, getModificheTestingByOrders };