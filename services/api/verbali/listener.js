const { callGet, callGetFile } = require("../../../utility/CommonCallApi");
const { getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly, updateCustomAssemblyReportStatusOrderDone, updateCustomSentTotTestingOrder, generateInspectionPDF, sendToTesting, updateTestingDefects } = require("./library");
const { saveWorkInstructionPDF, getWorkInstructionPDF } = require("../../api/workInstructions/library"); 
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    // Endpoint per ottenere i verbali del supervisore assembly
    app.post("/api/getVerbaliSupervisoreAssembly", async (req, res) => {
        try {
            const { plant, project, wbs, showAll } = req.body;
            const verbali = await getVerbaliSupervisoreAssembly(plant, project, wbs, showAll);
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

    // Chusura del verbale di ispezione
    app.post("/api/generateInspection", async (req, res) => {
        try {
            const { plant, user, selectedData, dataCollections } = req.body;
            // Logica di dettaglio per il passaggio al testing
            var sent = await sendToTesting(plant, selectedData);
            if (!sent) {
                throw { status: 500, message: "Error during sending to Testing process" };
            }
            // Salvo campi custom ASSEMBLY_REPORT_STATUS e ASSEMBLY_REPORT_USER
            await updateCustomAssemblyReportStatusOrderDone(plant, selectedData.order, user);
            // Salvo campo custom SENT_TO_TESTING su ordine e su figli/nipoti...
            await updateCustomSentTotTestingOrder(plant, selectedData.order, user);
            // Salvo il sendToTesting sui difetti
            await updateTestingDefects(plant, selectedData.order);
            // generazione del PDF del verbale di ispezione
            var base64PDF = await generateInspectionPDF(plant, dataCollections, selectedData, user);
            await saveWorkInstructionPDF(base64PDF, "Verbale_Ispezione_"+selectedData.project_parent+"_"+selectedData.material, plant);
            res.status(200).json({ message: "Update successful" });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per generare e scaricare il file del verbale di ispezione
    // Questo endpoint deve restituire il file PDF generato (application/pdf)
    app.post("/api/downloadVerbalePDF", async (req, res) => {
        try {
            const { plant, project, material } = req.body;
            var base64 = await getWorkInstructionPDF(plant, "Verbale_Ispezione_" + project + "_" + material);
            res.status(200).json({ base64: base64 });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

}