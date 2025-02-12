const { callPost } = require("../../../utility/CommonCallApi");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

module.exports.listenerSetup = (app) => {

    app.post("/api/sfc/v1/sfcs/start", async (req, res) => {
        try {
            const { plant, operation, resource, sfc  } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !operation || !resource || !sfc) {
                return res.status(400).json({ error: "Missing required parameters: plant-operation-resource-sfc" });
            }

            var url = hostname+"/sfc/v1/sfcs/start";
            var params = {
                "plant": plant,
                "operation":operation,
                "resource":resource,
                "sfcs": [sfc]
            };
            var response = await callPost(url,params);
            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


