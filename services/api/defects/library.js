const { callPatch } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getDefectsTesting, getInfoDefectToPDF } = require("../../postgres-db/services/defect/library");
const { callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const PDFDocument = require("pdfkit");
const bodyParser = require("body-parser");
const { PDFDocument: PDFLib, StandardFonts, rgb } = require("pdf-lib");

async function updateCustomDefectOrder(plant,order,value){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"DEFECTS",
        "value": value
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    let response = await callPatch(url,body);
}

async function getDefectsTestingData(plant, project) {
    try {
        // Step 1: Recupero MFG_ORDER dalla tabella ORDER_CUSTOM_DATA con COMMESSA = project
        const orderFilter = `(DATA_FIELD eq 'COMMESSA' and DATA_FIELD_VALUE eq '${project}' and IS_DELETED eq 'false')`;
        const mockReqOrder = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${orderFilter})` },
            method: "GET"
        };
        const orderResult = await dispatch(mockReqOrder);
        const orders = (orderResult?.data?.value && orderResult.data.value.length > 0) 
            ? orderResult.data.value.map(item => item.MFG_ORDER) 
            : [];

        if (orders.length === 0) {
            return [];
        }

        // Step 2: Recupero difetti da z_defects con status='OPEN'
        const defects = await getDefectsTesting(orders);

        if (defects.length === 0) {
            return [];
        }

        // Step 3: Recupero descrizioni per NC_CODE e NC_GROUP tramite API
        const processedDefects = [];
        
        for (const defect of defects) {
            // Recupero descrizione NC_CODE
            let codeDescription = "";
            if (defect.code) {
                try {
                    const codeUrl = `${hostname}/nonconformancecode/v1/nonconformancecodes?plant=${plant}&code=${defect.code}`;
                    const codeResponse = await callGet(codeUrl);
                    if (codeResponse && codeResponse.length > 0) {
                        codeDescription = codeResponse[0].description || "";
                    }
                } catch (error) {
                    console.log(`Error fetching NC code description for ${defect.code}: ${error.message}`);
                }
            }

            // Recupero descrizione NC_GROUP
            let groupDescription = "";
            if (defect.group) {
                try {
                    const groupUrl = `${hostname}/nonconformancegroup/v1/nonconformancegroups?plant=${plant}&group=${defect.group}`;
                    const groupResponse = await callGet(groupUrl);
                    if (groupResponse && groupResponse.length > 0) {
                        groupDescription = groupResponse[0].description || "";
                    }
                } catch (error) {
                    console.log(`Error fetching NC group description for ${defect.group}: ${error.message}`);
                }
            }

            processedDefects.push({
                ...defect,
                codeDescription: codeDescription,
                groupDescription: groupDescription
            });
        }

        // Step 4: Creo tree table raggruppata per nc_group
        const treeTable = [];
        
        for (const defect of processedDefects) {
            // Elemento figlio (dettaglio NC_CODE) - livello 2
            const child = {
                level: 2,
                nc_code_or_group: defect.code,
                nc_description: defect.codeDescription,
                wbs_element: defect.wbe || "",
                material: defect.material || "",
                priority: defect.priority || "",
                user: defect.user || "",
                phase: defect.phase || "",
                status: defect.status || "",
                qn: defect.qn_code || "",
                owner: defect.owner || "", // nuova colonna
                due_date: defect.due_date || "", // nuova colonna
                id: defect.id,
                sfc: defect.sfc || ""
            };

            // Cerco se esiste già il gruppo parent
            const existingGroup = treeTable.find(item => item.nc_code_or_group === defect.group);
            
            if (!existingGroup) {
                // Creo nuovo gruppo parent - livello 1
                treeTable.push({
                    level: 1,
                    nc_code_or_group: defect.group,
                    nc_description: defect.groupDescription,
                    children: [child]
                });
            } else {
                // Aggiungo al gruppo esistente
                existingGroup.children.push(child);
            }
        }

        return treeTable;

    } catch (error) {
        console.error("Error in getDefectsTestingData:", error);
        return false;
    }
}

async function getInfoDefectPDF(info, sfc, wbe, workCenter) {
    var base64PDF = await generateInfoDefectPDF(info, sfc, wbe, workCenter);
    return base64PDF;
}

// Funzione per generare e scaricare il PDF info difetti
async function generateInfoDefectPDF(info, sfc, wbe, workCenter) {

    // Svolgo una query per il recuper delle informazioni necessarie
    dataForPDF = await getInfoDefectToPDF(info);

    return new Promise((resolve, reject) => {
        try {

            const doc = new PDFDocument({ margin: 50 });
            doc.fontSize(12).font('Helvetica-Bold');
            /**
             * Disegna il piè di pagina con la data in basso a destra
             */
            const footerDate = new Date().toLocaleDateString('it-IT', {
                timeZone: 'Europe/Rome',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const drawFooter = () => {
                const pageWidth = doc.page.width;
                const footerText = footerDate;
                
                doc.fontSize(8).font('Helvetica')
                   .fillColor('#808080')
                   .text(footerText, pageWidth - 100, 20, {
                       width: 50,
                       align: 'right'
                   });
                // Ripristina il colore nero per il testo successivo
                doc.fillColor('#000000');
            };

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
            doc.fontSize(20).font('Helvetica-Bold').text('INFORMAZIONI DIFETTO', { align: 'center' });
            doc.moveDown(1);

            // Informazioni dalla testata (selectedData)
            doc.fontSize(12).font('Helvetica-Bold');

            if (sfc) {
                doc.text(`SFC: `, 50, doc.y, { continued: true }).font('Helvetica').text(sfc);
                doc.moveDown(0.5);
            }
            if (wbe) {
                doc.font('Helvetica-Bold').text(`WBE: `, 50, doc.y, { continued: true }).font('Helvetica').text(wbe);
                doc.moveDown(0.5);
            }
            if (workCenter) {
                doc.font('Helvetica-Bold').text(`Work Center: `, 50, doc.y, { continued: true }).font('Helvetica').text(workCenter);
                doc.moveDown(0.5);
            }

            // Data e ora di generazione (fuso orario CET/CEST)
            const now = new Date();
            const formattedDate = now.toLocaleString('it-IT', {
                timeZone: 'Europe/Rome',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(',', '');

            doc.moveDown(1);

            // Mostrare le informazioni del difetto
            if (dataForPDF && typeof dataForPDF === 'object' && Object.keys(dataForPDF).length > 0) {

                // Configurazione tabella
                const tableStartX = 50;
                const tableWidth = doc.page.width - 100;
                const colKeyWidth = tableWidth * 0.35;
                const colValueWidth = tableWidth * 0.65;
                const cellPadding = 5;
                const rowHeight = 25;

                let currentY = doc.y;

                // Intestazione tabella
                doc.rect(tableStartX, currentY, colKeyWidth, rowHeight).fillAndStroke('#e0e0e0', '#000000');
                doc.rect(tableStartX + colKeyWidth, currentY, colValueWidth, rowHeight).fillAndStroke('#e0e0e0', '#000000');
                
                doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
                doc.text('Chiave', tableStartX + cellPadding, currentY + cellPadding, { width: colKeyWidth - cellPadding * 2 });
                doc.text('Valore', tableStartX + colKeyWidth + cellPadding, currentY + cellPadding, { width: colValueWidth - cellPadding * 2 });

                currentY += rowHeight;

                // Righe della tabella per ogni chiave-valore
                doc.font('Helvetica').fontSize(9);
                const infoKeys = Object.keys(dataForPDF);

                for (const key of infoKeys) {
                    const value = dataForPDF[key] !== null && dataForPDF[key] !== undefined ? String(dataForPDF[key]) : '';

                    if (value === '') continue; // Salta chiavi con valori vuoti

                    // Calcola l'altezza necessaria per il testo
                    const keyHeight = doc.heightOfString(key, { width: colKeyWidth - cellPadding * 2 });
                    const valueHeight = doc.heightOfString(value, { width: colValueWidth - cellPadding * 2 });
                    const dynamicRowHeight = Math.max(rowHeight, Math.max(keyHeight, valueHeight) + cellPadding * 2);

                    // Verifica se serve una nuova pagina
                    if (currentY + dynamicRowHeight > doc.page.height - 50) {
                        doc.addPage();
                        drawFooter();
                        currentY = 50;
                    }

                    // Disegna le celle
                    doc.rect(tableStartX, currentY, colKeyWidth, dynamicRowHeight).stroke('#000000');
                    doc.rect(tableStartX + colKeyWidth, currentY, colValueWidth, dynamicRowHeight).stroke('#000000');

                    // Inserisce il testo
                    doc.fillColor('#000000');
                    doc.text(key, tableStartX + cellPadding, currentY + cellPadding, { width: colKeyWidth - cellPadding * 2 });
                    doc.text(value, tableStartX + colKeyWidth + cellPadding, currentY + cellPadding, { width: colValueWidth - cellPadding * 2 });

                    currentY += dynamicRowHeight;
                }

                doc.moveDown(1);
            }

            // Finalizza il documento
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}



module.exports = { updateCustomDefectOrder, getDefectsTestingData, getInfoDefectPDF };