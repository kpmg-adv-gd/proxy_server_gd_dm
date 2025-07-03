const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getModificheBySfc", async (req, res) => {
        const { plant, wbe, sfc, order } = req.body;

        if (!plant || !sfc || !order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant , sfc or order" });
        }

        try {
            const modifcheData = await postgresdbService.getModificheData(plant, sfc, order);
            var modificheMA = modifcheData.filter(el => {
                if(el.type==="MA") return el;
            });
            var modificheMT_MK = modifcheData.filter(el => {
                if(el.type!=="MA") return el;
            });
            var returnModifiche = {modificheMA:modificheMA,modificheMT_MK:modificheMT_MK};
            res.status(200).json(returnModifiche);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }) 
    
    app.post("/db/updateStatusModifica", async (req, res) => {
        const { plant, prog_eco, newStatus } = req.body;

        if (!plant || !prog_eco || !newStatus ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, process_id , prog_eco or status" });
        }

        try {
            const responseUpdate = await postgresdbService.updateStatusModifica(plant, prog_eco, newStatus);
            res.status(200).json(responseUpdate); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

        app.post("/db/updateResolutionModificaMA", async (req, res) => {
        const { plant, process_id, userId } = req.body;

        if (!plant || !process_id ) {
            return res.status(400).json({ error: "Missing required query parameter: plant or process_id" });
        }

        try {
            var resolution = "Modifica assieme applicata da " + userId;
            const responseUpdate = await postgresdbService.updateResolutionModificaMA(plant, process_id, resolution);
            res.status(200).json(responseUpdate); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/getOperationModificheBySfc", async (req, res) => {
        const { plant, project, order } = req.body;

        if (!plant || !project || !order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, project or order" });
        }

        try {
            const operationModificheResponse = await postgresdbService.getOperationModificheBySfc(plant, project, order);
            res.status(200).json(operationModificheResponse); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }) 
        
};

