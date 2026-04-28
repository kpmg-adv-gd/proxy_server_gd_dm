const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getReasonsForVariance", async (req, res) => {
        const { plant } = req.body;
        try {
            const reasonForVariance = await postgresdbService.getReasonsForVariance(plant);
            res.status(200).json(reasonForVariance); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })  

};