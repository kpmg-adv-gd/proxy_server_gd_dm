const { insertZMarkingRecap } = require("../../postgres-db/services/marking/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageOpModificheMA(jsonOperationsModificheMA) {
        
        // PARALLELO

        const promises = jsonOperationsModificheMA?.OPERATION.map(el => manageOpMA(el));

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

async function manageOpMA(newOperationMA) {
    await insertZMarkingRecap(
        newOperationMA.PLANT?.[0] ?? "",
        newOperationMA.PROJECT?.[0] ?? "",
        newOperationMA.WBSELEMENT?.[0] ?? "",
        newOperationMA.OPERATION?.[0] ?? "",
        newOperationMA.ORDER_ID?.[0] ?? "",
        newOperationMA.CONFIRMATION_NUMBER?.[0] ?? "",
        newOperationMA.DURATION?.[0] ?? 0,
        newOperationMA.DURATION_UOM?.[0] ?? "",
        0,
        newOperationMA.DURATION_UOM?.[0] ?? "",
        newOperationMA.DURATION?.[0] ?? 0,
        newOperationMA.DURATION_UOM?.[0] ?? "",
        0,
        newOperationMA.DURATION_UOM?.[0] ?? "",
        newOperationMA.OP_DESCR?.[0] ?? "",
        true
    );
}

module.exports = { manageOpModificheMA }


