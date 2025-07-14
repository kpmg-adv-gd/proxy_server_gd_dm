const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZElectricalBoxData", async (req, res) => {
        const { plant, project, order } = req.body;

        if (!plant || !project || !order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, project or order" });
        }

        try {
            const electricalBoxData = await postgresdbService.getZElectricalBoxData(plant, project, order);
            res.status(200).json(electricalBoxData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })
    
    app.post("/db/updateStatusZElectricalBoxData", async (req, res) => {
        const { plant, project, order, eb_material, status } = req.body;

        if (!plant || !project || !order || !eb_material ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, project, order, eb_material  or status" });
        }

        try {
            const electricalBoxUpdate = await postgresdbService.updateZElectricalBoxData(plant, project, order, eb_material, status);
            res.status(200).json(electricalBoxUpdate); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })  
};

