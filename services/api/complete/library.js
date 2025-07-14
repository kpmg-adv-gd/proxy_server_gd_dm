const { callGet, callPatch, callPost } = require("../../../utility/CommonCallApi");
const { getZOrdersLinkByPlantProjectChildOrderChildMaterial, getZOrderLinkChildOrdersMultipleMaterial } = require("../../postgres-db/services/bom/library");
const { getModificheToDo, updateZModifyByOrder } = require("../../postgres-db/services/modifiche/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageCompleteSfcPhase(plant,project,order,orderMaterial,operation,resource,sfc,checkModificheLastOperation,valueModifica,checkMancantiLastOperation){
    if(checkMancantiLastOperation) await hasMancanti(plant,order);
    if(checkModificheLastOperation) await modificheHasDone(plant,sfc,order,valueModifica);
    let responseCompleteSfc = await completeSfc(plant,operation,resource,sfc);
    let statusCode = await getSfcStatus(plant,sfc);
    if(statusCode==="405") await manageMancantiCompleteSfc(plant,project,order,orderMaterial);
    return responseCompleteSfc;
}

async function modificheHasDone(plant,sfc,order,valueModifica){
    let responseHasModificheToDo = await getModificheToDo(plant,sfc,order);
    if(responseHasModificheToDo.length > 0 ){
        await addModificheToParent(plant,order,valueModifica,sfc,order);
    }

}

async function addModificheToParent(plant,order,valueModifica,sfcCompleted,orderCompleted){
    const { parentOrder } = await getBomByOrderAndPlant(plant,order);

    if(!parentOrder){
        let errorMessage = "Impossibile concludere l'SFC, sono presenti modifiche non applicate!";
        throw { status: 500, message: errorMessage};
    }
    const { parentSfc } = await getBomByOrderAndPlant(plant,parentOrder);
    const sfcStatusCode = await getSfcStatus(plant,parentSfc);
    
    if(sfcStatusCode!=="405"){ //Stato non Done (compleato)
        await updateZModifyByOrder(plant,parentSfc,parentOrder,sfcCompleted,orderCompleted);
        await updateCustomModificaOrder(plant,parentOrder,valueModifica);
    } else {
        await addModificheToParent(plant,parentOrder,valueModifica,sfcCompleted,orderCompleted);
    }

}

async function completeSfc(plant,operation,resource,sfc){
    var url = hostname+"/sfc/v1/sfcs/complete";
    var params = {
        "plant": plant,
        "operation":operation,
        "resource":resource,
        "sfcs": [sfc]
    };
    return await callPost(url,params);
}
async function getSfcStatus(plant,sfc){
    var url = hostname + "/sfc/v1/sfcdetail?plant="+plant+"&sfc="+sfc;
    let responseGetSfc = await callGet(url);
    return responseGetSfc?.status?.code;
}
async function manageMancantiCompleteSfc(plant,project,childOrder,childMaterial){
    let orderLinkRow = await getZOrdersLinkByPlantProjectChildOrderChildMaterial(plant,project,childOrder,childMaterial);
    let parentOrder = orderLinkRow.length > 0 ? orderLinkRow[0]?.parent_order : null;
    let parentMaterial = orderLinkRow.length > 0 ? orderLinkRow[0]?.parent_material : null;
    if(!!parentOrder){
        const { bom, type, isParentAssembly } = await getBomByOrderAndPlant(plant, parentOrder);
        var bomDetailBodyParentOrder = await getBomDetail(plant,bom,type);
        await updateBomComponentParentOrder(plant,parentOrder,parentMaterial,childOrder,childMaterial,bomDetailBodyParentOrder);
        //SE E' PARENT ASSEMBLY
        if(isParentAssembly){
            let grandParentLinkRow = await getZOrdersLinkByPlantProjectChildOrderChildMaterial(plant,project,parentOrder,parentMaterial);
            let grandParentOrder = grandParentLinkRow.length > 0 ? grandParentLinkRow[0]?.parent_order : null;
            let grandParentMaterial = grandParentLinkRow.length > 0 ? grandParentLinkRow[0]?.parent_material : null;
            const { bom, type, isParentAssembly } = await getBomByOrderAndPlant(plant, grandParentOrder);
            let bomDetailBodyGrandParentOrder = await getBomDetail(plant,bom,type);
            await updateBomComponentParentOrder(plant,grandParentOrder,grandParentMaterial,parentOrder,parentMaterial,bomDetailBodyGrandParentOrder);
        }
    }

    return;
}

