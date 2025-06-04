const { manageRouting } = require("./updateRoutingLibrary");
const { releaseOrder } = require("./releaseOrderLibrary");
const { manageCertifications } = require("./certificationOp");
const { populateZTables } = require("./populateZTable");
const { manageMancanti } = require("./mancanti");

async function managePostServicePhase(docXml){
    const results = await Promise.allSettled([
        // manageOrderRoutingAndCertification(docXml),
        populateZTables(docXml)
    ]);

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
        let errorMessage = `Errori durante l'elaborazione managePostServicePhase: ${errors.join(" | ")}`;
        throw { status: 500, message: errorMessage};
    }
}

// async function manageOrderRoutingAndCertification(doc){
//     await manageRouting(doc);
//     await releaseOrder(doc);
//     await manageCertifications(doc);
//     //await manageMancanti(doc)
// }

module.exports = { managePostServicePhase }