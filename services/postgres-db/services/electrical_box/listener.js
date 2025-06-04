const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZElectricalBoxData", async (req, res) => {
        const { plant, project, wbs_element, machine_order } = req.body;

        if (!plant || !project || !wbs_element || !machine_order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, project, wbs_element or operation" });
        }

        try {
            const electricalBoxData = await postgresdbService.getZElectricalBoxData(plant, project, wbs_element, machine_order);
            res.status(200).json(electricalBoxData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })
    
    app.post("/db/updateStatusZElectricalBoxData", async (req, res) => {
        const { plant, wbs_element, machine_order, status } = req.body;

        if (!plant || !wbs_element || !machine_order || !status ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, wbs_element or operation" });
        }

        try {
            const electricalBoxUpdate = await postgresdbService.updateZElectricalBoxData(plant, wbs_element, machine_order, status);
            res.status(200).json(electricalBoxUpdate); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })  
};

