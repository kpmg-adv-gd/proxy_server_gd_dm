const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZPriorityData", async (req, res) => {
        const { } = req.body;
        try {
            const priorityData = await postgresdbService.getZPriorityData();
            res.status(200).json(priorityData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

