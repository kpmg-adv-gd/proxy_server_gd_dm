const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getDashboardKPI", async (req, res) => {
        const { plant, project, wbs, sfc, section, material } = req.body;
        try {
            const dashboardKPIData = await postgresdbService.getDashboardKPI(plant, project, wbs, sfc, section, material);
            res.status(200).json(dashboardKPIData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/getDataFilterDashboardKPI", async (req, res) => {
        const { plant, project, phase, customer, section } = req.body;

        if (!plant) {
            return res.status(400).json({ error: "Missing required parameter: plant" });
        }

        try {
            const data = await postgresdbService.getDataFilterDashboardKPI(plant, project, phase, customer, section);
            res.status(200).json(data); 
        } catch (error) {
            console.log("Error executing query: " + error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

