const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZCodingData", async (req, res) => {
        const { plant } = req.body;
        try {
            const codingData = await postgresdbService.getZCodingData(plant);
            res.status(200).json(codingData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

