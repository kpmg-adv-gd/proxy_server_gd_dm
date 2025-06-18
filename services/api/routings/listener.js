const axios = require("axios");
const { getCustomDataFromRoutingStepData } = require("./library");
const { callGet } = require("../../../utility/CommonCallApi");

// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    app.get("/api/routing/v1/routings", async (req, res) => {
        try {
            // Ottieni i query parameters dall'URL
            const { plant, type, routing, stepId } = req.query;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !routing) {
                return res.status(400).json({ error: "Missing required query parameters: plant or routing" });
            }
            var url = hostname + "/routing/v1/routings?plant=" + plant + "&type=" + type + "&routing=" + routing;

            const routingResponse = await callGet(url);
            res.status(200).json({ routingResponse: routingResponse });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
