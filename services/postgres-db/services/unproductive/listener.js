const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/unproductive/wbs", async (req, res) => {
        const { plant } = req.body;
        try {
            const result = await postgresdbService.selectZUnproductive(plant);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });
    
    app.post("/db/unproductive/wbs/create", async (req, res) => {
        const { plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group } = req.body;
        try {
            const result = await postgresdbService.insertWBS(plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            if (("" + error).includes("duplicate key value violates unique constraint")) {
                res.status(409).json({ error: "KEY_DUPLICATE" });
            } else {
                res.status(500).json({ error: "Error while executing query" });
            }
        }
    });

    
    app.post("/db/unproductive/wbs/delete", async (req, res) => {
        const { plant, confirmationNumberList } = req.body;
        try {
            const result = await postgresdbService.deleteWBS(plant, confirmationNumberList);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/unproductive/wbs/update", async (req, res) => {
        const { plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group } = req.body;
        try {
            const result = await postgresdbService.updateWBS(plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/unproductive/marcature", async (req, res) => {
        const { plant, erpPersonnelNumber } = req.body;
        try {
            const result = await postgresdbService.getMarcatureDayAndValue(plant, erpPersonnelNumber);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });
   

};