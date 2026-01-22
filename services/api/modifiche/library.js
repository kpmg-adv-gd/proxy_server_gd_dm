const { callPost, callGet } = require("../../../utility/CommonCallApi");
const { updateStatusModifica, updateStatusModificaMA, getModificheTestingByOrders } = require("../../postgres-db/services/modifiche/library");
const { getErpPlantFromDMPlant } = require("../../../utility/MappingPlant");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { dispatch } = require("../../mdo/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,objOrder,item,resolution,startDate,endDate){
    var pathModificaProductionProcess = await getZSharedMemoryData(plant,"SEND_MODIFICHE_SAP_PRODUCTION_PROCESS");
    if(pathModificaProductionProcess.length>0) pathModificaProductionProcess = pathModificaProductionProcess[0].value;
    var url = hostname + pathModificaProductionProcess;
    objOrder = objOrder.replace(/^0+/, '');
    var plantErp = await getErpPlantFromDMPlant(plant);

    var body = {
                "PROGRECO": prog_eco,
                "PROCESSID": process_id,
                "PLANT": plantErp,
                "WBE": wbe,
                "TYPE": type,
                "STATUS": newStatus,
                "RESOLUTION": resolution,
                "OBJ_ORDER": objOrder,
                "ITEM": item,
                "MATERIAL": material,
                "CHILD_MATERIAL": child_material,
                "START_DATE": startDate,
                "END_DATE": endDate
        };
        try{
            var response = await callPost(url,body);
        } catch(e){}

        if ( !response || !response.OUTPUT ||  !Array.isArray(response.OUTPUT) || response.OUTPUT.length === 0 || response.OUTPUT[0].type !== "S" ) {
            if(type=="MK" || type=="MT"){
                await updateStatusModifica(plant,prog_eco,"0");
            } else if(type=="MA"){
                await updateStatusModificaMA(plant, wbe, process_id, child_material, "0", "");
            }
            let errorMessage = "Some errors occours during the send of the update to SAP";
            throw { status: 500, message: errorMessage};
        }

        return response;
}

async function getModificheTestingData(plant, project) {
    try {
        // Step 1: Recupero modifiche da z_modify con plant, project e status != '1'
        const modifiche = await getModificheTestingByOrders(plant, project);

        if (modifiche.length === 0) {
            return [];
        }

        // Step 3: Recupero material descriptions tramite API
        const processedModifiche = [];
        
        for (const modifica of modifiche) {
            // Recupero descrizione material
            let materialDescription = "";
            if (modifica.material) {
                try {
                    const materialFilter = `(PLANT eq '${plant}' and MATERIAL eq '${modifica.material}')`;
                    const mockReqMaterial = {
                        path: "/mdo/MATERIAL",
                        query: { $apply: `filter(${materialFilter})` },
                        method: "GET"
                    };
                    const materialResult = await dispatch(mockReqMaterial);
                    if (materialResult?.data?.value && materialResult.data.value.length > 0) {
                        materialDescription = materialResult.data.value[0].DESCRIPTION || "";
                    }
                } catch (error) {
                    console.log(`Error fetching material description for ${modifica.material}: ${error.message}`);
                }
            }

            processedModifiche.push({
                ...modifica,
                materialDescription: materialDescription
            });
        }

        // Step 4: Creo tree table raggruppata per prog_eco o process_id (o entrambi se uguali)
        const treeTable = [];
        
        for (const modifica of processedModifiche) {
            // Elemento figlio (dettaglio) - livello 2
            const child = {
                level: 2,
                child_material: modifica.child_material || "",
                quantity: modifica.qty || 0,
                flux_type: modifica.flux_type || "",
                resolution: modifica.resolution || "",
                note: modifica.note || "",
                status: modifica.status || "",
                owner: modifica.owner || "", // nuova colonna
                due_date: modifica.due_date || "", // nuova colonna
                sfc: modifica.sfc || "",
                order: modifica.order || ""
            };

            // Determino la chiave di raggruppamento: prog_eco o process_id (o entrambi se non vuoti)
            const groupKey = (modifica.prog_eco && modifica.process_id) 
                ? `${modifica.prog_eco}_${modifica.process_id}` 
                : modifica.prog_eco || modifica.process_id || "";

            // Cerco se esiste già il gruppo parent
            const existingGroup = treeTable.find(item => 
                (item.prog_eco === modifica.prog_eco && item.process_id === modifica.process_id)
            );
            
            if (!existingGroup) {
                // Creo nuovo gruppo parent - livello 1
                treeTable.push({
                    level: 1,
                    type: modifica.type || "",
                    prog_eco: modifica.prog_eco || "",
                    process_id: modifica.process_id || "",
                    wbs_element: modifica.wbe || "",
                    material: modifica.material || "",
                    material_description: modifica.materialDescription,
                    children: [child]
                });
            } else {
                // Aggiungo al gruppo esistente
                existingGroup.children.push(child);
            }
        }

        return treeTable;

    } catch (error) {
        console.error("Error in getModificheTestingData:", error);
        return false;
    }
}

//Esporta la funzione
module.exports={sendModificaToSAP, getModificheTestingData};