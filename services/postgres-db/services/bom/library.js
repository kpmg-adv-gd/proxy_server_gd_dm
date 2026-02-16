const postgresdbService = require('../../connection');
const queryBom = require("./queries");
const { getOrderInfoByOrder } = require("../../../../utility/CommonFunction");

async function getZOrdersLinkByProjectParentOrderChildOrderFlagQuery(project, parentOrder, childOrder, parentAssemblyFlag) {
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, [project, parentOrder, childOrder, parentAssemblyFlag]);
    return data;
}

async function getZOrdersLinkByPlantProjectParentOrderChildMaterial(plant, project, parentOrder, childMaterial) {
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByPlantProjectParentOrderChildMaterialQuery, [plant, project, parentOrder, childMaterial]);
    return data;
}

async function getZOrdersLinkByPlantProjectChildOrderChildMaterial(plant, project, childOrder, childMaterial) {
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByPlantProjectChildOrderChildMaterialQuery, [plant, project, childOrder, childMaterial]);
    return data;
}

async function getZOrderLinkChildOrdersMultipleMaterial(plant, order, material, child_order) {
    const data = await postgresdbService.executeQuery(queryBom.getZOrderLinkChildOrdersMultipleMaterialQuery, [plant, order, material, child_order]);
    return data;
}

async function getMaterialsTI(plant, project) {
    const dataMaterialFake = await postgresdbService.executeQuery(queryBom.getMaterialsTIFakeQuery, [plant]);
    const data = await postgresdbService.executeQuery(queryBom.getMaterialsTIQuery, [plant, project]);
    return [...dataMaterialFake, ...data];
}

async function getOrdersByMaterialTI(plant, material) {
    const dataOrders = await postgresdbService.executeQuery(queryBom.getOrderByMaterialQuery, [plant, material]);
    var results = [];
    for (let i = 0; i < dataOrders.length; i++) {
        var childOrder = dataOrders[i].child_order;
        var infoOrder = await getOrderInfoByOrder(plant, childOrder);
        let orderTypeField = infoOrder?.customValues.find(obj => obj.attribute == "ORDER_TYPE");
        let orderType = orderTypeField?.value || "";
        if (orderType == "ZPA1" || orderType == "ZPA2" || orderType == "ZPF1" || orderType == "ZPF2") {
            var objOrder = childOrder;
            var originalOrder = childOrder;
            var orderLabel = "Prod. Order";
        } else if (orderType == "GRPF") {
            let purchaseOrderField = infoOrder?.customValues.find(obj => obj.attribute == "PURCHASE_ORDER");
            var objOrder = purchaseOrderField?.value || "";
            var originalOrder = childOrder;
            var orderLabel = "Purchase Doc.";
        } else {
            var objOrder = childOrder;
            var originalOrder = childOrder;
            var orderLabel = "";
        }
        results.push({ order: objOrder, originalOrder: originalOrder, typeOrder: orderType, typeOrderDesc: orderLabel });
    }
    return results;
}




module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, getZOrdersLinkByPlantProjectParentOrderChildMaterial, getZOrdersLinkByPlantProjectChildOrderChildMaterial, getZOrderLinkChildOrdersMultipleMaterial, getMaterialsTI, getOrdersByMaterialTI }