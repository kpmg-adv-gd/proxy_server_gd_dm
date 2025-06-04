const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { getZCertificationNotAssignedByPlant, updateZCertificationByPlantAndCert } = require("../../postgres-db/services/loipro/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageCertifications(plant) {
    let certifications = await getCertificationsByPlant(plant);
    let opsCertTable = await getZCertificationTable(plant);
    let objsOpsCert = createObjsOpsCert(opsCertTable); //Ottengo n oggetti certificazione-operazione per fare l'update delle certificazioni 

    //Mi creo un array di promises per fare l'updtae diu ogni singola certificazione ed aggionrar el rispettive righe (is_assgined a true) nella tabella custom z_certification
    let updatePromises = certifications.map(certObj => updateSingleCertificationFlow(plant, certObj, objsOpsCert));

    // Esegui tutte le operazioni in parallelo
    const results = await Promise.allSettled(updatePromises);

    // Raccogliamo errori solo a scopo informativo
    const errors = results
        .filter(result => result.status === "rejected")
        .map(result => result.reason.message);

    if (errors.length > 0) {
        console.error("Alcune certificazioni non sono state aggiornate:", errors.join(" | "));
        let errorMessage = `Alcune certificazioni non sono state aggiornate: ${errors.join(" | ")}`;
        throw { status: 500, message: errorMessage};
    }
    
    return "Aggiornamento completato!";
}

// Ottiene tutte le operazioni ancora non assegnate a nessuna certificazione
async function getZCertificationTable(plant) {
    return await getZCertificationNotAssignedByPlant(plant);
}

// Crea array di oggetti con certification e operation
function createObjsOpsCert(opsCertTable) {
    return opsCertTable.map(opRow => ({
        "certification": opRow.certification_dm,
        "operation": opRow.operation_activity
    }));
}

// Ottiengo tutte le certificazioni
async function getCertificationsByPlant(plant) {
    let url = `${hostname}/certification/v1/certifications?plant=${plant}`;
    return await callGet(url);
}


// Esegue il flusso completo per aggiornare una singola certificazione e successivamente la tabella custom.

async function updateSingleCertificationFlow(plant, certObj, objsOpsCert) {
    try {
        await updateSingleCertification(certObj, plant, objsOpsCert);
        await updateZCertificationTable(plant, certObj.certification); // Aggiorna solo se la certificazione è andata a buon fine
    } catch (error) {
        console.error(`Errore aggiornando la certificazione ${certObj.certification}:`, error);
    }
}


// Aggiorna una singola certificazione

async function updateSingleCertification(certObj, plant, objsOpsCert) {
    let cert = certObj.certification;
    let certOps = certObj.certificationRequirements;

    for (let opObj of objsOpsCert) {
        if (!certOps.some(obj => obj?.operation?.operation === opObj.operation) && cert === opObj.certification) {
            certOps.push({
                "material": null,
                "operation": {
                    "plant": plant,
                    "operation": opObj.operation,
                },
                "resource": null
            });
        }
    }

    let url = `${hostname}/certification/v1/certifications`;
    await callPatch(url, certObj);
}


// Aggiorno la tabella custom Z_Certification SOLO per la certificazione non andata in erre dopo l'update

async function updateZCertificationTable(plant, cert) {
    await updateZCertificationByPlantAndCert(plant, cert);
}

module.exports = { manageCertifications };
