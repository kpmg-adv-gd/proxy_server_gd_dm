var { callPost } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
var { getWorkcenterDmByPlantGdAndWorkCenterErp } = require("../../postgres-db/services/loipro/library");
var credentials = JSON.parse(process.env.CREDENTIALS);
var hostname = credentials.DM_API_URL;
var xpath = require("xpath");


async function managePostXSLTPhase(docXml){
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0]?.textContent : null;
    var isMachNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='IsMach']", docXml);
    var isMachvalue = isMachNode.length > 0 ? isMachNode[0]?.textContent : null;
    var orderTypeNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrderType']", docXml);
    var orderTypeValue = orderTypeNode.length > 0 ? orderTypeNode[0]?.textContent : null;
    var parentAssemblyNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='CustomFieldList']/*[local-name()='CustomField'][*[local-name()='Attribute' and text()='PARENT_ASSEMBLY']]/*[local-name()='Value']", docXml);
    var parentAssemblyValueFromSAP = parentAssemblyNode.length > 0 ? parentAssemblyNode[0]?.textContent : null;
    var parentAssemblyValue = parentAssemblyValueFromSAP === "X";
    if(parentAssemblyValue || orderTypeValue=="ZMGF"){
        docXml = manageDummyOrders(docXml);
    } else {
        docXml = await manageWorkCenters(docXml);
    }
    await manageMaterials(docXml,plantValue,isMachvalue);
    return docXml;
}

function manageDummyOrders(docXml){
    var orderIdNode = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='MfgOrderNodeID']", docXml);
    var orderIntBillOfOperationsItemNode = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='OrderIntBillOfOperationsItem']", docXml);
    var manufacturingOrderOperationNode = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='ManufacturingOrderOperation']", docXml);
    var orderOperationNode = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='ManufacturingOrderMESReference']/*[local-name()='MESOperation']", docXml);
    var orderOperationDescriptionNode = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='MfgOrderOperationText']", docXml);
    var workCenterOperation = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='WorkCenter']", docXml);
    if(orderIdNode.length>0) orderIdNode[0].textContent = "OP0020" || "";
    if(orderIntBillOfOperationsItemNode.length>0) orderIntBillOfOperationsItemNode[0].textContent = "OP0020" || "";
    if(manufacturingOrderOperationNode.length>0) manufacturingOrderOperationNode[0].textContent = "0020" || "";
    if(orderOperationNode.length>0) orderOperationNode[0].textContent = "DUMMY_OPERATION" || "";
    if(orderOperationDescriptionNode.length>0) orderOperationDescriptionNode[0].textContent = "DUMMY_OPERATION_DESCRIPTION" || "";
    if(workCenterOperation.length>0) workCenterOperation[0].textContent = "DUMMY_WORKCENTER" || "";
    return docXml;
}

async function manageMaterials(docXml,plant,isMach){
    var materials = getMaterials(docXml);
    await createAllMaterials(materials,plant,isMach);
}

async function manageWorkCenters(docXml) {
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0]?.textContent : null;
    var workCenterErpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='WorkCenter']", docXml);

    // Creiamo un array di promesse
    const updatePromises = workCenterErpNodes.map(async (node) => {
        const oldWorkCenterErpValue = node.textContent;
        const newWorkCenterDmValue = await getWorkCenterDmValueByErp(oldWorkCenterErpValue, plantValue);
        
        if (newWorkCenterDmValue) {
            node.textContent = newWorkCenterDmValue; // Aggiorna il valore nel nodo XML
        }

    });

    await Promise.all(updatePromises); // Aspetta tutte le chiamate API prima di restituire docXml

    return docXml; // Ora è aggiornato correttamente
}

async function getWorkCenterDmValueByErp(oldWorkCenterErpValue, plantValue){
    let response = await getWorkcenterDmByPlantGdAndWorkCenterErp(oldWorkCenterErpValue, plantValue);
    return response.length>0?response[0].workcenter_dm:null;
}


function getMaterials(docXml){
    // Usa XPath per trovare il Material sotto ManufacturingOrder - //*: Seleziona tutti gli elementi del documento XML, indipendentemente dal loro livello di annidamento, ma senza preoccuparsi del prefisso di namespace
    //[local-name()='ManufacturingOrder']: Questo filtro specifica che vogliamo selezionare solo gli elementi il cui nome locale (senza considerare il namespace) è 'ManufacturingOrder'
    ///*: Una volta trovato l'elemento <ManufacturingOrder>, il /* seleziona tutti gli elementi figli di <ManufacturingOrder>. In altre parole, stiamo cercando di selezionare tutti i nodi che sono figli diretti di <ManufacturingOrder>, senza preoccuparci del loro nome o namespace
    var materialNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='Material']", docXml);
    var materialValue = materialNode.length > 0 ? materialNode[0]?.textContent : null;
    var materialDescNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='MaterialDescription']", docXml);
    var materialDescValue = materialDescNode.length > 0 ? materialDescNode[0]?.textContent : null;
    var materiaUoMNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='MaterialUoM']", docXml);
    var materiaUoMValue = materiaUoMNode.length > 0 ? materiaUoMNode[0]?.textContent : null;

    // Seleziona tutti i nodi ManufacturingOrderComponent
    var manufacturingOrderBOMComponents = xpath.select("//*[local-name()='ManufacturingOrderComponent']", docXml);

    // Crea un array per raccogliere tutte le triple di Material, MaterialDescription, MaterialUoM
    const allMaterialsSet = new Set();
    const allMaterials = [];
    //Metto tutti i materiali all'interno di allMaterials. Prima il materiale dell'ordine
    if(!!materialValue){
        allMaterialsSet.add(materialValue);
        allMaterials.push({materialValue,materialDescValue,materiaUoMValue});
    }
    // Poi i Material della BOM - Itera su ogni ManufacturingOrderComponent
    manufacturingOrderBOMComponents.forEach((component) => {
        // Seleziona tutti i nodi Material all'interno di questo ManufacturingOrderComponent
        var materialNode = xpath.select("*[local-name()='Material']", component);
        var materialValue = materialNode.length > 0 ? materialNode[0]?.textContent : null;
        var materialDescNode = xpath.select("*[local-name()='MaterialDescription']", component);
        var materialDescValue = materialDescNode.length > 0 ? materialDescNode[0]?.textContent : null;
        var materiaUoMNode = xpath.select("*[local-name()='MaterialUoM']", component);
        var materiaUoMValue = materiaUoMNode.length > 0 ? materiaUoMNode[0]?.textContent : null;

        if(materialValue && materialValue!=="" && !allMaterialsSet.has(materialValue)){
            allMaterialsSet.add(materialValue);
            allMaterials.push({materialValue,materialDescValue,materiaUoMValue})
        }
        
    });
    return allMaterials;
}

async function createAllMaterials(materialsArray,plant,isMach){
        // Mappa l'array in un array di promesse
        var apiCalls = materialsArray.map((material) => createMaterial(material,plant,isMach));
        // Aspetta che tutte le promesse vengano risolte
        const results = await Promise.allSettled(apiCalls);
        // Raccogliamo gli errori dalle promise fallite
        const errors = results
        .filter(result => result.status === "rejected")
        .map(result => {
            // Prendo il messaggio di errore
            if (result.reason instanceof Error) {
                return result.reason.message;  // Se l'errore è un'istanza di Error, prendi il messaggio
            }
            return JSON.stringify(result.reason);  // Altrimenti lo converto in una stringa JSON
        });

        // Se ci sono errori, li uniamo e li restituiamo al chiamante
        if (errors.length > 0) {
            let errorMessage = `Errori durante l'elaborazione createAllMaterials: ${errors.join(" | ")}`;
            throw { status: 500, message: errorMessage};
        }
}

async function createMaterial(material,plant,isMach){
    // if(material?.materialValue) material.materialValue += "_1404_3";
    const mockReq = {
        path: "/mdo/MATERIAL",
        query:  { $apply: "filter(PLANT eq '"+plant+"' and MATERIAL eq '"+material?.materialValue+"' and IS_CURRENT_VERSION eq 'true')"},
        method: "GET"
    };
    var resultMDOMaterial = await dispatch(mockReq);
    //se il materiale esiste già non lo creo
    if(resultMDOMaterial?.data?.value && resultMDOMaterial?.data?.value.length>0) return;

    var url = hostname+"/material/v1/materials"; // URL dell'API
    var body = [
        {
            "assemblyDataType": {
                "category": "ASSEMBLY",
                "dataType": "NONE"
            },
            "description": material?.materialDescValue == "" ? material?.materialValue : material?.materialDescValue,
            "isAutocompleteAndConfirmed": true,
            "isCurrentVersion": true,
            "lotSize": 1,
            "material": material?.materialValue,
            "materialType": isMach=="MACH"?"FINISHED":"SEMIFINISHED_PRODUCT",
            "origin": "ME",
            "orderProcessingMode": "DEFAULT",
            "plant": plant,
            "procurementType": "MANUFACTURED_PURCHASED",
            "putawayStorageLocation": ".",
            "removalComponentDataType": {
                "category": "ASSEMBLY",
                "dataType": "NONE"
            },
            "status": "RELEASABLE",
            "unitOfMeasure": material?.materiaUoMValue,
            "version": "1",
            "createdDateTime": new Date(),
            "modifiedDateTime":  new Date()
        }
    ];

    try{
        await callPost(url,body);
    } catch(e){
        console.log("Error create material: "+e);
    }

}

module.exports = { managePostXSLTPhase };




