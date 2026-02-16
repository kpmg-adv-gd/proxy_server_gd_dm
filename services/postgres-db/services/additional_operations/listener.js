const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getAdditionalOperations", async (req, res) => {
        const { plant, order } = req.body;
        try {
            const additionalOperations = await postgresdbService.getAdditionalOperations(plant, order);
            res.status(200).json(additionalOperations);
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/startAdditionalOperation", async (req, res) => {
        const { plant, sfc, operation, phase } = req.body;
        try {
            var execute = await postgresdbService.startAdditionalOperation(plant, sfc, operation, phase);
            if (execute.result) {
                res.status(200).json({ message: execute.message });
            } else {
                res.status(500).json({ error: execute.message });
            }
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/completeAdditionalOperation", async (req, res) => {
        const { plant, sfc, operation, project, phase, order, checkModificheLastOperation, checkMancantiLastOperation, valueModifica } = req.body;
        try {
            var execute = await postgresdbService.completeAdditionalOperation(plant, sfc, operation, project, phase, order, checkModificheLastOperation, checkMancantiLastOperation, valueModifica);
            if (execute.result) {
                res.status(200).json({ message: execute.message });
            } else {
                res.status(500).json({ error: execute.message });
            }
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

};