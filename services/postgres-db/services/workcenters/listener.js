const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getInternalWorkcenters", async (req, res) => {
        const { plant } = req.body;
        try {
            const workcentersData = await postgresdbService.getInternalWorkcenters(plant);
            res.status(200).json(workcentersData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

