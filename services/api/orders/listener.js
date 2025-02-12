const axios = require("axios");
const { callGet } = require("../../../utility/CommonCallApi");

// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    app.get("/api/order/v1/orders", async (req, res) => {
        try {
            const { plant, order } = req.query;
            if (!plant || !order) {
                return res.status(400).json({ error: "Missing required query parameters: plant or order" });
            }

            var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
            const orderResponse = await callGet(url);
            res.status(200).json({ orderResponse: orderResponse });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });


};
