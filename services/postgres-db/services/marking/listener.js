const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {
    app.post("/db/getZOpConfirmationData", async (req, res) => {
        const { plant,project,wbe,userId,startMarkingDate,endMarkingDate } = req.body;

        if (!plant || !project) {
            return res.status(400).json({ error: "Missing required query parameter: Project" });
        }

        try {
            const responseData = await postgresdbService.getZOpConfirmationData(plant,project,wbe,userId,startMarkingDate,endMarkingDate);
            res.status(200).json(responseData);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })  
    app.post("/db/getMarkingData", async (req, res) => {
        const { wbe_machine, mes_order, operation } = req.body;

        if (!wbe_machine || !mes_order || !operation) {
            return res.status(400).json({ error: "Missing required query parameter: wbe_machine, mes_order or operation" });
        }

        try {
            const markingData = await postgresdbService.getMarkingData(wbe_machine, mes_order, operation);
            res.status(200).json(markingData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })  

    app.post("/db/updateMarkingRecap", async (req, res) => {
        const { confirmation_number } = req.body;

        if (!confirmation_number) {
            return res.status(400).json({ error: "Missing required query parameter: confirmation_number" });
        }

        try {
            await postgresdbService.mark(confirmation_number);
            res.status(200).json({ success: "Query executed correctly"}); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/getModificationsBySfc", async (req, res) => {
        const { plant, order } = req.body;

        if (!plant || !order) {
            return res.status(400).json({ error: "Missing required query parameter: plant or order" });
        }

        try {
            let responseDataModification = await postgresdbService.getModificationsBySfcService(plant,order);
            res.status(200).json(responseDataModification); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })
};

