const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { getPlantFromERPPlant } = require("../../../utility/MappingPlant");

const { updateZSpecialGroups, getZSpecialGroupsNotElbaoratedByWBS, upsertZReportMancanti } = require("../../postgres-db/services/mancanti/library");
const { getZOrderLinkChildOrdersMultipleMaterial } = require("../../postgres-db/services/bom/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const plantMappingCache = new Map();

async function manageNewMancanti(jsonMancanti){

    let projectsArray = jsonMancanti?.WBS.map( obj => obj?.Project);
    await manageSpecialGroups(projectsArray);
    
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
            const orderMaterial = order?.OrderMaterial?.[0] || "";
            const materialsArray = order?.Material || [];
            try{
                await updateCustomFieldsOrderAndOrderComponent(plant, wbe, project, null, orderNumber, materialsArray,false);
                await manageZReportMancanti(plant,project,wbe,orderNumber,orderMaterial,materialsArray);
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
    const orderHasMancanti = hasComponentMancante(updatedBomBody[0].components);
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
        const parentOrderHasMancanti = hasComponentMancante(updatedParentBomBody[0].components);
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
    let isParentAssembly = customValuesOrder.some(obj => obj.attribute == "PARENT_ASSEMBLY" && (obj.value=="true" || obj.value=="X"));
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
        var missingMaterial = ( foundMaterial?.Missing?.[0] == "X" || foundMaterial?.Missing?.[0] == "true" ) ? "true" : "false";
        if (obj?.material && obj.material.plant === plant && foundMaterial ) {
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
            cv.attribute === "COMPONENTE MANCANTE" && cv.value === "true"
        )
    ) ? "true":"false";
}
//Vado a vedere ed aggiornare il padre degli ordini MGF e parent assembly dato che non ci è arrivato UPDATE da SAP sui mancanti
async function manageSpecialGroups(projectsArray) {
    let mancantiNotElabroated = await getZSpecialGroupsNotElbaoratedByWBS(projectsArray);

    // SEQUENZIALE
    for(let el of mancantiNotElabroated){
        if(el.order == "REL_GR3"){
            console.log("TROVATO IN SPECIAL GROUP REL_GR3. iL VALORE DI ELABORTED E'"+el.elaborated);
        }
        try{
            await updateCustomFieldsOrderAndOrderComponent(el.plant, el.wbe, el.project, el.order, el.parent_order, [{
                "Missing": [false],
                "MissingMaterial": [el.child_material],
                "MissingQuantity": [""]
            }],true);
        } catch(e){
            console.log("updateCustomFieldsOrderAndOrderComponent error - "+e);
        }
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

    let isParentAssembly = orderResponse?.customValues.some(obj => obj.attribute == "PARENT_ASSEMBLY" && (obj.value=="true" || obj.value=="X") );
    if(isParentAssembly){
        let mancantiField = orderResponse?.customValues.find(obj => obj.attribute == "MANCANTI");
        let mancanti = mancantiField?.value || "";
        output=mancanti;
    } else{
        output=orderResponse?.executionStatus == "COMPLETED" ? "false" : "true";
    }
    
    return output;
}

async function manageZReportMancanti(plant,project,wbe,orderNumber,orderMaterial,materialsArray){
    for(let mat of materialsArray){
        let isMissing = mat?.Missing?.[0] == "X" || mat?.Missing?.[0] == "true";
        let missing_material = mat?.MissingMaterial?.[0] || "";
        let missing_quantity = mat?.MissingQuantity?.[0] || "";
        let receipt_expected_date = mat?.ReceiptExpectedDate?.[0] || "";
        let first_conf_date = mat?.FirstConfDate?.[0] || "";
        let mrp_date = mat?.MrpDate?.[0] || "";
        let date_from_workshop = mat?.DateFromWorkShop?.[0] || "";
        let cover_element = mat?.CoverElement?.[0] || "";
        let storage_location = mat?.StorageLocation?.[0] || "";
        let component_order = mat?.ComponentOrder?.[0] || "";
        await upsertZReportMancanti(plant,project,wbe,orderNumber,orderMaterial,missing_material,missing_quantity,receipt_expected_date,first_conf_date,mrp_date,date_from_workshop,cover_element,storage_location,component_order,isMissing);
    }
}
module.exports = { manageNewMancanti }
