const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getDashboardKPI", async (req, res) => {
        const { plant, wbs, sfc } = req.body;
        try {
            const dashboardKPIData = await postgresdbService.getDashboardKPI(plant);
            res.status(200).json(dashboardKPIData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

