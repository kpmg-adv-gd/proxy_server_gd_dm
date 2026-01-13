const { callGet, callGetFile } = require("../../../utility/CommonCallApi");
const { getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly, getVerbaliTileSupervisoreTesting, getProjectsVerbaliTileSupervisoreTesting, updateCustomAssemblyReportStatusOrderDone, updateCustomSentTotTestingOrder, generateInspectionPDF, sendToTestingAdditionalOperations, updateTestingDefects, updateTestingModifiche, getFilterVerbalManagement, getVerbalManagementTable, getVerbalManagementTreeTable } = require("./library");
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


    app.post("/api/getVerbaliTileSupervisoreTesting", async (req, res) => {
        try {
            const { plant, project, wbs, startDate, endDate } = req.body;
            const verbali = await getVerbaliTileSupervisoreTesting(plant, project, wbs, startDate, endDate);
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
    app.post("/api/getProjectsVerbaliTileSupervisoreTesting", async (req, res) => {
        try {
            const { plant } = req.body;
            const projects = await getProjectsVerbaliTileSupervisoreTesting(plant);
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
            const { plant, user, selectedData, dataCollections, ncCustomTable, resultCustomTable } = req.body;
            // Logica di dettaglio per il passaggio al testing
            var sentAddOpt = await sendToTestingAdditionalOperations(plant, selectedData);
            if (!sentAddOpt) {
                throw { status: 500, message: "Error during sending to Testing process" };
            }
            // Salvo campi custom ASSEMBLY_REPORT_STATUS e ASSEMBLY_REPORT_USER
            await updateCustomAssemblyReportStatusOrderDone(plant, selectedData.order, user);
            // Salvo campo custom SENT_TO_TESTING su ordine e su figli/nipoti...
            await updateCustomSentTotTestingOrder(plant, selectedData.order, user);
            // Eseguo invio a testing dei difetti
            await updateTestingDefects(plant, selectedData.order);
            // Eseguo invio a testing delle modifiche
            await updateTestingModifiche(plant, selectedData.project_parent, selectedData.wbs, selectedData.material);
            // generazione del PDF del verbale di ispezione
            var base64PDF = await generateInspectionPDF(plant, dataCollections, ncCustomTable, resultCustomTable, selectedData, user);
            await saveWorkInstructionPDF(base64PDF, "Verbale_Ispezione_"+selectedData.sfc, plant);
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
            const { plant, sfc } = req.body;
            var base64 = await getWorkInstructionPDF(plant, "Verbale_Ispezione_" + sfc);
            res.status(200).json({ base64: base64 });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per ottenere i filtri per Verbal Management
    app.post("/api/getFilterVerbalManagement", async (req, res) => {
        try {
            const { plant } = req.body;
            const filters = await getFilterVerbalManagement(plant);
            if (filters === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(filters);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per popolare la tabella del Verbal Management con filtri opzionali
    app.post("/api/getVerbalManagementTable", async (req, res) => {
        try {
            const { plant, project, co, order, customer, showAll } = req.body;
            const tableData = await getVerbalManagementTable(plant, project, co, order, customer, showAll);
            if (tableData === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(tableData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per popolare la TreeTable del Verbal Management Detail
    app.post("/api/getVerbalManagementTreeTable", async (req, res) => {
        try {
            const { plant, order } = req.body;
            const treeTableData = await getVerbalManagementTreeTable(plant, order);
            if (treeTableData === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(treeTableData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

}