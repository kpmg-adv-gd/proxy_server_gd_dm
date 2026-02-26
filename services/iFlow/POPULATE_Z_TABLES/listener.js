const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { populateZTables } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/populateZTables", async (req, res) => {

        try {
            var { plant, order } = req.body;
            await populateZTables(plant,order);
            res.status(200).send("Servizio completato con successo"); 
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error processing Data:", errMessage);
            res.status(status).json({ error: errMessage });
        }

    });
};
