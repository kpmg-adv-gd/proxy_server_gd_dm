const postgresdbService = require('../../connection');
const queryBom = require("./queries");
const { getOrderInfoByOrder } = require("../../../../utility/CommonFunction");

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

async function getMaterialsTI(plant, project) {
    var results = [];
    const dataMaterialFake = await postgresdbService.executeQuery(queryBom.getMaterialsTIFakeQuery, [plant]);
    dataMaterialFake.forEach(element => {
        results.push({ material: element.material, orders: [ ] });
    });
    const data = await postgresdbService.executeQuery(queryBom.getMaterialsTIQuery, [plant, project]);
    for (var i = 0; i < data.length; i++) {
        var infoOrder = await getOrderInfoByOrder(plant,data[i].child_order);
        let orderTypeField = infoOrder?.customValues.find(obj => obj.attribute == "ORDER_TYPE");
        let orderType = orderTypeField?.value || "";
        if (orderType=="ZPA1" || orderType=="ZPA2" || orderType=="ZPF1" || orderType=="ZPF2"){
            var objOrder = data[i].child_order;
            var originalOrder = data[i].child_order;    
            var orderLabel = "Prod. Order";
        } else if (orderType=="GRPF"){
            let purchaseOrderField = infoOrder?.customValues.find(obj => obj.attribute == "PURCHASE_ORDER");
            var objOrder = purchaseOrderField?.value || "";
            var originalOrder = data[i].child_order;
            var orderLabel = "Purchase Doc.";
        } else {
            var objOrder = data[i].child_order;
            var originalOrder = data[i].child_order;    
            var orderLabel = "";
        }
        if (results.filter(e => e.material === data[i].child_material).length == 0) {
            results.push({ material: data[i].child_material, orders: [{ order: objOrder, originalOrder: originalOrder, typeOrder: orderType, typeOrderDesc: orderLabel }] });
        }else{
            if (results.filter(e => e.material === data[i].child_material)[0].orders.filter(order => order.order == objOrder).length == 0)
                results.find(e => e.material === data[i].child_material).orders.push({ order: objOrder, originalOrder: originalOrder, typeOrder: orderType, typeOrderDesc: orderLabel });
        }
    }

    return results;
}   


module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, getZOrdersLinkByPlantProjectParentOrderChildMaterial,getZOrdersLinkByPlantProjectChildOrderChildMaterial, getZOrderLinkChildOrdersMultipleMaterial, getMaterialsTI }