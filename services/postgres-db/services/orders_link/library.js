const postgresdbService = require('../../connection');
const queryOrdersLink = require("./queries");

async function insertZOrdersLink(plant,project,parentOrder,parentMaterial,order,material,parentAssembly,orderType,machineSection){
    const data = await postgresdbService.executeQuery(queryOrdersLink.insertZOrdersLinkQuery, [plant,project, parentOrder, parentMaterial, order, material, parentAssembly, orderType, machineSection]);
    return data;
}

async function getZOrdersLinkByPlantProjectOrderType(plant,project,orderType){
    const data = await postgresdbService.executeQuery(queryOrdersLink.getZOrdersLinkByPlantProjectOrderTypeQuery, [plant,project,orderType]);
    return data;
}

async function getZOrdersLinkMachByPlantProjectOrderTypeMachineSection(plant,project,orderType,machineMaterial){
    const data = await postgresdbService.executeQuery(queryOrdersLink.getZOrdersLinkMachByPlantProjectOrderTypeMachineSectionQuery, [plant,project,orderType,machineMaterial]);
    return data;
}

async function getZOrdersLinkByPlantProjectAndParentOrder(plant,project,parentOrder){
    const data = await postgresdbService.executeQuery(queryOrdersLink.getZOrdersLinkByPlantProjectAndParentOrderQuery, [plant,project,parentOrder]);
    return data;
}

async function getAllMachMaterials(plant){
    let child_order_type = "MACH";
    const data = await postgresdbService.executeQuery(queryOrdersLink.getAllMachMaterialsQuery, [plant,child_order_type]);
    return data;
}

async function getMachOrderByComponentOrder(plant,project,orderComponent){
    const data = await postgresdbService.executeQuery(queryOrdersLink.getMachOrderByComponentOrderQuery, [plant,project,orderComponent]);
    return data;
}


module.exports = { insertZOrdersLink, getZOrdersLinkByPlantProjectOrderType, getZOrdersLinkMachByPlantProjectOrderTypeMachineSection, getZOrdersLinkByPlantProjectAndParentOrder, getAllMachMaterials, getMachOrderByComponentOrder }