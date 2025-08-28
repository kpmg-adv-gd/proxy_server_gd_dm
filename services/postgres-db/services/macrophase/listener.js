const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getMacroPhase", async (req, res) => {
        try {
            const { plant } = req.body;
            const macroPhase = await postgresdbService.getMacroPhase(plant);
            res.status(200).json(macroPhase);
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })  

};