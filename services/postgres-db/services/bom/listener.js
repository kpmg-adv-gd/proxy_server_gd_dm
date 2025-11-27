const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    // Endpoint per eseguire query
    app.post('/postgresDB/', async (req, res) => {

    });

    // Api per ottenere info su task terzo livello
    app.post("/db/getMaterialsTI", async (req, res) => {
        const { plant, project } = req.body;
        try {
            var materials = await postgresdbService.getMaterialsTI(plant, project);
            res.status(200).json(materials);
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });


};

