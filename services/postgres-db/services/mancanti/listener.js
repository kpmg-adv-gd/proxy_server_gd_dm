const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZMancantiReportData", async (req, res) => {
        const { plant, project, wbe, typeMancante, startDeliveryDate, endDeliveryDate } = req.body;

        if (!plant) {
            return res.status(400).json({ error: "Missing required query parameter: plant" });
        }

        try {
            const mancantiReportData = await postgresdbService.getZMancantiReportData(plant, project, wbe, typeMancante, startDeliveryDate, endDeliveryDate );
            res.status(200).json(mancantiReportData); 
        } catch (error) {
            console.log("Error executing query getZMancantiReportData: "+error);
            res.status(500).json({ error: "Error while executing query getZMancantiReportData" });
        }
    })

        app.post("/db/getMancantiInfo", async (req, res) => {
        const { plant, project, order } = req.body;

        if (!plant || !project || !order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, project or group" });
        }

        try {
            const mancantiInfoResponse = await postgresdbService.getMancantiInfoData(plant, project, order );
            res.status(200).json(mancantiInfoResponse); 
        } catch (error) {
            console.log("Error executing query getZMancantiReportData: "+error);
            res.status(500).json({ error: "Error while executing query getMancantiInfo" });
        }
    })
    
        
};

