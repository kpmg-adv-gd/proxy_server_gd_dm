const { callPost, callGet, callPostMultipart, callGetFile } = require("../../../utility/CommonCallApi");
const FormData = require('form-data');
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function filteredWorkInstructionsTI(plant, response, idLev1, idLev2, idLev3) {

    var consolidatedData = [];
    try{
        // Per ognuno controlliamo sia presente il custom value "TASK_ID" con idLev3
        for (var i = 0; i < response.length; i++) {
            var url = hostname + "/workinstruction/v1/workinstructions?plant=" + plant + "&workinstruction=" + response[i].workInstruction;
            var dataWI = await callGet(url);
            if (dataWI && dataWI.length > 0 && dataWI[0].customValues.some(cv => cv.attribute == "ACTIVITY_ID" && cv.value.split(";").includes(idLev2))) {
                if (dataWI[0].customValues.some(cv => cv.attribute == "TASK_ID" && cv.value.split(";").includes(idLev3))) {
                    consolidatedData.push(response[i]);
                }
            }
        }
        return consolidatedData;
    } catch(e){
        console.error("Errore in getFilterPOD: "+ e);
        throw new Error("Errore in getFilterPOD:"+e);
    }
    
}

async function saveWorkInstructionPDF(base64Data, wiName, plant) {
    try {
        // Decodifica il base64 in Buffer
        const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const pdfBuffer = Buffer.from(base64String, 'base64');
        
        // Crea FormData per l'upload multipart
        const formData = new FormData();
        formData.append('file', pdfBuffer, {
            filename: `${wiName}.pdf`,
            contentType: 'application/pdf'
        });

        const url = hostname + "/workinstruction/v1/workinstructions/file";
        const response = await callPostMultipart(url, formData);
        var externalFileUrl = response.externalFileUrl;

        // Ora aggiorna la Work Instruction per collegare il file caricato
        const urlWI = hostname + "/workinstruction/v1/workinstructions";
        const payload = {
            plant: plant,
            workInstruction: wiName,
            version: "1",
            description: `Verbale di ispezione`,
            status: "RELEASABLE",
            currentVersion: true,
            trackViewing: false,
            customValues: [],
            workInstructionElements: [
                {
                    type: "TEXT",
                    text: externalFileUrl,
                    sequence: 1,
                    description: "external file link",
                }
            ]
        };
        console.log("Payload per la Work Instruction:", payload);
        // Effettua la chiamata POST per creare la Work Instruction
        await callPost(urlWI, payload);

        return {
            success: true,
            data: response
        };
        
    } catch (error) {
        console.error("Errore nella creazione della Work Instruction:", error);
        return {
            success: false,
            error: error.message || "Errore sconosciuto"
        };
    }
}

async function getWorkInstructionPDF(plant, wiName) {
    var url = hostname+"/workinstruction/v1/workinstructions?plant=" + plant + "&workinstruction=" + wiName;
    var response = await callGet(url);
    if(response && response.length > 0){
        var workInstruction = response[0];
        // Recupera il link del file dalla workInstructionElements
        var fileLinkElement = workInstruction.workInstructionElements.find(element => element.type === "TEXT");
        if (fileLinkElement) {
            var fileUrl = fileLinkElement.text;
            // Chiama l'API per scaricare il file binario
            const url = hostname + "/workinstruction/v1/workinstructions/file?externalFileUrl=" + encodeURIComponent(fileUrl);
            var fileResponse = await callGetFile(url);
            // Converti il buffer in base64
            const base64 = Buffer.from(fileResponse.data).toString('base64');
            return base64;
        } else {
            throw new Error("Nessun elemento di tipo TEXT trovato nella Work Instruction");
        }
    } else {
        throw new Error("Work Instruction non trovata");
    }
}

// Esporta la funzione
module.exports = { filteredWorkInstructionsTI, saveWorkInstructionPDF, getWorkInstructionPDF

 };