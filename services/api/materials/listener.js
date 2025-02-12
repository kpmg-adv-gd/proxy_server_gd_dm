const axios = require("axios");
const { callGet } = require("../../../utility/CommonCallApi");

// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {
    app.get("/api/material/v2/materials", async (req, res) => {
        try {
            // Ottieni i query parameters dall'URL
            const { plant } = req.query;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required query parameters: plant or routing" });
            }

            var url = hostname + "/material/v2/materials?plant=" + plant;
            const response = await callGet(url);
            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
