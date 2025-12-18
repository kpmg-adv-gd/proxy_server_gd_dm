const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {
    
    app.post("/db/getMarkingTesting", async (req, res) => {
        const { plant, project, type } = req.body;
        try {
            const response = await postgresdbService.getMarkingTesting(plant, project, type);
            res.status(200).json(response); 
        } catch (error) {
            console.log("Error executing query getMarkingTesting: "+error);
            res.status(500).json({ error: "Error while executing query getMarkingTesting" });
        }
    })

};