const axios = require("axios");
const { callGet } = require("../../../utility/CommonCallApi");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app, getBearerToken) => {

    app.get("/api/user/v1/users", async (req, res) => {
        try {
            const { plant, userId } = req.query;
            if (!plant || !userId) {
                return res.status(400).json({ error: "Missing required query parameters: plant or userId" });
            }

            var url = hostname + "/user/v1/users?plant=" + plant + "&userId=" + userId;
            const response = await callGet(url);
            const personnelNumber = response.erpPersonnelNumber;
            res.status(200).json({ erpPersonnelNumber: personnelNumber });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
