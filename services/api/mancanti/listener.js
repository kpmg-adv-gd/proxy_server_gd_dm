const { getFilterMancantiReport } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/getFilterMancantigReport", async (req, res) => {

        try {
            const { plant } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }
            var responseFilterData = await getFilterMancantiReport(plant);
            res.status(200).json(responseFilterData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};