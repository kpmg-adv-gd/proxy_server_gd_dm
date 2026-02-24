const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getReportWeight", async (req, res) => {
        const { report, plant } = req.body;
        try {
            const reportWeight = await postgresdbService.getReportWeight(report, plant);
            res.status(200).json(reportWeight); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })  

};