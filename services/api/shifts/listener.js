const axios = require("axios");
const { callGet } = require("../../../utility/CommonCallApi");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app, getBearerToken) => {

    app.get("/api/shift/v1/shifts", async (req, res) => {
        try {
            const { plant, shift } = req.query;
            if (!plant || !shift) {
                return res.status(400).json({ error: "Missing required query parameter: plant or shift" });
            }

            var url = hostname + "/shift/v1/shifts?plant=" + plant + "&shift=" + shift;
            const response = await callGet(url);
            res.json(response[0]); 
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
