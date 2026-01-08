const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getMarkingTesting", async (req, res) => {
        const { plant, project, type } = req.body;
        try {
            const response = await postgresdbService.getMarkingTesting(plant, project, type);
            res.status(200).json(response);
        } catch (error) {
            console.log("Error executing query getMarkingTesting: " + error);
            res.status(500).json({ error: "Error while executing query getMarkingTesting" });
        }
    })

    app.post("/db/getMarkingDataTesting", async (req, res) => {
        const { plant, wbs, id_lev_1 } = req.body;

        if (!plant || !wbs || !id_lev_1) {
            return res.status(400).json({ error: "Missing required query parameter: plant, wbs or id_lev_1" });
        }

        try {
            const markingData = await postgresdbService.getMarkingDataTesting(plant, wbs, id_lev_1);
            res.status(200).json(markingData);
        } catch (error) {
            console.log("Error executing query: " + error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })


};