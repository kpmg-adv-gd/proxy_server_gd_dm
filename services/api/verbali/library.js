const { callPatch } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { ordersChildrenRecursion } = require("../../postgres-db/services/verbali/library");
const PDFDocument = require("pdfkit");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

// Funzione per ottenere i verbali del supervisore assembly
async function getVerbaliSupervisoreAssembly(plant, project, wbs, showAll) {
    var results = [];
    try {
        const filter = `(DATA_FIELD eq 'ORDER_TYPE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'MACH')`;
        const mockReq = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter})` },
            method: "GET"
        };
        var outMock = await dispatch(mockReq);
        var orders = outMock?.data?.value.length>0 ? outMock.data.value : [];
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            var data = { order: mfg_order };
            // Recupero progetto
            var projectFilter = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqProject = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${projectFilter})` },
                method: "GET"
            };
            var outMockProject = await dispatch(mockReqProject);
            var projectData = outMockProject?.data?.value.length>0 ? outMockProject.data.value : [];
            if (projectData.length > 0) data.project = projectData[0].DATA_FIELD_VALUE;
            else continue;
            // Recupero WBS
            var wbsFilter = `(DATA_FIELD eq 'WBE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqWbs = { 
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${wbsFilter})` },
                method: "GET"
            };
            var outMockWbs = await dispatch(mockReqWbs);
            var wbsData = outMockWbs?.data?.value.length>0 ? outMockWbs.data.value : [];
            if (wbsData.length > 0) data.wbs = wbsData[0].DATA_FIELD_VALUE;
            else continue;
            // Recupero SFC - Material - Status (diverso di INVALID)
            var sfcFilter = `(MFG_ORDER eq '${mfg_order}' and STATUS ne 'INVALID' and PLANT eq '${plant}')`;
            var mockReqSfc = {
                path: "/mdo/SFC",
                query: { $apply: `filter(${sfcFilter})` },
                method: "GET"
            };
            var outMockSfc = await dispatch(mockReqSfc);
            var sfcData = outMockSfc?.data?.value.length>0 ? outMockSfc.data.value : [];
            if (sfcData.length > 0) { data.sfc = sfcData[0].SFC; data.material = sfcData[0].MATERIAL; data.status = sfcData[0].STATUS; }
            else continue;
            // Recupero Report Status
            var reportStatusFilter = `(DATA_FIELD eq 'ASSEMBLY_REPORT_STATUS' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqReportStatus = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${reportStatusFilter})` },
                method: "GET"
            };
            var outMockReportStatus = await dispatch(mockReqReportStatus);
            var reportStatusData = outMockReportStatus?.data?.value.length>0 ? outMockReportStatus.data.value : [];
            if (reportStatusData.length > 0) data.reportStatus = reportStatusData[0].DATA_FIELD_VALUE;
            else data.reportStatus = "";
            // Filtri su progetto e wbs
            if (project != "" && data.project != project) continue;
            if (wbs != "" && data.wbs != wbs) continue;
            if (!showAll && data.reportStatus === "DONE") continue;
            // Aggiungo elemento
            results.push(data);
        }
        // Una volta estratti i dati, genero la TreeTable
        return generateTreeTable(results);
    } catch (error) {
        return false
    }
}

// Funzione per ottenere i progetti per filtro su supervisore assembly
async function getProjectsVerbaliSupervisoreAssembly(plant) {
    var projects = [];
    try {
        const filter = `(DATA_FIELD eq 'ORDER_TYPE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'MACH')`;
        const mockReq = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter})` },
            method: "GET"
        };
        var outMock = await dispatch(mockReq);
        var orders = outMock?.data?.value.length>0 ? outMock.data.value : [];
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            // Recupero progetto
            var projectFilter = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqProject = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${projectFilter})` },
                method: "GET"
            };
            var outMockProject = await dispatch(mockReqProject);
            var projectData = outMockProject?.data?.value.length>0 ? outMockProject.data.value : [];
            if (projectData.length > 0 && !projects.some(p => p.project === projectData[0].DATA_FIELD_VALUE)) 
                projects.push({ project: projectData[0].DATA_FIELD_VALUE });
        }
        return projects;
    } catch (error) {
        return false;
    }
}

async function updateCustomAssemblyReportStatusOrderInWork(plant,order) {
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute":"ASSEMBLY_REPORT_STATUS", "value": "IN_WORK" },
    ];
    let body={
        "plant":plant,
        "order":order,
        "customValues": customValues
    };
    await callPatch(url,body);
}

