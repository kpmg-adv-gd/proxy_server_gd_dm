const { insertZElectricalBox } = require("../../postgres-db/services/electrical_box/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageElectricalBoxes(jsonElectricalBox) {
        
        // PARALLELO

        const promises = jsonElectricalBox?.ELECTRICAL_BOX.map(el => manageElBox(el));

        // Esegui tutte le promesse in parallelo
        const results = await Promise.allSettled(promises);
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
            let errorMessage = `Errori durante l'elaborazione manageOpModificheMA from SAP: ${errors.join(" | ")}`;
            throw { status: 500, message: errorMessage};
        }

        
}

async function manageElBox(newElectricalBox) {
    await insertZElectricalBox(
        newElectricalBox.PLANT?.[0] ?? "",
        newElectricalBox.PROJECT?.[0] ?? "",
        newElectricalBox.WBSELEMENT?.[0] ?? "",
        newElectricalBox.SECTION?.[0] ?? "",
        newElectricalBox.ORDER_ID?.[0] ?? "",
        newElectricalBox.MATERIAL?.[0] ?? "",
        newElectricalBox.MATNR?.[0] ?? 0,
        newElectricalBox.MATNR_DESCRIPTION?.[0] ?? "",
        newElectricalBox.QUANTITY?.[0] ?? "",
        newElectricalBox.UOM?.[0] ?? "",
        false
    );
}

module.exports = { manageElectricalBoxes }


