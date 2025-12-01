const { callGet, callPost, callPatch } = require("../../../utility/CommonCallApi");
const { elaborateDataCollectionsSupervisoreAssembly, getReportWeightDataCollections, generateJsonParameters } = require("./library");
const { updateCustomAssemblyReportStatusOrderInWork } = require("../../api/verbali/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    // Endpoint per ottenere le data collections per supervisore assembly
    app.post("/api/getDataCollectionsBySFC", async (req, res) => {
        try {
            const { plant, resource, selected, stepId } = req.body;

            var url = hostname + "/datacollection/v1/sfc/groups?plant=" + plant + "&resource=" + resource
                + "&sfc=" + selected.sfc + "&StepId=" + stepId;

            const datacollectionsResponse = await callGet(url);
            if (datacollectionsResponse && datacollectionsResponse.length > 0) {
                var results = await elaborateDataCollectionsSupervisoreAssembly(plant, selected, resource, datacollectionsResponse);
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
        const { plant, order, sfc, resource, dataCollections, passInWork } = req.body;
        var url = hostname + "/datacollection/v1/log";
        for (var i = 0; i < dataCollections.length; i++) {
            var dc = dataCollections[i];
            var parameters = await generateJsonParameters(dc.parameters);
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
            } catch (error) { }
            // Aggiorno il campo custom ASSEMBLY_REPORT_STATUS su IN_WORK
            if (passInWork) await updateCustomAssemblyReportStatusOrderInWork(plant, order);
        }
        res.status(200).json({ message: "Data Collections saved successfully" });
    });

}