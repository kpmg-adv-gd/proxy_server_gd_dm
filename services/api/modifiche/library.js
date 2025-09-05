const { callPost } = require("../../../utility/CommonCallApi");
const { updateStatusModifica, updateStatusModificaMA } = require("../../postgres-db/services/modifiche/library");
const { getErpPlantFromDMPlant } = require("../../../utility/MappingPlant");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
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

//Esporta la funzione
module.exports={sendModificaToSAP};