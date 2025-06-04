const { callGet, callPatch } = require("../../../utility/CommonCallApi");

const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { updateZSpecialGroups, getZSpecialGroupsNotElbaoratedByWBS } = require("../../postgres-db/services/mancanti/library");
const { getZOrderLinkChildOrdersMultipleMaterial } = require("../../postgres-db/services/bom/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const plantMappingCache = new Map();

async function manageNewMancanti(jsonMancanti){

    await getOrderObjectsToElaborate(jsonMancanti);


    // PARALLELO    
    
    // let promisesOrderObjectsArray = await getOrderObjectsToElaborate(jsonMancanti);

    // // Esegui tutte le promesse in parallelo
    // const results = await Promise.allSettled(promisesOrderObjectsArray);
    // // Raccogliamo gli errori dalle promise fallite
    // const errors = results
    // .filter(result => result.status === "rejected")
    // .map(result => {
    //     // Prendo il messaggio di errore
    //     if (result.reason instanceof Error) {
    //         return result.reason.message;  // Se l'errore è un'istanza di Error, prendi il messaggio
    //     }
    //     return JSON.stringify(result.reason);  // Altrimenti lo converto in una stringa JSON
    // });
    // // Se ci sono errori, li uniamo e li restituiamo al chiamante
    // if (errors.length > 0) {
    //     let errorMessage = `Errori durante l'elaborazione manageNewMancanti from SAP: ${errors.join(" | ")}`;
    //     throw { status: 500, message: errorMessage};
    // }

    let projectsArray = jsonMancanti?.WBS.map( obj => obj?.Project);
    await manageSpecialGroups(projectsArray);
    plantMappingCache.clear();

}

// PARALLELO

// async function getOrderObjectsToElaborate(jsonMancanti) {
//     const orderObjectsPromises = [];

//     for (const wbs of jsonMancanti?.WBS || []) {

//         console.log("plantSharedMemory= "+plantSharedMemory);
//         var plantSharedMemoryJSON = JSON.parse(plantSharedMemory);
//         var plant = plantSharedMemoryJSON[wbs.Plant[0]];
//         const wbe = wbs?.WBSElement?.[0] || "";
//         const project = wbs?.Project?.[0] || "";

//         for (const order of wbs?.Order || []) {
//             const orderNumber = order?.OrderNumber?.[0] || "";
//             const materialsArray = order?.Material || [];
//             orderObjectsPromises.push(updateCustomFieldsOrderAndOrderComponent(plant, wbe, project, null, orderNumber, materialsArray,false));
//         }
//     }

//     return orderObjectsPromises;
// }


// SEQUENZA
async function getOrderObjectsToElaborate(jsonMancanti) {
    const orderObjectsPromises = [];

    for (const wbs of jsonMancanti?.WBS || []) {
        var erpPlant = wbs?.Plant?.[0] || "";
        var plant = await getPlantFromERPPlant(erpPlant);
        const wbe = wbs?.WBSElement?.[0] || "";
        const project = wbs?.Project?.[0] || "";

        for (const order of wbs?.Order || []) {
            const orderNumber = order?.OrderNumber?.[0] || "";
            const materialsArray = order?.Material || [];
            try{
                await updateCustomFieldsOrderAndOrderComponent(plant, wbe, project, null, orderNumber, materialsArray,false);
            } catch(e){
                console.error("Error updateCustomFieldsOrderAndOrderComponent: "+e);
            }
        }
    }

    return orderObjectsPromises;
}

async function updateCustomFieldsOrderAndOrderComponent(plant, wbe, project, child_order, orderNumber, materialsArray, doUpdateZSpecialGroupElaborated) {
    //Eseguo questa funzione per ogni ordine che mi arriva dall'xml/gruppo che ho nella Z_Special_groups
    const firstOrderData = await getBomByOrderAndPlant(plant, orderNumber); //Ottengo info sull'ordine
    const { bom, type, isParentAssembly, parentOrder, orderMaterial } = firstOrderData;
    const bomDetailBody = await getBomDetail(plant, bom, type); //Ottengo le info sulla bom dell'ordine

    //Aggiorno i campi custom di BOM Component con i mancancti dei materiali che mi arrivano dall'xml
    const updatedBomBody = await updateBodyBomComponentMaterials(parentOrder,orderNumber,bomDetailBody, materialsArray, plant, doUpdateZSpecialGroupElaborated); 
    await updateBomComponent(updatedBomBody);

    //Controllo che l'ordine non abbia più BOM Component mancanti ed in tal caso aggiorniamo il campo custom dell'ordine
    const orderHasMancanti = hasComponentMancante(bomDetailBody[0].components);
    await updateCustomMancanteOrder(plant, orderNumber, orderHasMancanti);

    //Se l'ordine parent assembly allora faccio quasi la stessa procedura sull'ordine padre
    var hasFoundParent = true;
    if (isParentAssembly) {
        const parentOrderData = await getBomByOrderAndPlant(plant, parentOrder);
        const parentBomDetailBody = await getBomDetail(plant, parentOrderData.bom, parentOrderData.type);

        //Aggiorno i campi custom dei BOM Component con i mancanti dei materiali che mi arrivano dall'xml
        const updatedParentBomBody = await updateBodyBomComponentMaterials(parentOrder,orderNumber,parentBomDetailBody, [{
            "Missing": [orderHasMancanti],
            "MissingMaterial": [firstOrderData.orderMaterial],
            "MissingQuantity": [""]
        }], plant, true);
        await updateBomComponent(updatedParentBomBody);
        const parentOrderHasMancanti = hasComponentMancante(parentBomDetailBody[0].components);
        await updateCustomMancanteOrder(plant, parentOrder, parentOrderHasMancanti);
        if(!parentOrderData.bom) hasFoundParent=false;
        //Nel caso in cui mi arriva un gruppo dal servizio dei mancanti Parent Assembly, allora sarà anche nella tabella speical groupo e vado ad aggiornarlo come elaborato
        await updateZSpecialGroups(plant, project, wbe, orderNumber, true);
    }

    if(!!firstOrderData.bom && hasFoundParent && doUpdateZSpecialGroupElaborated){
        await updateZSpecialGroups(plant, project, wbe, child_order, true);
    }
}


async function getBomByOrderAndPlant(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    let customValuesOrder = orderResponse?.customValues;
    let isParentAssembly = customValuesOrder.some(obj => obj.attribute == "PARENT_ASSEMBLY" && obj.value=="true");
    let parentOrderField = customValuesOrder.find(obj => obj.attribute == "ORDINE PADRE");
    let parentOrderValue = parentOrderField?.value || "";
    let orderMaterial = orderResponse?.material?.material;
    return { bom: orderResponse?.bom?.bom, type: orderResponse?.bom?.type, isParentAssembly: isParentAssembly, parentOrder: parentOrderValue, orderMaterial: orderMaterial  };
}

async function getBomDetail(plant,bom,type){
    var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom + "&type=" + type;
    var bomComponentsResponse = await callGet(url);
    return bomComponentsResponse;
}

async function updateBodyBomComponentMaterials(parentOrder,child_order,bomDetailBody,materialsArray,plant,checkMissingQuantityParentAssembly){
    if(bomDetailBody.length == 0) return;
    for(let obj of bomDetailBody[0]?.components){
        const foundMaterial = materialsArray.find(mat => mat?.MissingMaterial?.[0] === obj?.material?.material);
        var missingMaterial = foundMaterial?.Missing?.[0] == "X" ? "true" : "false";
        if (obj?.material && obj.material.plant === plant && foundMaterial ) {
            console.log("missingMaterial= "+missingMaterial);
            console.log("obj.quantity = "+obj.quantity );
            console.log("checkMissingQuantityParentAssembly= "+checkMissingQuantityParentAssembly);
            if(checkMissingQuantityParentAssembly && (missingMaterial=="false"||!missingMaterial) && obj.quantity > 1){
                let checkQuantityComponentResponse = await checkQuantityDoneComponent(obj.quantity,obj.material.plant,obj.material.material,parentOrder,child_order);
                console.log("checkQuantityComponentResponse= "+checkQuantityComponentResponse);
                missingMaterial = checkQuantityComponentResponse ? "false" : "true";
            }
            for(let customValueObj of obj.customValues){
                if (customValueObj.attribute === "COMPONENTE MANCANTE") {
                    customValueObj.value = missingMaterial || "false";
                }
            }
        }
    }
    return bomDetailBody;
}

async function updateBomComponent(body){
    var url = hostname + "/bom/v1/boms";
    let responsePatch = await callPatch(url,body);
    return;
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

function hasComponentMancante(components) {
    return components.some(obj =>
        obj.customValues.some(cv =>
            cv.attribute === "COMPONENTE MANCANTE" && (cv.value === "true" || cv.value === true)
        )
    ) ? "true":"false";
}
//Vado a vedere ed aggiornare il padre degli ordini MGF e parent assembly dato che non ci è arrivato UPDATE da SAP sui mancanti
async function manageSpecialGroups(projectsArray) {
    let mancantiNotElabroated = await getZSpecialGroupsNotElbaoratedByWBS(projectsArray);

    // SEQUENZIALE

    for(let el of mancantiNotElabroated){
        await updateCustomFieldsOrderAndOrderComponent(el.plant, el.wbe, el.project, el.order, el.parent_order, [{
            "Missing": [false],
            "MissingMaterial": [el.child_material],
            "MissingQuantity": [""]
        }],true); 
    }

    //PARALLELO

    // // Creiamo un array di Promesse
    // const updatePromises = mancantiNotElabroated.map(row => {
    //     return updateCustomFieldsOrderAndOrderComponent(row.plant, row.wbe, row.project, row.order, row.parent_order, [{
    //         "Missing": [false],
    //         "MissingMaterial": [row.child_material],
    //         "MissingQuantity": [""]
    //     }],true);
    // });
    // // Esegui tutte le promesse in parallelo
    // const results = await Promise.allSettled(updatePromises);


    // // Raccogliamo gli errori dalle promise fallite
    // const errors = results
    // .filter(result => result.status === "rejected")
    // .map(result => {
    //     // Prendo il messaggio di errore
    //     if (result.reason instanceof Error) {
    //         return result.reason.message;  // Se l'errore è un'istanza di Error, prendi il messaggio
    //     }
    //     return JSON.stringify(result.reason);  // Altrimenti lo converto in una stringa JSON
    // });
    // // Se ci sono errori, li uniamo e li restituiamo al chiamante
    // if (errors.length > 0) {
    //     let errorMessage = `Errori durante l'elaborazione manageSpecialGroups: ${errors.join(" | ")}`;
    //     throw { status: 500, message: errorMessage};
    // }
}

async function checkQuantityDoneComponent(quantity,plant,material,order,childOrder){
    let response = await getZOrderLinkChildOrdersMultipleMaterial(plant,order,material,childOrder);
    var allDone = false;
    if(response.length == quantity-1){
        allDone = true;
        for(let rowZOrderLink of response){
            console.log("rowZOrderLink.child_order= "+rowZOrderLink.child_order);
            let orderStatus = await getOrderStatusMancanti(rowZOrderLink.plant,rowZOrderLink.child_order);
            console.log("orderStatus= "+orderStatus);
            if(orderStatus!=="false") allDone = false;
        }
    }
    return allDone;
}

async function getOrderStatusMancanti(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    const orderResponse = await callGet(url);
    var output = "";

    let isParentAssembly = orderResponse?.customValues.some(obj => obj.attribute == "PARENT_ASSEMBLY" && obj.value=="true");
    if(isParentAssembly){
        let mancantiField = orderResponse?.customValues.find(obj => obj.attribute == "MANCANTI");
        let mancanti = mancantiField?.value || "";
        output=mancanti;
    } else{
        output=orderResponse?.executionStatus == "COMPLETED" ? "false" : "true";
    }
    
    return output;
}

async function getPlantFromERPPlant(erpPlant){
    if (plantMappingCache.has(erpPlant)) {
        return plantMappingCache.get(erpPlant);
    }

    var plantSharedMemory = await getZSharedMemoryData("ALL","MAPPING_PLANT_ERP_DM");
    var plantSharedMemoryJSON = JSON.parse(plantSharedMemory[0].value);

    Object.entries(plantSharedMemoryJSON).forEach(([key, value]) => {
        plantMappingCache.set(key, value);
    });

    return plantMappingCache.get(erpPlant) || "";

}

module.exports = { manageNewMancanti }
