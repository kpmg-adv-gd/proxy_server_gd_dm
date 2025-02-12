const axios = require("axios");
const { callGet } = require("../../../utility/CommonCallApi");
const { getBomMultilivelloTreeTableData } = require("./library");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


module.exports.listenerSetup = (app) => {

    app.post("/api/bom/getBomMultilivelloTreeTableData", async (req, res) => {
        try {
            const { order, plant } = req.body;
            if (!order || !plant ) {
                return res.status(400).json({ error: "Missing required query parameter order/plant " });
            }

            const apiResponse = await getBomMultilivelloTreeTableData(order,plant);
            res.status(200).json(apiResponse);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
