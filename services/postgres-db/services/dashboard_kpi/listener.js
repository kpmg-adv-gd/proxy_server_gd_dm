const postgresdbService = require('./library');
const { getZSharedMemoryData } = require("../shared_memory/library");

module.exports.listenerSetup = (app) => {

    app.post("/db/getDashboardKPI", async (req, res) => {
        const { plant, project, wbe, sfc, section, material, order } = req.body;
        try {
            const dashboardKPIData = await postgresdbService.getDashboardKPI(plant, project, wbe, sfc, section, material, order);
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

    app.post("/db/getActualDateDashboardKPI", async (req, res) => {
        const { plant, wbe, machSection } = req.body;

        if (!plant || !wbe || !machSection) {
            return res.status(400).json({ error: "Missing required parameters: plant, wbe, machSection" });
        }

        try {
            const actualDate = await postgresdbService.getActualDate(plant, wbe, machSection);
            res.status(200).json({ actualDate: actualDate });
        } catch (error) {
            console.log("Error executing query: " + error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/getPodIdValues", async (req, res) => {
        const { plant } = req.body;
        try {
            const rows = await getZSharedMemoryData(plant, "POD_ID_VALUE");
            if (rows && rows.length > 0 && rows[0].value) {
                var parsed = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
                res.status(200).json(parsed);
            } else {
                res.status(200).json({});
            }
        } catch (error) {
            console.log("Error fetching POD_ID_VALUE: " + error);
            res.status(500).json({ error: "Error while fetching POD_ID_VALUE" });
        }
    })

};

