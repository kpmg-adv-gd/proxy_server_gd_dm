const { json } = require("express");
const { dispatch } = require("../../mdo/library");
const { callGet, callPut, callPost } = require("../../../utility/CommonCallApi");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
var { getWorkcenterDmByPlantGdAndWorkCenterErp } = require("../../postgres-db/services/loipro/library");
const { insertZVerbaleLev2, insertZVerbaleLev3 } = require("../../postgres-db/services/verbali/library");
const { insertMarkingTesting } = require("../../postgres-db/services/marking_testing/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const plantMappingCache = new Map();
var operazioniWithID = [];

async function manageNewOrderTesting(jsonOrderTesting) {
    // 1. Controllo esistenza, ed eventualmente creazione, per ogni operazione di livello 1
    var plant = await getPlantFromERPPlant(jsonOrderTesting.plant);
    var resultOperations = await createOperations(plant, jsonOrderTesting); 
    if (!resultOperations) return { result: false, message: "Error creating operations" };
    // 2. Creazione del materiale dell'ordine di testing
    var resultMaterial = await createMaterial(plant, jsonOrderTesting);
    if (!resultMaterial) return { result: false, message: "Error creating materials" };
    // 3. Creazione del materiale per ogni Machine Type (componenti BOM)
    var resultComponentBOM = await createComponentBOM(plant, jsonOrderTesting);
    if (!resultComponentBOM) return { result: false, message: "Error creating materials" };
    // 4. Check WorkCenter DM value
    for (var i=0; i<jsonOrderTesting.level1.length; i++) {
        var level1 = jsonOrderTesting.level1[i];
        var workCenterDmValue = await getWorkCenterDmValueByErp(level1.workCenterERP, plant);
        if(!workCenterDmValue){
            return { result: false, message: `WorkCenter DM value not found for WorkCenter ERP: ${level1.workCenterERP} and Plant: ${plant}` };
        }
    }
    // 5. Creazione dell'ordine
    var resultOrder = await createOrder(plant, jsonOrderTesting);
    if (!resultOrder) return { result: false, message: "Error creation order" };
    // 6. Aggiornamento del routing - spostato nella tile supervisore
    //var resultUpdateRouting = await updateRouting(plant, jsonOrderTesting);
    //if (!resultUpdateRouting) return { result: false, message: "Error updating routing" };
    // 7. Compilazione z_verbale_lev2
    var resultSaveZVerbale2 = await saveZVerbale2(plant, jsonOrderTesting, workCenterDmValue);
    if (!resultSaveZVerbale2) return { result: false, message: "Error saving z_verbale_lev2" };
    // 8. Compilazione z_verbale_lev3
    var resultSaveZVerbale3 = await saveZVerbale3(plant, jsonOrderTesting);
    if (!resultSaveZVerbale3) return { result: false, message: "Error saving z_verbale_lev3" };
    // 9. Compilazione z_marking_testing
    var resultSavMarkingTesting = await saveZMarkingTesting(plant, jsonOrderTesting);
    if (!resultSavMarkingTesting) return { result: false, message: "Error saving z_marking_testing" };

    // Tutto ok!
    return { result: true, message: "Order Testing managed successfully" };    
}

// Fase 1: Creazione operazioni di livello 1
async function createOperations(plant, jsonOrderTesting) {
    var newOperations = [];
    // ciclo le operazioni di livello 1
    for (var i = 0; i < jsonOrderTesting.level1.length; i++) {
        const operation = jsonOrderTesting.level1[i];
        if (operation.areaRelevance == "M") {
            console.log("Skipping operation creation for area relevance M: "+operation.operationActivity);
            continue; 
        }   
        const mockReq = {
            path: "/mdo/OPERATION_ACTIVITY",
            query:  { $apply: "filter(PLANT eq '"+plant+"' and OPERATION_ACTIVITY eq '"+operation.operationActivity+"' and CURRENT_VERSION eq 'true' and STATUS eq 'RELEASABLE')"},
            method: "GET"
        };
        var resultMDOOperation = await dispatch(mockReq);
        //se operation esiste già non lo creo
        if(resultMDOOperation?.data?.value && resultMDOOperation?.data?.value.length>0){
            console.log("Operation found in MDO= "+JSON.stringify(resultMDOOperation?.data?.value));
        } else {
            // aggiungo l'operazione
            var params = {
                "plant": plant,
                "operation": operation.operationActivity,
                "version": "1",
                "resourceType": { "resourceType": "DEFAULT" },
                "type": "NORMAL_OPERATION",
                "description": operation.operationActivityDescription,
                "currentVersion": true,
                "status": "RELEASABLE",
                "requiredTimeInProcess": 0
            };
            newOperations.push(params);
        }
    }
    // Chiamata per creare le nuove operazioni
    try {
        if(newOperations.length>0){
            var url = hostname+"/operationActivity/v1/operationActivities";
            await callPost(url, newOperations);
            return true;
        }else{
            return true;
        }
    } catch (error) {
        console.error("Error creating new testing operations:", error.message || error);
        return false;
    }
}

// Fase 2: Creazione materiale ordine di testing
async function createMaterial(plant, jsonOrderTesting) {
    // Il materiale è dato dalla concatenazione dei machineType di ogni livello 1
    var materials = [];
    for (var i = 0; i < jsonOrderTesting.level1.length; i++) {
        const level1 = jsonOrderTesting.level1[i];
        for (var j = 0; j < level1.level2.length; j++) {
            const level2 = level1.level2[j];
            if (!materials.includes(level2.machineType)) materials.push(level2.machineType);
        }
    }
    var materialName = materials.join("_");
    const mockReq = {
        path: "/mdo/MATERIAL",
        query:  { $apply: "filter(PLANT eq '"+plant+"' and MATERIAL eq '"+materialName+"' and IS_CURRENT_VERSION eq 'true' and IS_DELETED eq 'false')"},
        method: "GET"
    };
    var resultMDOMaterial = await dispatch(mockReq);
    //se il materiale esiste già non lo creo
    if(resultMDOMaterial?.data?.value && resultMDOMaterial?.data?.value.length>0){
        console.log("Materiale Trovato in MDO= "+JSON.stringify(resultMDOMaterial?.data?.value));
        return true;
    } 
    var url = hostname+"/material/v1/materials"; // URL dell'API
    var body = [
        {
            "description": materialName,
            "isAutocompleteAndConfirmed": true,
            "isCurrentVersion": true,
            "lotSize": 1,
            "material": materialName,
            "materialType": "FINISHED",
            "origin": "ME",
            "orderProcessingMode": "DEFAULT",
            "plant": plant,
            "procurementType": "MANUFACTURED_PURCHASED",
            "putawayStorageLocation": ".",
            "status": "RELEASABLE",
            "unitOfMeasure": "ST",
            "version": "1",
            "createdDateTime": new Date(),
            "modifiedDateTime":  new Date()
        }
    ];
    try{
        console.log("Creating material with body: "+JSON.stringify(body));
        await callPost(url,body);
        return true;
    } catch(e){
        console.error("Error creazione materiale (fase 2):", e.message || e);
        return false;
    }
}

// Fase 3: Creazione componenti BOM
async function createComponentBOM(plant, jsonOrderTesting) {
    // Creo ogni materiale
    var materials = [];
    for (var i = 0; i < jsonOrderTesting.level1.length; i++) {
        const level1 = jsonOrderTesting.level1[i];
        for (var j = 0; j < level1.level2.length; j++) {
            const level2 = level1.level2[j];
            if (!materials.includes(level2.machineType)) materials.push(level2.machineType);
        }
    }
    for (var i=0; i<materials.length; i++) {
        var materialName = materials[i];
        const mockReq = {
            path: "/mdo/MATERIAL",
            query:  { $apply: "filter(PLANT eq '"+plant+"' and MATERIAL eq '"+materialName+"' and IS_CURRENT_VERSION eq 'true' and IS_DELETED eq 'false')"},
            method: "GET"
        };
        var resultMDOMaterial = await dispatch(mockReq);
        //se il materiale esiste già non lo creo
        if(resultMDOMaterial?.data?.value && resultMDOMaterial?.data?.value.length>0){
            console.log("Materiale Trovato in MDO= "+JSON.stringify(resultMDOMaterial?.data?.value));
            continue;
        } 
        var url = hostname+"/material/v1/materials"; // URL dell'API
        var body = [
            {
                "description": materialName,
                "isAutocompleteAndConfirmed": true,
                "isCurrentVersion": true,
                "lotSize": 1,
                "material": materialName,
                "materialType": "FINISHED",
                "origin": "ME",
                "orderProcessingMode": "DEFAULT",
                "plant": plant,
                "procurementType": "MANUFACTURED_PURCHASED",
                "putawayStorageLocation": ".",
                "status": "RELEASABLE",
                "unitOfMeasure": "ST",
                "version": "1",
                "createdDateTime": new Date(),
                "modifiedDateTime":  new Date()
            }
        ];
        try{
            console.log("Creating material with body: "+JSON.stringify(body));
            await callPost(url,body);
        } catch(e){
            console.error("Error creazione materiale (fase 3):", e.message || e);
        }
    }
    return true;
}

// Fase 4: Check workCenter DM value
async function getWorkCenterDmValueByErp(oldWorkCenterErpValue, plantValue){
    let response = await getWorkcenterDmByPlantGdAndWorkCenterErp(oldWorkCenterErpValue, plantValue);
    return response.length>0?response[0].workcenter_dm:null;
}

// Fase 5: Creazione ordine di testing
async function createOrder(plant, jsonOrderTesting) {
    // Il materiale è dato dalla concatenazione dei machineType di ogni livello 1
    var materials = [], componentBoms = [], routingOperationGroups = [], routingSteps = [];
    var sequenceOperation = 20;
    for (var i = 0; i < jsonOrderTesting.level1.length; i++) {
        const level1 = jsonOrderTesting.level1[i];
        if (level1.areaRelevance == "M") continue;
        operazioniWithID.push({ operationActivity: level1.operationActivity, stepId: String(sequenceOperation) });
        routingOperationGroups.push({
            "routingOperationGroup": level1.operationActivity,
            "operationNumber": sequenceOperation,
            "routingStepIds": [String(sequenceOperation)]
        });
        routingSteps.push({
            "stepId": String(sequenceOperation),
            "description": level1.operationActivityDescription,
            "workCenter": await getWorkCenterDmValueByErp(level1.workCenterERP, plant),
            "erpSequence": 1,
            "entry": true,
            "lastReportingStep": false,
            "routingOperation": {
                "operationActivity": {
                    "operationActivity": level1.operationActivity,
                    "version": "1"
                }
            },
            "customValues": [
                { "attribute": "DURATION", "value": "" },
                { "attribute": "WORK_CENTER_ERP", "value": level1.workCenterERP },
                { "attribute": "CONFIRMATION_NUMBER", "value": level1.confirmationNumber },
                { "attribute": "DATE", "value": level1.date }
            ]
        });
        sequenceOperation += 10;
        var sequenceMachineType = 10;
        for (var j = 0; j < level1.level2.length; j++) {
            var level2 = level1.level2[j];
            if (!materials.includes(level2.machineType)) {
                materials.push(level2.machineType);
                componentBoms.push({
                    "material": level2.machineType,
                    "sequence": sequenceMachineType,
                    "erpSequence": 0,
                    "componentType": "NORMAL",
                    "totalQuantityInBaseUnit": 1,
                    "baseUnit": "ST"
                });
                sequenceMachineType += 10;
            }
        }
    }
    var materialName = materials.join("_");
    var url = hostname+"/order/v1/orders"; 
    var body = {
        "orderNumber": jsonOrderTesting.idOrdine,
        "plant": plant,
        "orderCategory": "PRODUCTION_ORDER",
        "material": materialName,
        "status": "RELEASABLE",
	    "plannedQuantityInBaseUnit": 1,
        "plannedStart": new Date(),
        "plannedEnd": new Date(),
	    "baseUnit": "ST",
        "customValues": [
            { "attribute": "COMMESSA", "value": jsonOrderTesting.wbs },
            { "attribute": "MANCANTI", "value": false},
            { "attribute": "DEFECTS", "value": false },
            { "attribute": "CO_PREV", "value": jsonOrderTesting.coPrev },
            { "attribute": "CUSTOMER", "value": jsonOrderTesting.customer },
            { "attribute": "PHASE", "value": "TESTING" },
        ],
        "bom": {
            "bom": jsonOrderTesting.idOrdine,
            "description": jsonOrderTesting.idOrdine,
            "components": componentBoms
        },
        "routing": {
            "routing":  jsonOrderTesting.idOrdine,
            "routingType": "SHOP_ORDER",
            "description": jsonOrderTesting.idOrdine,
            "entryRoutingStepId": "0010",
            "routingOperationGroups": routingOperationGroups, 
            "routingSteps": routingSteps
        }
    }
    try{
        console.log("Creating order with body: "+JSON.stringify(body));
        await callPost(url,body);
        return true;
    } catch(e){
        console.error("Error creation order:", e.message || e);
        return false;
    }
}

// Fase 6: Aggiornamento routing
async function updateRouting(plant, jsonOrderTesting) {
    try {
        var responseGetRouting = await getRoutingResponse(jsonOrderTesting.idOrdine,plant);        
        var routing = responseGetRouting[0];
        
        //Mantengo lo status RELEASABLE
        routing.status = "RELEASABLE";
        //Il campo entryRoutingStepId deve essere 10
        routing.entryRoutingStepId="10";
        
        // Aggiungo i routing step identificativi del simultaneous
        var stepIdOpNodes = [], stepId = 20, sequence = 0;
        for (var i = 0; i < jsonOrderTesting.level1.length; i++) {
            stepIdOpNodes.push({
                "routingStep": {
                    "stepId": String(stepId)
                },
                "sequence": sequence
            });
            stepId += 10;
            sequence += 1;
        }
        
        var firstSimultaneousRoutingStep = {
            "stepId": "10",
            "sequence": 10,
            "description": "Simultaneous Group",
            "entry": true,
            "routingStepGroup": {
                "routingStep": {
                    "stepId": "10"
                },
                "routingStepGroupType": "SIMULTANEOUS_ORDER_GROUP",
                "routingStepGroupStepList": stepIdOpNodes
            },
            "lastReportingStep": false,
            "rework": false,
            "queueDecisionType": "COMPLETING_OPERATOR",
            "routingStepComponentList": []
        };
        
        //Setto a false il campo entry per tutti i routing steps originali
        routing.routingSteps.forEach(step => {
            step.entry = false;
            delete step.nextStepList;
        });
        
        //Elimino nextStepList anche dai routingOperationGroups
        if (routing.routingOperationGroups) {
            routing.routingOperationGroups.forEach(group => {
                if (group.routingOperationGroupSteps) {
                    group.routingOperationGroupSteps.forEach(groupStep => {
                        if (groupStep.routingStep) {
                            delete groupStep.routingStep.nextStepList;
                            groupStep.routingStep.entry = false;
                        }
                    });
                }
            });
        }
        
        //Lo aggiungo in routingSteps all'inizio
        routing.routingSteps.unshift(firstSimultaneousRoutingStep);

        await updateRoutingSimultaneous([routing]);
        return true;
    } catch (error) {
        console.error("Error updating routing:", error.message || error);
        return false;
    }
}

// Fase 7: Salvataggio z_verbale_lev_2
async function saveZVerbale2(plant, jsonOrderTesting, workCenterDmValue) {
    var result = true;
    for (var i=0; i<jsonOrderTesting.level1.length; i++) {
        var level1 = jsonOrderTesting.level1[i];
        if (level1.areaRelevance == "M") continue;
        for (var j=0; j<level1.level2.length; j++) {
            var level2 = level1.level2[j];
            var res = await insertZVerbaleLev2(jsonOrderTesting.idOrdine, operazioniWithID.filter(op => op.operationActivity === level1.operationActivity)[0].stepId, level2.level2Description, level2.idLevel2, level2.machineType, level2.safety, level2.timeLevel2, "HCN", workCenterDmValue, plant, true, level2.priority, level2.wbe);    
            if (!res) result = false;
        }
    }
    return result;
}

// Fase 8: Salvataggio z_verbale_lev_3
async function saveZVerbale3(plant, jsonOrderTesting) {
    var result = true;
    for (var i=0; i<jsonOrderTesting.level1.length; i++) {
        var level1 = jsonOrderTesting.level1[i];
        if (level1.areaRelevance == "M") continue;
        for (var j=0; j<level1.level2.length; j++) {
            var level2 = level1.level2[j];
            for (var k=0; k<level2.level3.length; k++) {
                var level3 = level2.level3[k];
                var res = await insertZVerbaleLev3(jsonOrderTesting.idOrdine, operazioniWithID.filter(op => op.operationActivity === level1.operationActivity)[0].stepId, level2.idLevel2, level3.idLevel3, level3.level3Description, level2.machineType, plant);    
                if (!res) result = false;
            }
        }
    }
    return result;
}

// Fase 9: Salvataggio z_marking_testing
async function saveZMarkingTesting(plant, jsonOrderTesting) {
    var result = true;
    for (var i=0; i<jsonOrderTesting.level1.length; i++) {
        var level1 = jsonOrderTesting.level1[i];
        // sommo timeLevel2
        var plannedLabor = 0;
        for (var j = 0; j < level1.level2.length; j++) {
            var level2 = level1.level2[j];
            plannedLabor += level2.timeLevel2;
        }
        var res = await insertMarkingTesting(plant, jsonOrderTesting.wbs, level1.network, jsonOrderTesting.idOrdine, level1.idActivity, level1.operationActivity, level1.confirmationNumber, plannedLabor, "HCN", level1.varianceLabor, level1.uomVariance, level1.areaRelevance);
        if (!res) result = false;
    }
    return result;
}

// Utilities
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
// Ottenere il routing
async function getRoutingResponse(routing, plant) {
    return new Promise((resolve, reject) => {
        var url = hostname + "/routing/v1/routings?type=SHOP_ORDER&plant=" + encodeURIComponent(plant) + "&routing=" + encodeURIComponent(routing); // + "&version=ERP001"; 
        
        setTimeout(() => {
            callGet(url).then(response => {
                resolve(response); // Restituisci la risposta quando la chiamata è completa
            }).catch(error => {
                console.error("Errore nella chiamata:", error);
                reject(error); // Rifiuta la Promise in caso di errore
            });
        }, 8000); // Pausa di 3 secondi
    });
}
// Update routing simultaneous
async function updateRoutingSimultaneous(bodyUpdateRouting){
    let url = hostname + "/routing/v1/routings";
    let response = await callPut(url,bodyUpdateRouting);
    console.log("UPDATE ROUTING: "+response);
    return response;
}

module.exports = { manageNewOrderTesting }