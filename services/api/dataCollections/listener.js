const { callGet, callPost, callPatch } = require("../../../utility/CommonCallApi");
const { elaborateDataCollectionsSupervisoreAssembly, getReportWeightDataCollections, generateJsonParameters, elaborateDataCollectionstTesting, getCustomWeights, elaborateAnalisiOreVarianza } = require("./library");
const { updateCustomAssemblyReportStatusOrderInWork, updateCustomTestingReportStatusOrderInWork } = require("../../api/verbali/library");
const { updateModifyOwnerAndDueDate } = require("../../postgres-db/services/modifiche/library");
const { updateMancantiOwnerAndDueDate } = require("../../postgres-db/services/mancanti/library");
const { updateActivitiesOwnerAndDueDate, upsertWeightValue } = require("../../postgres-db/services/verbali/library");
const { updateDefectsOwnerAndDueDate } = require("../../postgres-db/services/defect/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    // Endpoint per ottenere le data collections per supervisore assembly
    app.post("/api/getDataCollectionsBySFC", async (req, res) => {
        try {
            const { plant, resource, selected, refresh } = req.body;

            // Recupero prima stepID
            var urlSteId = hostname + "/sfc/v1/sfcdetail?plant=" + plant + "&sfc=" + selected.sfc;
            const stepIdResponse = await callGet(urlSteId);
            if (!stepIdResponse || stepIdResponse.length === 0) {
                res.status(500).json({ error: "Error while retrieving Step ID" });
                return;
            }
            var stepId = stepIdResponse.steps[0].stepId;

            // Recupero data collections
            var url = hostname + "/datacollection/v1/sfc/groups?plant=" + plant + "&resource=" + resource
                + "&sfc=" + selected.sfc + "&StepId=" + stepId;

            const datacollectionsResponse = await callGet(url);
            if (datacollectionsResponse && datacollectionsResponse.length > 0) {
                if(resource==="REPORT_ASSEMBLY"){
                    var results = await elaborateDataCollectionsSupervisoreAssembly(plant, selected, resource, datacollectionsResponse, refresh);
                } 
                if(resource==="REPORT_TESTING"){
                    var results = await elaborateDataCollectionstTesting(plant, selected, resource, datacollectionsResponse, refresh);
                } 
                if (!results) {
                    res.status(500).json({ error: "Error while executing query" });
                    return;
                }
            } else {
                var results = [];
            }
            res.status(200).json(results);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per ottenere i report weight delle data collections
    app.post("/api/getReportWeightDataCollections", async (req, res) => {
        try {
            const { plant, sfc, resource, listSection } = req.body;
            const reportResponse = await getReportWeightDataCollections(plant, sfc, resource, listSection);
            if (!reportResponse) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(reportResponse);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per salvare le data collections
    app.post("/api/saveDataCollections", async (req, res) => {
        const { plant, order, sfc, resource, dataCollections, passInWork, idReportWeight } = req.body;
        var url = hostname + "/datacollection/v1/log";
        var listDcError = [];
        for (var i = 0; i < dataCollections.length; i++) {
            var dc = dataCollections[i];
            if (dc.voteSection != null) {
                dc.parameters.push({
                    parameterName: dc.voteNameSection,
                    valueText: dc.voteSection,
                    dataType: "TEXT",
                    comment: "",
                });
            }
            var parameters = await generateJsonParameters(dc.parameters);
            if (parameters.length === 0) continue;
            var payload = {
                plant: plant,
                sfcs: [sfc],
                resource: resource,
                group: {
                    dcGroup: dc.group,
                    version: dc.version
                },
                operation: dc.operation,
                parameterValues: parameters
            }
            try {
                await callPost(url, payload);
            } catch (error) { 
                listDcError.push({ dc: dc.group, message: error.message || "Error while saving Data Collection" });
            }
        }
        if (listDcError.length > 0) {
            res.status(500).json({ error: listDcError });
            return;
        }
        // Aggiorno il campo custom ASSEMBLY_REPORT_STATUS su IN_WORK
        if (passInWork) await updateCustomAssemblyReportStatusOrderInWork(plant, order);
        // Aggiorno il campo custom ASSEMBLY_REPORT_WEIGHT con ID assegnato
        await updateCustomAssemblyReportStatusIdReportWeight(plant, order, idReportWeight);
        res.status(200).json({ message: "Data Collections saved successfully" });
    });

    // Endpoint per ottenere i custom weights per il report TESTING
    app.post("/api/getCustomWeights", async (req, res) => {
        try {
            const { plant, project, order, report } = req.body;
            const data = await getCustomWeights(plant, project, order, report);
            res.status(200).json(data);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per ottenere l'analisi ore varianza
    app.post("/api/getAnalisiOreVarianza", async (req, res) => {
        try {
            const { plant, order } = req.body;
            const data = await elaborateAnalisiOreVarianza(plant, order);
            if (data === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(data);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per salvare le data collections e aggiornare modifiche, mancanti, activities e difetti
    app.post("/api/saveDataCollectionsTesting", async (req, res) => {
        try {
            const { plant, project, order, sfc, resource, dataCollections, passInWork, modifiche, mancanti, activities, difetti, weights } = req.body;
            
            // 1. Salvo le data collections (stessa logica di saveDataCollections)
            var url = hostname + "/datacollection/v1/log";
            var listDcError = [];
            
            if (dataCollections && dataCollections.length > 0) {
                for (var i = 0; i < dataCollections.length; i++) {
                    var dc = dataCollections[i];
                    var parameters = await generateJsonParameters(dc.parameters);
                    if (parameters.length === 0 || parameters[0].parameterName == "DUMMY PARAMETER") continue;
                    var payload = {
                        plant: plant,
                        sfcs: [sfc],
                        resource: resource,
                        group: {
                            dcGroup: dc.group,
                            version: dc.version
                        },
                        operation: dc.operation,
                        parameterValues: parameters
                    }
                    try {
                        await callPost(url, payload);
                    } catch (error) { 
                        listDcError.push({ dc: dc.group, message: error.message || "Error while saving Data Collection" });
                    }
                }
                
                // Aggiorno il campo custom TESTING_REPORT_STATUS su IN_WORK
                if (passInWork) await updateCustomTestingReportStatusOrderInWork(plant, order);
            }
            
            // 2. Aggiorno le modifiche (z_modify)
            if (modifiche && modifiche.length > 0) {
                for (let modifica of modifiche) {
                    try {
                        await updateModifyOwnerAndDueDate(plant,modifica);
                    } catch (error) {
                        console.error("Error updating modifica:", error);
                    }
                }
            }
            
            // 3. Aggiorno i mancanti (z_report_mancanti)
            if (mancanti && mancanti.length > 0) {
                for (let mancante of mancanti) {
                    try {
                        await updateMancantiOwnerAndDueDate(mancante);
                    } catch (error) {
                        console.error("Error updating mancante:", error);
                    }
                }
            }
            
            // 4. Aggiorno le activities (z_verbale_lev_2)
            if (activities && activities.length > 0) {
                for (let activity of activities) {
                    try {
                        await updateActivitiesOwnerAndDueDate(activity);
                    } catch (error) {
                        console.error("Error updating activity:", error);
                    }
                }
            }
            
            // 5. Aggiorno i difetti (z_defects)
            if (difetti && difetti.length > 0) {
                for (let difetto of difetti) {
                    try {
                        await updateDefectsOwnerAndDueDate(difetto);
                    } catch (error) {
                        console.error("Error updating difetto:", error);
                    }
                }
            }
            
            // 6. Aggiorno i weights (z_weight_values)
            if (weights && weights.length > 0) {
                for (let weight of weights) {
                    try {
                        await upsertWeightValue(plant, project, order, {
                            id: weight.id,
                            section: weight.section,
                            value: weight.value || ''
                        });
                    } catch (error) {
                        console.error("Error updating weight:", error);
                    }
                }
            }
            
            if (listDcError.length > 0) {
                res.status(500).json({ error: listDcError });
                return;
            }
            
            res.status(200).json({ message: "Data Collections and updates saved successfully" });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

}