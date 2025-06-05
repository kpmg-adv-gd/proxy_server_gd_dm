const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZResponsibleData", async (req, res) => {
        const { } = req.body;
        try {
            const responsibleData = await postgresdbService.getZResponsibleData();
            res.status(200).json(responsibleData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

