const { callGet } = require("../../../utility/CommonCallApi");
const { getWorkListDataFiltered } = require("./library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

module.exports.listenerSetup = (app) => {
    app.post("/api/sfc/v1/worklist/sfcs", async (req, res) => {
        try {
            const { plant, workcenter } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !workcenter ) {
                return res.status(400).json({ error: "Missing required parameter: plant or workcenter" });
            }
            var url = hostname+"/sfc/v1/worklist/sfcs?plant="+plant+"&workCenter="+workcenter;
            var response = await callGet(url);
            var filterData = getWorkListDataFiltered(response,req.body);
            res.status(200).json({result: filterData});
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
