const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("db/getReasonsForVariance", async (req, res) => {
        try {
            const reasonForVariance = await postgresdbService.getReasonForVariance();
            res.status(200).json({result: reasonForVariance}); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })  

};