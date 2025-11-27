const { callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function filteredWorkInstructionsTI(plant, response, idLev3) {

    var consolidatedData = [];
    try{
        // Per ognuno controlliamo sia presente il custom value "TASK_ID" con idLev3
        for (var i = 0; i < response.length; i++) {
            var url = hostname + "/workinstruction/v1/workinstructions?plant=" + plant + "&workinstruction=" + response[i].workInstruction;
            var dataWI = await callGet(url);
            if (dataWI && dataWI.length > 0 && dataWI[0].customValues.some(cv => cv.attribute == "TASK_ID" && cv.value.split(";").includes(idLev3))) {
                consolidatedData.push(response[i]);
            }
        }
        return consolidatedData;
    } catch(e){
        console.error("Errore in getFilterPOD: "+ e);
        throw new Error("Errore in getFilterPOD:"+e);
    }
    
}

// Esporta la funzione
module.exports = { filteredWorkInstructionsTI };