const { getSinotticoBomMultilivelloReportData, getFilterSinotticoBom, getProgressStatusOrder } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/getSinotticoBomMultilivelloReport", async (req, res) => {
        try {
            const { plant, project, machineMaterial } = req.body;
            if (!plant || !project || !machineMaterial ) {
                return res.status(400).json({ error: "Missing required query parameter project or machine material " });
            }

            const treeTableResponse = await getSinotticoBomMultilivelloReportData(plant,project,machineMaterial);
            res.status(200).json(treeTableResponse);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error getSinotticoBomMultilivelloReport";
            console.error("Error calling external API getSinotticoBomMultilivelloReport:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });


    app.post("/api/getProgressStatusOrder", async (req, res) => {
        try {
            const { plant, order } = req.body;
            if (!plant || !order ) {
                return res.status(400).json({ error: "Missing required query parameter order " });
            }

            const responseChart = await getProgressStatusOrder(plant,order);
            res.status(200).json(responseChart);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error getSinotticoBomMultilivelloReport";
            console.error("Error calling external API getSinotticoBomMultilivelloReport:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });


    app.post("/api/getFilterSinotticoBom", async (req, res) => {

        try {
            const { plant } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }
            var responseFilterData = await getFilterSinotticoBom(plant);
            res.status(200).json(responseFilterData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
