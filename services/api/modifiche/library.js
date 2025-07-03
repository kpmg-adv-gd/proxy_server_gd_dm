const { callPost } = require("../../../utility/CommonCallApi");
const { getErpPlantFromDMPlant } = require("../../../utility/MappingPlant");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,objOrder,item,resolution){
    var pathModificaProductionProcess = await getZSharedMemoryData(plant,"SEND_MODIFICHE_SAP_PRODUCTION_PROCESS");
    if(pathModificaProductionProcess.length>0) pathModificaProductionProcess = pathModificaProductionProcess[0].value;
    var url = hostname + pathModificaProductionProcess;
    objOrder = objOrder.replace(/^0+/, '');
    plant = await getErpPlantFromDMPlant(plant);

    var body = {
                "PROGRECO": prog_eco,
                "PROCESSID": process_id,
                "PLANT": plant,
                "WBE": wbe,
                "TYPE": type,
                "STATUS": newStatus,
                "RESOLUTION": resolution,
                "OBJ_ORDER": objOrder,
                "ITEM": item,
                "MATERIAL": material,
                "CHILD_MATERIAL": child_material
        };

    console.log("BODY SEND MODIFICHE SAP: "+JSON.stringify(body));
    let response = await callPost(url,body);
    console.log("RESPONSE SAP: "+JSON.stringify(response));
    return response;

}

//Esporta la funzione
module.exports={sendModificaToSAP};