async function updateCustomAssemblyReportStatusOrderDone(plant,order,user){
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute":"ASSEMBLY_REPORT_STATUS", "value": "DONE" },
        { "attribute":"ASSEMBLY_REPORT_USER", "value": user },
    ];
    let body={
        "plant":plant,
        "order":order,
        "customValues": customValues
    };
    await callPatch(url,body);
}

async function updateCustomSentTotTestingOrder(plant,order,user) {
    var ordersToCheck = await ordersChildrenRecursion(plant, order);
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [ { "attribute":"SENT_TO_TESTING", "value": true } ];
    // Salvo il campo custom per ogni ordine trovato
    for (var i = 0; i < ordersToCheck.length; i++) {
        let body={
            "plant":plant,
            "order":ordersToCheck[i],
            "customValues": customValues
        };
        await callPatch(url,body);
    }
}

// Funzione per generare e scaricare il file del verbale di ispezione
async function downloadInspectionReportPDF(dataCollections, selectedData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            // Raccoglie i chunk del PDF in memoria
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                const base64PDF = pdfBuffer.toString('base64');
                resolve(base64PDF);
            });
            doc.on('error', reject);

            // TESTATA - Header del documento
            doc.fontSize(20).font('Helvetica-Bold').text('VERBALE DI ISPEZIONE', { align: 'center' });
            doc.moveDown(1);

            // Informazioni dalla testata (selectedData)
            doc.fontSize(12).font('Helvetica-Bold');
            
            if (selectedData?.sfc) {
                doc.text(`SFC: `, { continued: true }).font('Helvetica').text(selectedData.sfc);
            }
            if (selectedData?.parent_project) {
                doc.font('Helvetica-Bold').text(`Progetto: `, { continued: true }).font('Helvetica').text(selectedData.project);
            }
            if (selectedData?.material) {
                doc.font('Helvetica-Bold').text(`Materiale: `, { continued: true }).font('Helvetica').text(selectedData.material);
            }

            doc.moveDown(1.5);
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
            doc.moveDown(1);

            // DATA COLLECTIONS - Sezioni con parametri
            if (dataCollections && dataCollections.length > 0) {
                dataCollections.forEach((collection, index) => {
                    // Verifica se serve una nuova pagina
                    if (doc.y > doc.page.height - 150) {
                        doc.addPage();
                    }

                    // Titolo della sezione
                    doc.fontSize(14).font('Helvetica-Bold')
                        .text(`${collection.description || 'Data Collection'}`, { underline: true });
                    doc.moveDown(0.5);

                    // Informazioni aggiuntive della collection
                    doc.fontSize(10).font('Helvetica');
                    if (collection.version) {
                        doc.text(`Versione: ${collection.version}`);
                    }

                    doc.moveDown(0.5);

                    // Aggiungo eventuale parametro aggiuntivo di voto se presente
                    if (collection.voteSection != null) {
                        collection.parameters.push({
                            parameterName: collection.voteNameSection,
                            valueText: collection.voteSection,
                            dataType: "TEXT",
                            comment: "",
                        });
                    }

                    // Parametri della collection
                    if (collection.parameters && Array.isArray(collection.parameters) && collection.parameters.length > 0) {
                        doc.fontSize(11).font('Helvetica-Bold').text('Parametri:');
                        doc.moveDown(0.5);

                        // Definizione delle colonne della tabella
                        const tableTop = doc.y;
                        const colWidths = {
                            nome: 200,
                            valore: 150,
                            commento: 150
                        };
                        const colPositions = {
                            nome: 50,
                            valore: 50 + colWidths.nome + 10,
                            commento: 50 + colWidths.nome + colWidths.valore + 20
                        };

                        // Disegna intestazione tabella
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.rect(colPositions.nome, doc.y, colWidths.nome, 20).stroke();
                        doc.rect(colPositions.valore, doc.y, colWidths.valore, 20).stroke();
                        doc.rect(colPositions.commento, doc.y, colWidths.commento, 20).stroke();
                        
                        const headerY = doc.y + 6;
                        doc.text('Nome Parametro', colPositions.nome + 5, headerY, { width: colWidths.nome - 10, align: 'left' });
                        doc.text('Valore', colPositions.valore + 5, headerY, { width: colWidths.valore - 10, align: 'left' });
                        doc.text('Commento', colPositions.commento + 5, headerY, { width: colWidths.commento - 10, align: 'left' });
                        
                        doc.y += 20;

                        // Disegna righe della tabella
                        collection.parameters.forEach((param, paramIndex) => {
                            // Determina il valore del parametro
                            let value = 'N/A';
                            if (param.valueText !== undefined && param.valueText !== null) {
                                value = param.valueText;
                            } else if (param.valueNumber !== undefined && param.valueNumber !== null) {
                                value = param.valueNumber.toString();
                            } else if (param.valueData !== undefined && param.valueData !== null) {
                                value = param.valueData;
                            } else if (param.valueBoolean !== undefined && param.valueBoolean !== null) {
                                value = param.valueBoolean ? 'Sì' : 'No';
                            } else if (param.valueList !== undefined && param.valueList !== null) {
                                value = Array.isArray(param.valueList) ? param.valueList.join(', ') : param.valueList;
                            }

                            const nome = param.description || 'Parametro';
                            const commento = param.comment || '';

                            // Calcola l'altezza necessaria per il testo più lungo
                            const nomeHeight = doc.heightOfString(nome, { width: colWidths.nome - 10 });
                            const valoreHeight = doc.heightOfString(value.toString(), { width: colWidths.valore - 10 });
                            const commentoHeight = doc.heightOfString(commento, { width: colWidths.commento - 10 });
                            const rowHeight = Math.max(nomeHeight, valoreHeight, commentoHeight) + 10;

                            // Verifica se serve una nuova pagina
                            if (doc.y + rowHeight > doc.page.height - 100) {
                                doc.addPage();
                                doc.y = 50;
                            }

                            const rowY = doc.y;

                            // Disegna bordi della riga
                            doc.rect(colPositions.nome, rowY, colWidths.nome, rowHeight).stroke();
                            doc.rect(colPositions.valore, rowY, colWidths.valore, rowHeight).stroke();
                            doc.rect(colPositions.commento, rowY, colWidths.commento, rowHeight).stroke();

                            // Scrivi il contenuto (salva e ripristina Y per ogni cella)
                            doc.fontSize(9).font('Helvetica');
                            
                            const textY = rowY + 5;
                            doc.text(nome, colPositions.nome + 5, textY, { width: colWidths.nome - 10, align: 'left', lineBreak: true });
                            
                            doc.text(value.toString(), colPositions.valore + 5, textY, { width: colWidths.valore - 10, align: 'left', lineBreak: true });
                            
                            doc.text(commento, colPositions.commento + 5, textY, { width: colWidths.commento - 10, align: 'left', lineBreak: true });

                            doc.y = rowY + rowHeight;
                        });
                    } else {
                        doc.fontSize(10).font('Helvetica-Oblique').text('  Nessun parametro disponibile');
                    }

                    // Reset posizione X e Y dopo la tabella
                    doc.x = 50;
                    doc.moveDown(1);
                    
                    // Separatore tra sezioni (tranne l'ultima)
                    if (index < dataCollections.length - 1) {
                        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
                        doc.moveDown(1);
                    }
                });
            } else {
                doc.fontSize(12).font('Helvetica-Oblique').text('Nessuna data collection disponibile', { align: 'center' });
            }

            // Aggiungi footer a tutte le pagine
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).font('Helvetica')
                    .text(`Pagina ${i + 1} di ${range.count}`, 
                          50, 
                          doc.page.height - 50, 
                          { align: 'center' });
            }

            // Finalizza il documento
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}   

// utils
function generateTreeTable(data) { 
    var tree = [];
    for (var i = 0; i < data.length; i++) {
        var child = {
            project_parent: data[i].project,
            wbs: data[i].wbs,
            sfc: data[i].sfc,
            material: data[i].material,
            status: data[i].status,
            reportStatus: data[i].reportStatus,
            order: data[i].order
        }
        if (!tree.some(e => e.project === data[i].project)) {
            tree.push({ project: data[i].project, Children: [child] });
        } else {
            tree.find(e => e.project === data[i].project).Children.push(child);
        }
    }
    return tree;
}



// Esporta la funzione
module.exports = { getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly, generateTreeTable, updateCustomAssemblyReportStatusOrderDone, updateCustomAssemblyReportStatusOrderInWork, updateCustomSentTotTestingOrder, downloadInspectionReportPDF };