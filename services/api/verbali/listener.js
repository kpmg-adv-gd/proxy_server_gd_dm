const { callGet, callGetFile } = require("../../../utility/CommonCallApi");
const { generatePdfFineCollaudo, getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly, getWBEVerbaliSupervisoreAssembly, getVerbaliTileSupervisoreTesting, getProjectsVerbaliTileSupervisoreTesting, updateCustomAssemblyReportStatusOrderDone, updateCustomSentTotTestingOrder, generateInspectionPDF, sendToTestingAdditionalOperations, updateTestingDefects, updateTestingModifiche, getFilterVerbalManagement, getVerbalManagementTable, getVerbalManagementTreeTable, saveVerbalManagementTreeTableChanges, releaseVerbalManagement, getFilterSafetyApproval, getSafetyApprovalData, doSafetyApproval, doCancelSafety, getFilterFinalCollaudo, getFinalCollaudoData, getActivitiesTestingData, updateCustomField } = require("./library");
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
    // Endpoint per ottenere i WBE per filtro su supervisore assembly
    app.post("/api/getWBEVerbaliSupervisoreAssembly", async (req, res) => {
        try {
            const { plant } = req.body;
            const wbe = await getWBEVerbaliSupervisoreAssembly(plant);
            if (wbe === false) {
                res.status(500).json({ error: "Error while executing query" });
                return;
            }
            res.status(200).json(wbe);
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
            const { plant, sfc, isTesting } = req.body;
            let nameWi = "Verbale_Ispezione_" + sfc;
            if(isTesting) nameWi = "Collaudo_Finale_Testing_" + sfc;
            var base64 = await getWorkInstructionPDF(plant, nameWi);
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

    // Endpoint per salvare le modifiche alla TreeTable del Verbal Management
    app.post("/api/saveVerbalManagementTreeTableChanges", async (req, res) => {
        try {
            const { plant, order, level1Changes, level2Changes, newLevel1, newLevel2, newLevel3, deletedLevel1 } = req.body;
            await saveVerbalManagementTreeTableChanges(plant, order, level1Changes, level2Changes, newLevel1, newLevel2, newLevel3, deletedLevel1);
            res.status(200).json({ message: "Changes saved successfully" });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/releaseVerbalManagement", async (req, res) => {
        try {
            const { plant, order } = req.body;
            await releaseVerbalManagement(plant, order);
            res.status(200).json({ message: "Verbal released successfully" });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getFilterSafetyApproval", async (req, res) => {
        try {
            const { plant } = req.body;
            const filters = await getFilterSafetyApproval(plant);
            res.status(200).json(filters);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getSafetyApprovalData", async (req, res) => {
        try {
            const { plant, project, sfc, co, startDate, endDate, showAll } = req.body;
            const data = await getSafetyApprovalData(plant, project, sfc, co, startDate, endDate, showAll);
            res.status(200).json(data);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/doSafetyApproval", async (req, res) => {
        try {
            const { plant, sfc, idLev2, machineType, user, comment } = req.body;
            const result = await doSafetyApproval(plant, sfc, idLev2, machineType, user, comment);
            res.status(200).json({ success: result });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/doCancelSafety", async (req, res) => {
        try {
            const { plant, sfc, idLev2, user } = req.body;
            const result = await doCancelSafety(plant, sfc, idLev2, user);
            res.status(200).json({ success: result });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getFilterFinalCollaudo", async (req, res) => {
        try {
            const { plant } = req.body;
            const filters = await getFilterFinalCollaudo(plant);
            res.status(200).json(filters);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getFinalCollaudoData", async (req, res) => {
        try {
            const { plant, project, sfc, co, customer, showAll, sentToInstallation } = req.body;
            const data = await getFinalCollaudoData(plant, project, sfc, co, customer, showAll, sentToInstallation);
            res.status(200).json(data);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint per recuperare activities Testing in formato tree table
    app.post("/api/getActivitiesTesting", async (req, res) => {
        try {
            const { plant, project } = req.body;
            if (!plant || !project) {
                return res.status(400).json({ error: "Missing required parameters: plant, project" });
            }

            const result = await getActivitiesTestingData(plant, project);
            
            if (result === false) {
                return res.status(500).json({ error: "Error retrieving activities testing data" });
            }

            res.status(200).json(result);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error in getActivitiesTesting:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Endpoint unificato per generare pdf report di fine collaudo + aggiornare custom fields + salvare come WI
    app.post("/api/generateFinalCollaudoRelation", async (req, res) => {
        try {
            const { plant, order, sfc, customFieldsUpdate, pdfData } = req.body;
            
            // Validazione input
            if (!pdfData) {
                return res.status(400).json({ error: "Missing required parameter: pdfData" });
            }
            
            if (!plant || !order || !sfc) {
                return res.status(400).json({ error: "Missing required parameters: plant, order, sfc" });
            }

            // Step 1: Aggiorna i custom fields (se presenti)
            if (customFieldsUpdate && Array.isArray(customFieldsUpdate) && customFieldsUpdate.length > 0) {
                // Verifica che ogni elemento dell'array abbia customField e customValue
                for (const field of customFieldsUpdate) {
                    if (!field.customField || field.customValue === undefined) {
                        return res.status(400).json({ error: "Each element in customFieldsUpdate must have customField and customValue properties" });
                    }
                }
                
                console.log(`Updating custom fields for order ${order}...`);
                await updateCustomField(plant, order, customFieldsUpdate);
                console.log("Custom fields updated successfully");
            }

            // Step 2: Genera il PDF
            console.log("Generating PDF...");
            const pdfBytes = await generatePdfFineCollaudo(pdfData);
            
            if (!pdfBytes || pdfBytes.length === 0) {
                return res.status(500).json({ error: "PDF generation failed: empty result" });
            }
            
            // Converti pdfBytes in base64
            const base64PDF = Buffer.from(pdfBytes).toString('base64');
            
            // Step 3: Salva come Work Instruction
            const wiName = `Collaudo_Finale_Testing_${sfc}`;
            
            console.log(`Saving PDF as Work Instruction: ${wiName}...`);
            const wiResult = await saveWorkInstructionPDF(base64PDF, wiName, plant, "Collaudo Finale Testing");
            
            if (!wiResult.success) {
                console.error("Work Instruction save failed:", wiResult.error);
                return res.status(500).json({ error: `PDF generated but failed to save as Work Instruction: ${wiResult.error}` });
            }
            
            console.log("Work Instruction saved successfully");
            
            // Restituisci il PDF al client
            res.status(200).json({ info: "Work Instruction saved successfully" });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error in generate-pdf:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });
}