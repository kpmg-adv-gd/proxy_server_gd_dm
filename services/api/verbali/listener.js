const { callGet, callGetFile } = require("../../../utility/CommonCallApi");
const { getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly } = require("./library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    // Endpoint per ottenere i verbali del supervisore assembly
    app.post("/api/getVerbaliSupervisoreAssembly", async (req, res) => {
        try {
            const { plant, project, wbs } = req.body;
            const verbali = await getVerbaliSupervisoreAssembly(plant, project, wbs);
            if (verbali === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(verbali);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per ottenere i progetti per filtro su supervisore assembly
    app.post("/api/getProjectsVerbaliSupervisoreAssembly", async (req, res) => {
        try {
            const { plant } = req.body;
            const projects = await getProjectsVerbaliSupervisoreAssembly(plant);
            if (projects === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(projects);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

}