async function getBomByOrderAndPlant(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    let customValuesOrder = orderResponse?.customValues;
    let isParentAssembly = customValuesOrder.some(obj => obj.attribute == "PARENT_ASSEMBLY" && (obj.value=="true" || obj.value=="X") );
    let parentOrderField = customValuesOrder.find(obj => obj.attribute == "ORDINE PADRE");
    let parentOrderValue = parentOrderField?.value || "";
    let sfc = orderResponse?.sfcs[0];
    return { bom: orderResponse?.bom?.bom, type: orderResponse?.bom?.type, isParentAssembly: isParentAssembly, parentSfc: sfc, parentOrder: parentOrderValue };
}

async function getBomDetail(plant,bom,type){
    var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom + "&type=" + type;
    var bomComponentsResponse = await callGet(url);
    return bomComponentsResponse;
}

async function updateBomComponentParentOrder(plant, parentOrder,parentMaterial, childOrder, childMaterial, bomDetailBodyParentOrder) {
    var url = hostname + "/bom/v1/boms";
    let componentFound = false;
    for(let obj of bomDetailBodyParentOrder[0]?.components){
        if (obj?.material && obj.material.plant === plant && obj.material.material === childMaterial) {
            for(let customValueObj of obj.customValues){
                if (!componentFound && customValueObj.attribute === "COMPONENTE MANCANTE" && customValueObj.value == "true" ) {
                    componentFound = true;
                    if(obj.quantity > 1){
                        let checkQuantityComponentResponse = await checkQuantityDoneComponent(obj.quantity,obj.material.plant,obj.material.material,parentOrder,childOrder);
                        if(checkQuantityComponentResponse){
                            customValueObj.value = "false";
                        }
                    } else {
                        customValueObj.value = "false";
                    }
                }
            }
        }
    }
    let responsePatch = await callPatch(url,bomDetailBodyParentOrder);
    let parentOrderMancanti = hasComponentMancante(bomDetailBodyParentOrder[0].components);
    if (!parentOrderMancanti) {
        await updateCustomMancanteOrder(plant, parentOrder, "false");
    }
    return responsePatch;
}
async function checkQuantityDoneComponent(quantity,plant,material,order,childOrder){
    let response = await getZOrderLinkChildOrdersMultipleMaterial(plant,order,material,childOrder);
    var allDone = false;
    if(response.length == quantity-1){
        allDone = true;
        for(let rowZOrderLink of response){
            let orderStatus = await getOrderStatus(rowZOrderLink.plant,rowZOrderLink.child_order);
            if(orderStatus!=="COMPLETED") allDone = false;
        }
    }
    return allDone;
}

async function updateCustomMancanteOrder(plant,order,value){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"MANCANTI",
        "value": value
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    let response = await callPatch(url,body);
}

async function updateCustomModificaOrder(plant,order,value){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"ECO_TYPE",
        "value": value
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    let response = await callPatch(url,body);
}

function hasComponentMancante(components) {
    return components.some(obj =>
        obj.customValues.some(cv =>
            cv.attribute === "COMPONENTE MANCANTE" && cv.value === "true"
        )
    );
}

async function getOrderStatus(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    const orderResponse = await callGet(url);
    return orderResponse?.executionStatus;
}

async function hasMancanti(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    let customValuesOrder = orderResponse?.customValues;
    let mancantiField = customValuesOrder.find(obj => obj.attribute == "MANCANTI");
    let mancantiValue = mancantiField?.value || "";
    if(mancantiValue=="true"){
        let errorMessage = "The sfc has mancanti. Impossible to complete it.";
        throw { status: 500, message: errorMessage};
    }
}

module.exports = { manageCompleteSfcPhase };