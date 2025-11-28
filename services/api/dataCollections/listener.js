const { callGet, callGetFile } = require("../../../utility/CommonCallApi");
const { getVerbaliSupervisoreAssembly } = require("./library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    // Endpoint per ottenere le data collections per supervisore assembly
    app.post("/api/getDataCollectionsBySFC", async (req, res) => {
        try {
            const { plant, resource, sfc, stepId } = req.body;
            
            var url = hostname + "/datacollection/v1/sfc/groups?plant=" + plant + "&resource=" + resource 
                + "&sfc=" + sfc + "&StepId=" + stepId;

            const datacollectionsResponse = await callGet(url);
            if (datacollectionsResponse && datacollectionsResponse.length > 0) {
                var results = await elaborateDataCollectionsSupervisoreAssembly(plant, sfc, resource, datacollectionsResponse);
            }else{
                var results = [];
            }
            res.status(200).json(results);


        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

}