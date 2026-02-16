const { getFilterPOD, getFilterPODTI } = require("./library");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);

module.exports.listenerSetup = (app) => {

    app.post("/api/getFilterPOD", async (req, res) => {

        try {
            
            const { plant, userId } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }
            var responseFilterData = await getFilterPOD(plant,userId);
            // Restituisci i getFilterPODdati della risposta
            res.status(200).json(responseFilterData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getFilterPODTI", async (req, res) => {

        try {
            
            const { plant, userId } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }
            var responseFilterData = await getFilterPODTI(plant,userId);
            // Restituisci i getFilterPODdati della risposta
            res.status(200).json(responseFilterData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


