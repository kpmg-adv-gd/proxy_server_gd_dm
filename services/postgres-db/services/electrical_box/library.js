const postgresdbService = require('../../connection');
const queryElectricalBox = require("./queries");

async function insertZElectricalBox(plant,project,wbs_element,machine_section,machine_order,eb_material,eb_material_description,quantity,uom,status){
    let last_update = new Date();
    if(!quantity) quantity = 0;

    const data = await postgresdbService.executeQuery(queryElectricalBox.insertZElectricalBoxQuery, [plant,project,wbs_element,machine_section,machine_order,eb_material,eb_material_description,quantity,uom,status,last_update]);
    return data;
}

async function getZElectricalBoxData(plant, project, machine_order){
    const data = await postgresdbService.executeQuery(queryElectricalBox.getZElectricalBoxDataQuery, [plant, project, machine_order]);
    return data;
}

async function updateZElectricalBoxData(plant, project, machine_order, eb_material, status){
    let last_update = new Date();
    const data = await postgresdbService.executeQuery(queryElectricalBox.updateZElectricalBoxDataQuery, [status, plant, project, machine_order, eb_material, last_update]);
    return data;
}


module.exports = { insertZElectricalBox, getZElectricalBoxData,updateZElectricalBoxData }