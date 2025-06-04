const postgresdbService = require('../../connection');
const queryElectricalBox = require("./queries");

async function insertZElectricalBox(plant,project,wbs_element,machine_section,machine_order,order_material,eb_material,quantity,uom,status){
    let last_update = new Date();
    if(!quantity) quantity = 0;

    const data = await postgresdbService.executeQuery(queryElectricalBox.insertZElectricalBoxQuery, [plant,project,wbs_element,machine_section,machine_order,order_material,eb_material,quantity,uom,status,last_update]);
    return data;
}

async function getZElectricalBoxData(plant, project, wbs_element, machine_order){
    const data = await postgresdbService.executeQuery(queryElectricalBox.getZElectricalBoxDataQuery, [plant, project, wbs_element, machine_order]);
    return data;
}

async function updateZElectricalBoxData(plant, wbs_element, machine_order, status){
    const data = await postgresdbService.executeQuery(queryElectricalBox.updateZElectricalBoxDataQuery, [status, plant, wbs_element, machine_order]);
    return data;
}


module.exports = { insertZElectricalBox, getZElectricalBoxData,updateZElectricalBoxData }