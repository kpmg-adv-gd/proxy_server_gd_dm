const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { insertZModifiche } = require("../../postgres-db/services/modifiche/library");
const { getZOrdersLinkByPlantProjectOrderType } = require("../../postgres-db/services/orders_link/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const orderCache = new Map();
const plantMappingCache = new Map();

async function manageNewModifiche(jsonModifiche) {

        for(let el of jsonModifiche?.MODIFICA){
            try{
                await manageModifica(el);
            } catch(e){
                console.error("manageModifica: "+JSON.stringify(el));
            }
            
        }
        orderCache.clear();
        plantMappingCache.clear();
        
        // PARALLELO

        //const promises = jsonModifiche?.MODIFICA.map(el => manageModifica(el));

        // // Esegui tutte le promesse in parallelo
        // const results = await Promise.allSettled(promises);
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
        //     let errorMessage = `Errori durante l'elaborazione manageNewModifiche from SAP: ${errors.join(" | ")}`;
        //     throw { status: 500, message: errorMessage};
        // }

        
}


async function manageModifica(objModifica){
    var plant = await getPlantFromERPPlant(objModifica?.Plant?.[0]);
    var order = objModifica?.Order?.[0] || "";
    var childOrder = objModifica?.ChildOrder?.[0] || "";
    var progEco = objModifica?.ProgEco?.[0] || "";
    var processId = objModifica?.ProcessId?.[0] || "";
    var wbe = objModifica?.Wbe?.[0] || "";
    var modificaType = objModifica?.Type?.[0] || "";
    var material = objModifica?.Material?.[0] || "";
    var childMaterial = objModifica?.ChildMaterial?.[0] || "";
    var qty = objModifica?.Qty?.[0] || "";
    var fluxType = objModifica?.FluxType?.[0] || "";
    var status = objModifica?.Status?.[0] || "";
    var isCO2 = await isOrderCO2(plant,order);

    if(isCO2){
        await manageCO2(progEco, processId, plant, wbe, modificaType, order, material, childOrder, childMaterial, qty, fluxType, status, isCO2);
        return;
    }

    var { podOrder, modificaValue, sfc } = await getPodOrder(plant,order) || "";
    var { bom, bomType, materialOrder, parentOrderValue,isParentAssembly} = await getOrderInfo(plant,podOrder);

    await insertZModifiche(progEco, processId, plant, wbe, modificaType, sfc, order, material, childOrder, childMaterial, qty, fluxType, status, false, isCO2)

    if(!modificaValue){
        modificaValue = modificaType;
    } else if(!modificaValue.split(',').includes(modificaType)) {
        modificaValue += ","+modificaType;
    }

    await updateCustomFieldModifiche(plant,podOrder,modificaValue);
    if(modificaType=="MT" || modificaType=="MA"){
        await checkOrCreateMaterial(plant,childMaterial);
        let bomComponentResponse = await getBomComponents(plant,order);
        await updateBomComponent(bomComponentResponse,plant,order,materialOrder,childMaterial,qty,fluxType,modificaType,parentOrderValue,isParentAssembly);
    }

    //Vado ad aggionrare il campo custom delle modifiche (ECO_TYPE) dell'ordine eliminato dalla bom se la modifica assieme con flux type D
    if(modificaType=="MA" && fluxType=="D"){
        await updateCustomFieldModifiche(plant,childOrder,"MA");
    }

}

async function getOrderFromApi(plant, order) {
    // const cacheKey = `${plant}_${order}`;

    // if (orderCache.has(cacheKey)) {
    //     return orderCache.get(cacheKey);
    // }

    const url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    const orderResponse = await callGet(url);

    //orderCache.set(cacheKey, orderResponse);
    return orderResponse;
}

async function isOrderCO2(plant,order){
    const orderResponse = await getOrderFromApi(plant, order);
    let isCO2Field = orderResponse?.customValues.find(obj => obj.attribute == "CO2");
    let isCO2 = isCO2Field && isCO2Field.value == "X";
    return isCO2;
}

async function getPodOrder(plant, order){
    const orderResponse = await getOrderFromApi(plant, order);

    var podOrder = order;
    var sfc = orderResponse?.sfcs[0] || "";
    var modificaField = orderResponse?.customValues.find(obj => obj.attribute == "ECO_TYPE");
    var modificaValue = modificaField?.value || "";

    const parentOrderField = orderResponse?.customValues.find(obj => obj.attribute == "ORDINE PADRE");
    const parentOrderValue = parentOrderField?.value || "";

    if (orderResponse.executionStatus == "COMPLETED" && parentOrderValue) {
        const parentOrderResult = await getPodOrder(plant, parentOrderValue);
        podOrder = parentOrderResult.podOrder;
        modificaValue = parentOrderResult.modificaValue;
        sfc = parentOrderResult.sfc;
    }

    return { podOrder, modificaValue, sfc };
}


async function getOrderInfo(plant, order){
    const orderResponse = await getOrderFromApi(plant, order);

    let parentOrderField = orderResponse?.customValues.find(obj => obj.attribute == "ORDINE PADRE");
    let parentOrderValue = parentOrderField?.value || "";
    let isParentAssembly = orderResponse?.customValues.some(obj => obj.attribute == "PARENT_ASSEMBLY" && (obj.value=="true" || obj.value=="X") );
    let material = orderResponse?.material?.material;
    let bom = orderResponse?.bom?.bom;
    let bomType = orderResponse?.bom?.type;
    return { bom , bomType, material, parentOrderValue, isParentAssembly };
}

async function updateCustomFieldModifiche(plant,order,modificaValue){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"ECO_TYPE",
        "value": modificaValue
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    await callPatch(url,body);
}
async function getBomComponents(plant,order){
    try{
        var orderResponse = await getOrderFromApi(plant,order);
        var urlBom = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + orderResponse?.bom?.bom + "&type=" + orderResponse?.bom?.type;
        var bomComponentsResponse = await callGet(urlBom);
        return bomComponentsResponse;
    } catch(error){
        let errorMessage = error.message || "Error service getBomComponents";
        throw { status: 500, message: errorMessage};
    }

}
async function updateBomComponent(bomComponentResponse,plant,order,orderMaterial,childMaterial,qty,fluxType,modificaType,parentOrderValue,isParentAssembly){
    if(fluxType=="I"){
        let lastSequenceComponent = bomComponentResponse[0].components.length ? bomComponentResponse[0].components[bomComponentResponse[0].components.length - 1].sequence : 0;
        let newComponent = {
            "sequence": lastSequenceComponent+10,
            "erpSequence": 0,
            "material": {
                "plant": plant,
                "material": childMaterial,
                "version": "1"
            },
            "quantity": qty,
            "customValues": [{
                "attribute":"FLUX_TYPE",
                "value": fluxType
            },
            {
                "attribute":"COMPONENTE MANCANTE",
                "value": modificaType=="MA"? "true":"false"
            }],
            "componentType": "NORMAL",
            "unitOfMeasure": "ST",
            "backflushEnabled": false,
            "totalQuantity": 1,
            "assemblyQuantityAsRequired": false,
            "alternatesEnabled": false
        };
        bomComponentResponse[0].components.push(newComponent);
    } else{
        for (const obj of bomComponentResponse[0].components) {
            if(obj?.material?.material == childMaterial){
                obj.customValues.push({
                    "attribute":"FLUX_TYPE",
                    "value": fluxType
                });
                if(fluxType=="M") obj.quantity = qty;
                //Gestione mancanti in caso di modifica di assieme per rimozione gruppo
                if(modificaType=="MA" && fluxType=="D"){
                    let mancantiField = obj.customValues.find(obj => obj.attribute == "COMPONENTE MANCANTE");
                    if(mancantiField?.value =="true"){
                        mancantiField.value = "false";
                        if(!hasComponentMancante(bomComponentResponse[0].components)){
                            await updateCustomMancanteOrder(plant,order,"false");
                            if(isParentAssembly){
                                let parentOrderBomResponse = await getBomComponents(plant,parentOrderValue);
                                parentOrderBomResponse = updateBodyBomComponentMaterial(plant,parentOrderBomResponse,orderMaterial,"false");
                                if(!hasComponentMancante(parentOrderBomResponse[0].components)) await updateCustomMancanteOrder(plant,parentOrderValue,"false");
                            }
                        } 
                    }
                }
            }
        }
    }
    var urlUpdateBom = hostname + "/bom/v1/boms";
    console.log("NEw Bom Component Update modifiche con il seguente body: "+bomComponentResponse);
    await callPatch(urlUpdateBom,bomComponentResponse);
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
    await callPatch(url,body);
}

function updateBodyBomComponentMaterial(plant,bomDetailBody,material,value){
    if(bomDetailBody.length == 0) return;
    for(let obj of bomDetailBody[0]?.components){
        if (obj?.material?.material == material && obj.material.plant === plant ) {
            for(let customValueObj of obj.customValues){
                if (customValueObj.attribute === "COMPONENTE MANCANTE") {
                    customValueObj.value = value;
                }
            }
        }
    }
    return bomDetailBody;
}

async function manageCO2(progEco, processId, plant, wbe, modificaType, order, material, childOrder, childMaterial, qty, fluxType, status, isCO2) {
    const orderResponse = await getOrderFromApi(plant, order);
    const executionStatus = orderResponse?.executionStatus;
    const baseSfc = orderResponse?.sfcs?.[0] || "";
    const materialOrder = orderResponse?.material?.material || "";
    const project = orderResponse?.customValues.find(obj => obj.attribute === "COMMESSA")?.value || "";

    if (executionStatus === "COMPLETED") {
        const linkedOrders = await getZOrdersLinkByPlantProjectOrderType(plant, project, "MACH");

        for (const el of linkedOrders) {
            const orderMach = el.child_order;
            const childOrderResponse = await getOrderFromApi(plant, orderMach);
            const sfc = childOrderResponse?.sfcs?.[0] || "";

            let modificaValue = childOrderResponse?.customValues?.find(obj => obj.attribute === "ECO_TYPE")?.value || "";

            // Insert modifica
            await insertZModifiche(
                progEco, processId, plant, wbe, modificaType, sfc,
                order, material, childOrder, childMaterial, qty, fluxType, status, false, isCO2
            );

            // Update modifica value
            if (!modificaValue) {
                modificaValue = modificaType;
            } else if (!modificaValue.split(',').includes(modificaType)) {
                modificaValue += "," + modificaType;
            }

            await updateCustomFieldModifiche(plant, orderMach, modificaValue);
        }

    } else {
        // SFC e modificaValue dell’ordine principale
        let modificaValue = orderResponse?.customValues?.find(obj => obj.attribute === "ECO_TYPE")?.value || "";

        // Insert modifica
        await insertZModifiche(
            progEco, processId, plant, wbe, modificaType, baseSfc,
            order, material, childOrder, childMaterial, qty, fluxType, status, false, isCO2
        );

        // Update modifica value
        if (!modificaValue) {
            modificaValue = modificaType;
        } else if (!modificaValue.split(',').includes(modificaType)) {
            modificaValue += "," + modificaType;
        }

        await updateCustomFieldModifiche(plant, order, modificaValue);
    }

    // Gestione BOM se necessario
    if (modificaType === "MT" || modificaType === "MA") {
        const bomComponentResponse = await getBomComponents(plant, order);
        await updateBomComponent(bomComponentResponse, plant, order, materialOrder, childMaterial, qty, fluxType, modificaType, "", false);
    }
}


function hasComponentMancante(components) {
    return components.some(obj =>
        obj.customValues.some(cv =>
            cv.attribute === "COMPONENTE MANCANTE" && cv.value === "true"
        )
    );
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

async function checkOrCreateMaterial(plant,childMaterial){
    const url = hostname + "/material/v1/materials?plant=" + plant + "&material=" + childMaterial;  
    try{
        var materialResponse = await callGet(url);
    } catch(error){
            //Creo il materiale se non esiste
            let bodyCreateMaterial={
                "description": childMaterial,
                "isAutocompleteAndConfirmed": true,
                "isCurrentVersion": true,
                "lotSize": 1,
                "material": childMaterial,
                "materialType": "FINISHED",
                "origin": "ME",
                "orderProcessingMode": "DEFAULT",
                "plant": plant,
                "procurementType": "MANUFACTURED_PURCHASED",
                "putawayStorageLocation": ".",
                "status": "RELEASABLE",
                "unitOfMeasure": "ST",
                "version": "1"
            };
            await callPatch(hostname + "/material/v1/materials",bodyCreateMaterial);
    }  
}


module.exports = { manageNewModifiche }


