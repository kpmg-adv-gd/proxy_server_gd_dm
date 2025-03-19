const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { getCertificationByPlantGdAndWorkCenterErp } = require("../../postgres-db/services/loipro/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const xpath = require("xpath");

async function manageCertifications(docXml){
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0]?.textContent : null;
    var workCenterErpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='WorkCenterErp']", docXml);
    var operationNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='ManufacturingOrderMESReference']/*[local-name()='MESOperation']", docXml);
    
    if(workCenterErpNodes.length!==operationNodes.length){
        let errorMessage = "WorkCenter|Operations not compiled correctly";
        throw { status: 500, message: errorMessage};
    }

    let objsOpsCert = await getObjectsOperationCertification(plantValue,workCenterErpNodes,operationNodes);
    let certifications = await getCertificationsByPlant(plantValue);
    await updateCertifications(plantValue,certifications,objsOpsCert);
}

async function getObjectsOperationCertification(plant, workCenterErpNodes, operationNodes) {
    var resultObjsOpCert = [];
    var certMap = new Map();

    for (let ii = 0; ii < workCenterErpNodes.length; ii++) {
        let workCenterErp = workCenterErpNodes[ii]?.textContent;
        if (certMap.has(workCenterErp)) {
            resultObjsOpCert.push({
                "certification": certMap.get(workCenterErp),
                "operation": operationNodes[ii]?.textContent
            });
        } else {
            let responseCert = await getCertificationByPlantGdAndWorkCenterErp(workCenterErp, plant);
            if (responseCert.length > 0) {
                let cert = responseCert[0].certification_dm;
                resultObjsOpCert.push({
                    "certification": cert,
                    "operation": operationNodes[ii]?.textContent
                });
                certMap.set(workCenterErp, cert);
            }
        }
    }
    return resultObjsOpCert;
}

async function getCertificationsByPlant(plant){
    var url = hostname + "/certification/v1/certifications?plant="+plant;
    var responseCert = await callGet(url);
    return responseCert;
}

async function updateCertifications(plant, certifications, objsOpsCert) {
    //Raccolgo in updatePromises tutte le chiamate patch in modo che vengano eseguite tutte parallelamente, il chiamante aspetta che abbia finito tutto prima di procedere
    let updatePromises = [];

    for (let certObj of certifications) {
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
        updatePromises.push(updateSingleCertification(certObj));
    }

    const results = await Promise.allSettled(updatePromises);
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
        let errorMessage = `Errori durante l'elaborazione populateZTables: ${errors.join(" | ")}`;
        throw { status: 500, message: errorMessage};
    }
    
}

async function updateSingleCertification(certObj){
    var url = hostname + "/certification/v1/certifications";
    let responsePatch = await callPatch(url,certObj);
}


module.exports = { manageCertifications };