const postgresdbService = require('../../connection');
const queryBom = require("./queries");

async function getZOrdersLinkByProjectParentOrderChildOrderFlagQuery(project, parentOrder, childOrder, parentAssemblyFlag){
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, [project, parentOrder, childOrder, parentAssemblyFlag]);
    return data;
}

async function getZOrdersLinkByPlantProjectParentOrderChildMaterial(plant, project, parentOrder, childMaterial){
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByPlantProjectParentOrderChildMaterialQuery, [plant, project, parentOrder, childMaterial]);
    return data;
}

async function getZOrdersLinkByPlantProjectChildOrderChildMaterial(plant, project, childOrder, childMaterial){
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByPlantProjectChildOrderChildMaterialQuery, [plant, project, childOrder, childMaterial]);
    return data;
}

async function getZOrderLinkChildOrdersMultipleMaterial(plant,order,material,child_order){
    const data = await postgresdbService.executeQuery(queryBom.getZOrderLinkChildOrdersMultipleMaterialQuery, [plant, order, material,child_order]);
    return data;
}

module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, getZOrdersLinkByPlantProjectParentOrderChildMaterial,getZOrdersLinkByPlantProjectChildOrderChildMaterial, getZOrderLinkChildOrdersMultipleMaterial }