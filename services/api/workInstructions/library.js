const { callPost, callGet } = require("../../../utility/CommonCallApi");
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

async function saveWorkInstructionPDF(base64Data, wiName, plant) {
    console.log("Salvataggio Work Instruction:", wiName, "per plant:", plant);
    try {
        // Crea la Work Instruction su SAP DM
        const url = hostname + "/workinstruction/v1/workinstructions";
        
        // SOLUZIONE: Salva il base64 in un customValue invece che nel campo text
        const payload = {
            plant: plant,
            workInstruction: wiName,
            version: "1",
            description: `Verbale di ispezione`,
            status: "RELEASABLE",
            currentVersion: true,
            trackViewing: false,
            customValues: [
                {
                    attribute: "PDF_BASE64",
                    value: base64Data
                }
            ],
            workInstructionElements: [
                {
                    type: "TEXT",
                    text: `Verbale di ispezione generato automaticamente.`,
                    sequence: 1,
                    description: "Verbale di ispezione " + wiName
                }
            ]
        };
        
        // Effettua la chiamata POST per creare la Work Instruction
        const response = await callPost(url, payload);

        console.log("Risposta dalla creazione della Work Instruction:", response);
        console.log("WI creata con il nome:", wiName);
        
        // Ritorna l'URL o l'ID della Work Instruction creata
        if (response && response.workInstruction) {
            return {
                success: true,
            };
        }
        
        return {
            success: false,
            message: "Errore nella creazione della Work Instruction"
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
        // Recupera il base64 dal customValue invece che dal campo text
        const pdfBase64CustomValue = response[0].customValues?.find(cv => cv.attribute === "PDF_BASE64");
        if (pdfBase64CustomValue && pdfBase64CustomValue.value) {
            return pdfBase64CustomValue.value;
        }
        throw new Error("PDF non trovato nei custom values della Work Instruction");
    } else {
        throw new Error("Work Instruction non trovata");
    }
}

// Esporta la funzione
module.exports = { filteredWorkInstructionsTI, saveWorkInstructionPDF, getWorkInstructionPDF

 };