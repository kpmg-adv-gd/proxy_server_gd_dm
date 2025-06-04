const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZSharedMemory", async (req, res) => {
        const { plant, key } = req.body;

        if (!plant || !key ) {
            return res.status(400).json({ error: "Missing required query parameter: plant or key" });
        }

        try {
            const sharedMemoryData = await postgresdbService.getZSharedMemoryData(plant, key);
            res.status(200).json(sharedMemoryData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }) 
    
        
};

