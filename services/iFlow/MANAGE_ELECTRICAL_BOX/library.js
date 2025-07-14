const { insertZElectricalBox } = require("../../postgres-db/services/electrical_box/library");
const { getPlantFromERPPlant } = require("../../../utility/MappingPlant");
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
    var erpPlant = newElectricalBox.PLANT?.[0] ?? "";
    var plantDM = await getPlantFromERPPlant(erpPlant);

    await insertZElectricalBox(
        plantDM,
        newElectricalBox.PROJECT?.[0] ?? "",
        newElectricalBox.WBS_ELEMENT?.[0] ?? "",
        newElectricalBox.SECTION?.[0] ?? "",
        newElectricalBox.ORDER_ID?.[0] ?? "",
        newElectricalBox.MATERIAL_CODE?.[0] ?? "",
        newElectricalBox.MATERIAL_DESCR?.[0] ?? "",
        newElectricalBox.QUANTITY?.[0] ?? 0,
        newElectricalBox.UOM?.[0] ?? "",
        false
    );
}

module.exports = { manageElectricalBoxes }


