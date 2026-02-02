const { callPost, callPatch, callGet, callPut } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { ordersChildrenRecursion, getVerbaleLev2ByOrder, getVerbaleLev3ByOrder, updateVerbaleLev2, duplicateVerbaleLev2, duplicateVerbaleLev3, duplicateMarkingRecap, deleteVerbaleLev2, deleteVerbaleLev3, deleteMarkingRecap, duplicateMarkingTesting, deleteMarkingTesting, getSfcFromComments, getSafetyApprovalCommentsData, updateCommentApprovalStatus, updateCommentCancelStatus, unblockVerbaleLev2, getVerbaleLev2ToUnblock, getActivitiesTesting } = require("../../postgres-db/services/verbali/library");
const { getDefectsToVerbale, updateDefectsToTesting } = require("../../postgres-db/services/defect/library");
const { getModificheToVerbaleTesting, updateModificheToTesting } = require("../../postgres-db/services/modifiche/library");
const { getAdditionalOperationsToVerbale, insertZAddtionalOperations } = require("../../postgres-db/services/additional_operations/library");
const { getZOrdersLinkByPlantProjectAndParentOrder } = require("../../postgres-db/services/orders_link/library");
const { getZMancantiReportDataToVerbale } = require("../../postgres-db/services/mancanti/library");
const { getMappingPhase } = require("../../postgres-db/services/mapping_phases/library");
const { manageRelease } = require("../../iFlow/RELEASE_ORDER_SFC/library");
const PDFDocument = require("pdfkit");
const bodyParser = require("body-parser");
const { PDFDocument: PDFLib, StandardFonts, rgb } = require("pdf-lib");
const fetch = require("node-fetch");
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
        var orders = outMock?.data?.value.length > 0 ? outMock.data.value : [];
        // rientro nella MDO con la lista degli ordini trovati (creo lista di OR)
        var ordersList = orders.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        if (project != "") {
            const filter2 = `(DATA_FIELD eq 'COMMESSA' and DATA_FIELD_VALUE eq '${project}' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersList}))`;
            const mockReq2 = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${filter2})` },
                method: "GET"
            };
            var outMock2 = await dispatch(mockReq2);
            var orders = outMock2?.data?.value.length > 0 ? outMock2.data.value : [];
        }
        // Ciclo gli ordini trovati
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            var data = { order: mfg_order };
            var url = hostname + "/order/v1/orders?order=" + mfg_order + "&plant=" + plant;
            var orderResponse = await callGet(url);
            data.wbs = orderResponse?.customValues?.filter(item => item.attribute == "WBE")[0]?.value || "";
            data.material = orderResponse?.customValues?.filter(item => item.attribute == "SEZIONE MACCHINA")[0]?.value || "";
            data.project = orderResponse?.customValues?.filter(item => item.attribute == "COMMESSA")[0]?.value || "";
            data.reportStatus = orderResponse?.customValues?.filter(item => item.attribute == "ASSEMBLY_REPORT_STATUS")[0]?.value || "";
            data.idReportWeight = orderResponse?.customValues?.filter(item => item.attribute == "ASSEMBLY_REPORT_WEIGHT_ID")[0]?.value || "";
            if (!showAll && data.reportStatus === "DONE") continue;
            data.sfc = orderResponse?.sfcs?.length > 0 ? orderResponse.sfcs[0] : "";
            if (data.wbs == "" || data.material == "" || data.project == "" || data.sfc == "") continue;
            // Recupero status con api sfcdetail
            try {
                var urlStatus = hostname + "/sfc/v1/sfcdetail?plant=" + plant + "&sfc=" + data.sfc;
                let responseGetSfc = await callGet(urlStatus);
                data.status = responseGetSfc.status.description;
            } catch (error) {
                continue;
            }
            // Filtri su progetto e wbs
            if (project != "" && data.project != project) continue;
            if (wbs != "" && data.wbs != wbs) continue;
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
        var projectFilter = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false')`;
        var mockReqProject = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${projectFilter})` },
            method: "GET"
        };
        var outMockProject = await dispatch(mockReqProject);
        for (var i=0; i<outMockProject.data.value.length; i++) {
            var projectData = outMockProject.data.value[i];
            if (!projects.some(p => p.project === projectData.DATA_FIELD_VALUE))
                projects.push({ project: projectData.DATA_FIELD_VALUE });
        }
        return projects;
    } catch (error) {
        return false;
    }
}

// Funzione per ottenere i WBE per filtro su supervisore assembly
async function getWBEVerbaliSupervisoreAssembly(plant) {
    var wbe = [];
    try {
        var wbeFilter = `(DATA_FIELD eq 'WBE' and PLANT eq '${plant}' AND IS_DELETED eq 'false')`;
        var mockReqWBE = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${wbeFilter})` },
            method: "GET"
        };
        var outMockWBE = await dispatch(mockReqWBE);
        for (var i=0; i<outMockWBE.data.value.length; i++) {
            var wbeData = outMockWBE.data.value[i];
            if (!wbe.some(p => p.wbe === wbeData.DATA_FIELD_VALUE))
                wbe.push({ wbe: wbeData.DATA_FIELD_VALUE });
        }
        return wbe;
    } catch (error) {
        return false;
    }
}

async function getVerbaliTileSupervisoreTesting(plant, project, wbs, startDate, endDate) {
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
        // rientro nella MDO con la lista degli ordini trovati (creo lista di OR)
        var ordersList = orders.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        if (project != "") {
            const filter2 = `(DATA_FIELD eq 'COMMESSA' and DATA_FIELD_VALUE eq '${project}' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersList}))`;
            const mockReq2 = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${filter2})` },
                method: "GET"
            };
            var outMock2 = await dispatch(mockReq2);
            var orders = outMock2?.data?.value.length>0 ? outMock2.data.value : [];
        }
        // Ciclo gli ordini trovati
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            var data = { order: mfg_order };
            var url = hostname + "/order/v1/orders?order=" + mfg_order + "&plant=" + plant;
            var orderResponse = await callGet(url);
            data.wbs = orderResponse?.customValues?.filter(item => item.attribute == "WBE")[0]?.value || "";
            data.material  = orderResponse?.customValues?.filter(item => item.attribute == "SEZIONE MACCHINA")[0]?.value || "";
            data.project = orderResponse?.customValues?.filter(item => item.attribute == "COMMESSA")[0]?.value || "";
            data.reportStatus = orderResponse?.customValues?.filter(item => item.attribute == "ASSEMBLY_REPORT_STATUS")[0]?.value || "";
            if (data.reportStatus !== "DONE") continue;
            data.sfc = orderResponse?.sfcs?.length > 0 ? orderResponse.sfcs[0] : "";
            if (data.wbs == "" || data.material == "" || data.project == "" || data.sfc == "") continue;
            
            // Recupero data ASSEMBLY_REPORT_DATE
            var dateFilter = `(DATA_FIELD eq 'ASSEMBLY_REPORT_DATE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqDate = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${dateFilter})` },
                method: "GET"
            };
            var outMockDate = await dispatch(mockReqDate);
            var dateData = outMockDate?.data?.value.length>0 ? outMockDate.data.value : [];
            data.assemblyReportDate = dateData.length > 0 ? dateData[0].DATA_FIELD_VALUE : "";
            
            // Recupero user ASSEMBLY_REPORT_USER
            var userFilter = `(DATA_FIELD eq 'ASSEMBLY_REPORT_USER' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqUser = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${userFilter})` },
                method: "GET"
            };
            var outMockUser = await dispatch(mockReqUser);
            var userData = outMockUser?.data?.value.length>0 ? outMockUser.data.value : [];
            data.user = userData.length > 0 ? userData[0].DATA_FIELD_VALUE : "";
            
            // Recupero status con api sfcdetail
            try {
                var urlStatus = hostname + "/sfc/v1/sfcdetail?plant="+plant+"&sfc="+data.sfc;
                let responseGetSfc = await callGet(urlStatus);
                data.status = responseGetSfc.status.description;
            } catch (error) {
                continue;
            }
            // Filtri su progetto e wbs
            if (project != "" && data.project != project) continue;
            if (wbs != "" && data.wbs != wbs) continue;
            
            // Filtro su date - conversione formati con gestione fuso orario italiano
            if (startDate != "" ) {
                if(!data.assemblyReportDate) continue;
                // Parsing assemblyReportDate da formato italiano "DD/MM/YYYY HH:MM:SS" (orario italiano)
                const [datePart, timePart] = data.assemblyReportDate.split(' ');
                const [day, month, year] = datePart.split('/');
                const [hours, minutes, seconds] = timePart.split(':');
                // Creo la data in UTC sottraendo 1 ora (UTC+1 in inverno) o 2 ore (UTC+2 in estate)
                const assemblyDateLocal = new Date(year, month - 1, day, hours, minutes, seconds);
                // Calcolo offset italiano in millisecondi (differenza tra locale e UTC)
                const italianOffset = 60 * 60 * 1000; // 1 ora in millisecondi per orario invernale
                const assemblyDate = new Date(assemblyDateLocal.getTime() - italianOffset);
                const startDateObj = new Date(startDate);
                if (assemblyDate < startDateObj) continue;
            }
            if (endDate != "") {
                if(!data.assemblyReportDate) continue;
                // Parsing assemblyReportDate da formato italiano "DD/MM/YYYY HH:MM:SS" (orario italiano)
                const [datePart, timePart] = data.assemblyReportDate.split(' ');
                const [day, month, year] = datePart.split('/');
                const [hours, minutes, seconds] = timePart.split(':');
                // Creo la data in UTC sottraendo 1 ora (UTC+1 in inverno) o 2 ore (UTC+2 in estate)
                const assemblyDateLocal = new Date(year, month - 1, day, hours, minutes, seconds);
                const italianOffset = 60 * 60 * 1000; // 1 ora in millisecondi per orario invernale
                const assemblyDate = new Date(assemblyDateLocal.getTime() - italianOffset);
                const endDateObj = new Date(endDate);
                if (assemblyDate > endDateObj) continue;
            }
            
            // Aggiungo elemento
            results.push(data);
        }
        // Una volta estratti i dati, genero la TreeTable
        return generateTreeTable(results);
    } catch (error) {
        return false
    }
}

// Funzione per ottenere i progetti per filtro su tile supervsiore testing
async function getProjectsVerbaliTileSupervisoreTesting(plant) {
    var projects = [];
    try {
        // Step 1: Individuare tutte le macchine
        const filter = `(DATA_FIELD eq 'ORDER_TYPE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'MACH')`;
        const mockReq = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter})` },
            method: "GET"
        };
        var outMock = await dispatch(mockReq);
        var orders = outMock?.data?.value.length>0 ? outMock.data.value : [];
        
        // Step 2: Individuare le macchine che hanno il verbale completato
        var completedOrders = [];
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            var statusFilter = `(DATA_FIELD eq 'ASSEMBLY_REPORT_STATUS' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}' AND DATA_FIELD_VALUE eq 'DONE')`;
            var mockReqStatus = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${statusFilter})` },
                method: "GET"
            };
            var outMockStatus = await dispatch(mockReqStatus);
            var statusData = outMockStatus?.data?.value.length>0 ? outMockStatus.data.value : [];
            if (statusData.length > 0) {
                completedOrders.push(mfg_order);
            }
        }
        
        // Step 3: Individuare il progetto associato alle macchine con verbale completato
        for (var i = 0; i < completedOrders.length; i++) {
            var mfg_order = completedOrders[i];
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

// Funzione per aggiornare lo stato del verbale di ispezione su IN_WORK
async function updateCustomAssemblyReportStatusOrderInWork(plant, order) {
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute": "ASSEMBLY_REPORT_STATUS", "value": "IN_WORK" },
    ];
    let body = {
        "plant": plant,
        "order": order,
        "customValues": customValues
    };
    await callPatch(url, body);
}
// Funzione per aggiornare lo stato del verbale di ispezione con ID report weight
async function updateCustomAssemblyReportStatusIdReportWeight(plant, order, idReportWeight) {
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute": "ASSEMBLY_REPORT_WEIGHT_ID", "value": idReportWeight },
    ];
    let body = {
        "plant": plant,
        "order": order,
        "customValues": customValues
    };
    await callPatch(url, body);
}

async function updateCustomTestingReportStatusOrderInWork(plant, order) {
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute": "TESTING_REPORT_STATUS", "value": "IN_WORK" },
    ];
    let body = {
        "plant": plant,
        "order": order,
        "customValues": customValues
    };
    await callPatch(url, body);
}

// Funzione per aggiornare lo stato del verbale di ispezione su DONE e salvare l'utente che ha generato il verbale
async function updateCustomAssemblyReportStatusOrderDone(plant, order, user) {
    let url = hostname + "/order/v1/orders/customValues";
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
    let customValues = [
        { "attribute": "ASSEMBLY_REPORT_STATUS", "value": "DONE" },
        { "attribute": "ASSEMBLY_REPORT_USER", "value": user },
        { "attribute": "ASSEMBLY_REPORT_DATE", "value": formattedDate },
    ];
    let body = {
        "plant": plant,
        "order": order,
        "customValues": customValues
    };
    await callPatch(url, body);
}

// Funzione per aggiornare il campo custom SENT_TO_TESTING a true su ordine e su figli/nipoti...
async function updateCustomSentTotTestingOrder(plant, order, user) {
    var ordersToCheck = await ordersChildrenRecursion(plant, order);
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [{ "attribute": "SENT_TO_TESTING", "value": true }];
    // Salvo il campo custom per ogni ordine trovato
    for (var i = 0; i < ordersToCheck.length; i++) {
        let body = {
            "plant": plant,
            "order": ordersToCheck[i],
            "customValues": customValues
        };
        await callPatch(url, body);
    }
}

// Funzione pe aggiornare i difetti da inviare a testing
async function updateTestingDefects(plant, order) {
    var ordersToCheck = await ordersChildrenRecursion(plant, order);
    await updateDefectsToTesting(plant, ordersToCheck);
}

// Funzione pe aggiornare modifiche da inviare a testing
async function updateTestingModifiche(plant, project, wbeMachine, section) {
    await updateModificheToTesting(plant, wbeMachine, section, project);
}

// Funzione per eseguire invio al Testing Additional Operations
async function sendToTestingAdditionalOperations(plant, selectedData) {
    // Recupero info ordine principale
    var url = hostname + "/order/v1/orders?order=" + selectedData.order + "&plant=" + plant;
    var order = await callGet(url);
    var commessa = order?.customValues?.find(obj => obj.attribute == "COMMESSA")?.value || "";
    var sezioneMacchina = order?.customValues?.find(obj => obj.attribute == "SEZIONE MACCHINA")?.value || "";
    var material = order.material?.material || "";
    // Recupero child order
    var childOrders = await getZOrdersLinkByPlantProjectAndParentOrder(plant, commessa, selectedData.order);
    childOrders.push({ plant: plant, child_order: selectedData.order, project: commessa, child_material: material, machine_section: sezioneMacchina }); // Aggiungo anche l'ordine principale
    var resultOrders = [];
    var index = 0;
    while (index < childOrders.length) {
        // controllo che questo ordine non l'ho già analizzato
        if (resultOrders.some(item => item.order === childOrders[index].child_order)) {
            index++;
            continue;
        }
        // Check sullo stato degli ordini sul valore "executionStatus"
        var url = hostname + "/order/v1/orders?order=" + childOrders[index].child_order + "&plant=" + childOrders[index].plant;
        var selectedOrder = await callGet(url); 
        if (selectedOrder.executionStatus != 'COMPLETED' && selectedOrder.executionStatus != 'DISCARDED' && selectedOrder.executionStatus != 'HOLD') {
            var orderType = selectedOrder?.customValues?.find(obj => obj.attribute == "ORDER_TYPE")?.value || "";
            var ecoType = selectedOrder?.customValues?.find(obj => obj.attribute == "ECO_TYPE")?.value || "";
            if (ecoType == "MA" && (orderType == "ZPA1" || orderType == "ZPA2" || orderType == "ZPF1" || orderType == "ZPF2" || orderType == "GRPF" || orderType == "ZMGF")) {
                // escludo l'ordine
            }else {
                // Check superato
                var sfcOrder = {
                    plant: childOrders[index].plant,
                    project: childOrders[index].project,
                    section: childOrders[index].machine_section,
                    order: childOrders[index].child_order,
                    material: childOrders[index].child_material,
                    sfc: selectedOrder.sfcs[0],
                    routing: selectedOrder.routing.routing,
                    routingType: selectedOrder.routing.routingType,
                    routingVersion: selectedOrder.routing.version,
                    operations: []
                };
                // Se ho aggiunto l'elemento, allora estraggo le operazioni partendo dall'sfc
                var url = hostname + "/sfc/v1/sfcdetail?plant=" + plant + "&sfc=" + sfcOrder.sfc;
                var response = await callGet(url);
                var stepNotDone = response?.steps?.filter(step => step.stepDone == false) || [];
                for (var j = 0; j < stepNotDone.length; j++) {
                    var item = stepNotDone[j];
                    var opt = {
                        stepId: item.stepId,
                        operation: item.operation.operation,
                        operationDescription: item.operation.description,
                        operationStatus: item.quantityInQueue == 1 ? "In Queue" : item.quantityInWork == 1 ? "In Work" : null,
                        workCenter: item.plannedWorkCenter
                    }
                    // Recupero campi custom
                    var url = hostname + "/routing/v1/routings/routingSteps?plant=" + plant + "&routing=" + sfcOrder.routing + "&type=SHOP_ORDER";
                    var responseRouting = await callGet(url);
                    var selectedOpt = responseRouting?.routingSteps?.filter(item => item.routingOperation.operationActivity.operationActivity == opt.operation).length > 0
                        ? responseRouting.routingSteps.filter(item => item.routingOperation.operationActivity.operationActivity == opt.operation)[0] : null;
                    if (selectedOpt != null) {
                        opt.MF = selectedOpt?.routingOperation?.customValues?.filter(obj => obj.attribute == "MF").length > 0 ? selectedOpt.routingOperation.customValues.find(obj => obj.attribute == "MF").value : null;
                        opt.MES_ORDER = selectedOpt?.routingOperation?.customValues?.filter(obj => obj.attribute == "ORDER").length > 0 ? selectedOpt.routingOperation.customValues.find(obj => obj.attribute == "ORDER").value : null;
                    }
                    // Recupero ulteriori dettagli, dai campi custom
                    if (opt.MES_ORDER != null) {
                        var urlMesOrder = hostname + "/order/v1/orders?order=" + opt.MES_ORDER + "&plant=" + sfcOrder.plant;
                        var mesOrder = await callGet(urlMesOrder);
                        opt.groupCode = mesOrder?.material?.material;
                        opt.groupDescription = mesOrder?.material?.description;
                    }
                    if (opt.MF != null) {
                        var productionPhase = await getMappingPhase(plant, opt.MF);
                        opt.phase = productionPhase.length > 0 ? productionPhase[0].production_phase : null;
                    }
                    sfcOrder.operations.push(opt);
                }
                resultOrders.push(sfcOrder);
            }
        }
        // Aggiungo i figli/nipoti
        var moreOrders = await getZOrdersLinkByPlantProjectAndParentOrder(plant, commessa, childOrders[index].child_order);
        childOrders = childOrders.concat(moreOrders);
        index++;
    }
    // Creazione dei dati estratti nel Testing
    await insertZAddtionalOperations(resultOrders);
    return true;
}


// Funzione per generare e scaricare il file del verbale di ispezione
async function generateInspectionPDF(plant, dataCollections, ncCustomTable, resultCustomTable, selectedData, user) {

    var ordersToCheck = await ordersChildrenRecursion(plant, selectedData.order);
    /* Recupero le sezioni aggiuntive da mostrare dopo la lista delle dc (con i parametri) */
    var defects = await getDefectsToVerbale(plant, ordersToCheck);
    var modifiche = await getModificheToVerbaleTesting(plant, selectedData.project_parent, selectedData.wbs, selectedData.material);
    var additionalOperations = await getAdditionalOperationsToVerbale(plant, selectedData.project_parent, selectedData.material);
    var mancanti = await getZMancantiReportDataToVerbale(plant, selectedData.project_parent, ordersToCheck);

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
                doc.text(`SFC: `, 50, doc.y, { continued: true }).font('Helvetica').text(selectedData.sfc);
                doc.moveDown(0.5);
            }
            if (selectedData?.project_parent) {
                doc.font('Helvetica-Bold').text(`Progetto: `, 50, doc.y, { continued: true }).font('Helvetica').text(selectedData.project_parent);
                doc.moveDown(0.5);
            }
            if (selectedData?.material) {
                doc.font('Helvetica-Bold').text(`Materiale: `, 50, doc.y, { continued: true }).font('Helvetica').text(selectedData.material);
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
            doc.font('Helvetica').fontSize(10).text(`Verbale generato da `, { continued: true }).font('Helvetica-Bold').text(`${user}`, { continued: true }).font('Helvetica').text(` in data `, { continued: true }).font('Helvetica-Bold').text(`${formattedDate}`);
            doc.moveDown(0.5);

            //doc.moveDown(1.5);
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
            doc.moveDown(1);

            // SEZIONE DATA COLLECTIONS - Sezioni con parametri
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

                    doc.moveDown(0.5);

                    // Aggiungo eventuale parametro aggiuntivo di voto se presente
                    if (collection.voteSection != null) {
                        collection.parameters.push({
                            parameterName: collection.voteNameSection,
                            description: collection.voteNameSectionDesc,
                            valueText: collection.voteSection,
                            dataType: "TEXT",
                            comment: "",
                        });
                    }

                    // TABELLA NON CONFORMITA' PENDING (se richiesta per questa collection)
                    if (collection.viewCustomTableNC === true && ncCustomTable && ncCustomTable.length > 0) {
                        doc.x = 50;
                        doc.moveDown(1);

                        // Sottotitolo per la tabella NC
                        doc.fontSize(12).font('Helvetica-Bold')
                            .text('Non Conformità Pending', { align: 'left' });
                        doc.moveDown(0.5);

                        // Definizione colonne
                        const colWidthsNC = {
                            priority: 80,
                            description: 200,
                            quantity: 70,
                            weight: 70,
                            value: 70
                        };
                        const colPositionsNC = {
                            priority: 50,
                            description: 50 + colWidthsNC.priority + 2,
                            quantity: 50 + colWidthsNC.priority + colWidthsNC.description + 4,
                            weight: 50 + colWidthsNC.priority + colWidthsNC.description + colWidthsNC.quantity + 6,
                            value: 50 + colWidthsNC.priority + colWidthsNC.description + colWidthsNC.quantity + colWidthsNC.weight + 8
                        };

                        // Intestazione tabella
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.rect(colPositionsNC.priority, doc.y, colWidthsNC.priority, 20).stroke();
                        doc.rect(colPositionsNC.description, doc.y, colWidthsNC.description, 20).stroke();
                        doc.rect(colPositionsNC.quantity, doc.y, colWidthsNC.quantity, 20).stroke();
                        doc.rect(colPositionsNC.weight, doc.y, colWidthsNC.weight, 20).stroke();
                        doc.rect(colPositionsNC.value, doc.y, colWidthsNC.value, 20).stroke();

                        const headerYNC = doc.y + 6;
                        doc.text('Priority', colPositionsNC.priority + 5, headerYNC, { width: colWidthsNC.priority - 10, align: 'left' });
                        doc.text('Description', colPositionsNC.description + 5, headerYNC, { width: colWidthsNC.description - 10, align: 'left' });
                        doc.text('Quantity', colPositionsNC.quantity + 5, headerYNC, { width: colWidthsNC.quantity - 10, align: 'left' });
                        doc.text('Weight', colPositionsNC.weight + 5, headerYNC, { width: colWidthsNC.weight - 10, align: 'left' });
                        doc.text('Value', colPositionsNC.value + 5, headerYNC, { width: colWidthsNC.value - 10, align: 'left' });

                        doc.y += 20;

                        // Righe tabella
                        ncCustomTable.forEach(nc => {
                            const priority = nc.priority || 'N/A';
                            const description = nc.description || 'N/A';
                            const weight = nc.weight !== undefined && nc.weight !== null ? nc.weight.toString() : 'N/A';
                            const quantity = nc.quantity !== undefined && nc.quantity !== null ? nc.quantity.toString() : 'N/A';
                            const value = nc.value !== undefined && nc.value !== null ? nc.value.toString() : 'N/A';

                            // Calcola altezza riga
                            const priorityHeight = doc.heightOfString(priority, { width: colWidthsNC.priority - 10 });
                            const descriptionHeight = doc.heightOfString(description, { width: colWidthsNC.description - 10 });
                            const weightHeight = doc.heightOfString(weight, { width: colWidthsNC.weight - 10 });
                            const quantityHeight = doc.heightOfString(quantity, { width: colWidthsNC.quantity - 10 });
                            const valueHeight = doc.heightOfString(value, { width: colWidthsNC.value - 10 });
                            const rowHeight = Math.max(priorityHeight, descriptionHeight, weightHeight, quantityHeight, valueHeight) + 10;

                            // Nuova pagina se necessario
                            if (doc.y + rowHeight > doc.page.height - 100) {
                                doc.addPage();
                                doc.y = 50;
                            }

                            const rowY = doc.y;
                            doc.rect(colPositionsNC.priority, rowY, colWidthsNC.priority, rowHeight).stroke();
                            doc.rect(colPositionsNC.description, rowY, colWidthsNC.description, rowHeight).stroke();
                            doc.rect(colPositionsNC.quantity, rowY, colWidthsNC.quantity, rowHeight).stroke();
                            doc.rect(colPositionsNC.weight, rowY, colWidthsNC.weight, rowHeight).stroke();
                            doc.rect(colPositionsNC.value, rowY, colWidthsNC.value, rowHeight).stroke();

                            doc.fontSize(9).font('Helvetica');
                            const textY = rowY + 5;
                            doc.text(priority, colPositionsNC.priority + 5, textY, { width: colWidthsNC.priority - 10, align: 'left', lineBreak: true });
                            doc.text(description, colPositionsNC.description + 5, textY, { width: colWidthsNC.description - 10, align: 'left', lineBreak: true });
                            doc.text(quantity, colPositionsNC.quantity + 5, textY, { width: colWidthsNC.quantity - 10, align: 'left', lineBreak: true });
                            doc.text(weight, colPositionsNC.weight + 5, textY, { width: colWidthsNC.weight - 10, align: 'left', lineBreak: true });
                            doc.text(value, colPositionsNC.value + 5, textY, { width: colWidthsNC.value - 10, align: 'left', lineBreak: true });

                            doc.y = rowY + rowHeight;
                        });
                    }

                    // TABELLA RISULTATO DELL'ISPEZIONE (se richiesta per questa collection)
                    if (collection.viewCustomTableResults === true && resultCustomTable && resultCustomTable.length > 0) {
                        doc.x = 50;
                        doc.moveDown(1);

                        // Sottotitolo per la tabella Risultato
                        doc.fontSize(12).font('Helvetica-Bold')
                            .text('Risultato dell\'Ispezione', { align: 'left' });
                        doc.moveDown(0.5);

                        // Definizione colonne
                        const colWidthsResult = {
                            section: 200,
                            weight: 150,
                            vote: 150
                        };
                        const colPositionsResult = {
                            section: 50,
                            weight: 50 + colWidthsResult.section + 2,
                            vote: 50 + colWidthsResult.section + colWidthsResult.weight + 4
                        };

                        // Intestazione tabella
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.rect(colPositionsResult.section, doc.y, colWidthsResult.section, 20).stroke();
                        doc.rect(colPositionsResult.weight, doc.y, colWidthsResult.weight, 20).stroke();
                        doc.rect(colPositionsResult.vote, doc.y, colWidthsResult.vote, 20).stroke();

                        const headerYResult = doc.y + 6;
                        doc.text('Section', colPositionsResult.section + 5, headerYResult, { width: colWidthsResult.section - 10, align: 'left' });
                        doc.text('Weight', colPositionsResult.weight + 5, headerYResult, { width: colWidthsResult.weight - 10, align: 'left' });
                        doc.text('Vote', colPositionsResult.vote + 5, headerYResult, { width: colWidthsResult.vote - 10, align: 'left' });

                        doc.y += 20;

                        // Righe tabella
                        resultCustomTable.forEach(result => {
                            const section = result.section || 'N/A';
                            const weight = result.weight !== undefined && result.weight !== null ? result.weight.toString() : 'N/A';
                            const vote = result.vote !== undefined && result.vote !== null ? result.vote.toString() : 'N/A';

                            // Calcola altezza riga
                            const sectionHeight = doc.heightOfString(section, { width: colWidthsResult.section - 10 });
                            const weightHeight = doc.heightOfString(weight, { width: colWidthsResult.weight - 10 });
                            const voteHeight = doc.heightOfString(vote, { width: colWidthsResult.vote - 10 });
                            const rowHeight = Math.max(sectionHeight, weightHeight, voteHeight) + 10;

                            // Nuova pagina se necessario
                            if (doc.y + rowHeight > doc.page.height - 100) {
                                doc.addPage();
                                doc.y = 50;
                            }

                            const rowY = doc.y;
                            doc.rect(colPositionsResult.section, rowY, colWidthsResult.section, rowHeight).stroke();
                            doc.rect(colPositionsResult.weight, rowY, colWidthsResult.weight, rowHeight).stroke();
                            doc.rect(colPositionsResult.vote, rowY, colWidthsResult.vote, rowHeight).stroke();

                            doc.fontSize(9).font('Helvetica');
                            const textY = rowY + 5;
                            doc.text(section, colPositionsResult.section + 5, textY, { width: colWidthsResult.section - 10, align: 'left', lineBreak: true });
                            doc.text(weight, colPositionsResult.weight + 5, textY, { width: colWidthsResult.weight - 10, align: 'left', lineBreak: true });
                            doc.text(vote, colPositionsResult.vote + 5, textY, { width: colWidthsResult.vote - 10, align: 'left', lineBreak: true });

                            doc.y = rowY + rowHeight;
                        });
                    }

                    // Parametri della collection
                    if (collection.parameters && Array.isArray(collection.parameters) && collection.parameters.length > 0) {
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
                                value = param.valueBoolean;
                            } else if (param.valueList !== undefined && param.valueList !== null) {
                                value = Array.isArray(param.valueList) ? param.valueList.join(', ') : param.valueList;
                            }

                            const nome = param.description || 'Parametro N/A';
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



            // SEZIONE DIFETTI
            if (defects && defects.length > 0) {
                // Estrai tutti i difetti dai Children della treeTable
                const allDefects = [];
                defects.forEach(group => {
                    if (group.Children && Array.isArray(group.Children)) {
                        allDefects.push(...group.Children);
                    }
                });

                if (allDefects.length > 0) {
                    // Aggiungi sempre una nuova pagina per i difetti
                    doc.addPage();

                    // Reset posizione X
                    doc.x = 50;
                    doc.y = 50;

                    // Titolo sezione difetti con bordo più visibile
                    doc.fontSize(18).font('Helvetica-Bold')
                        .text('SEZIONE DIFETTI', { align: 'center' });
                    doc.moveDown(0.5);
                    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
                    doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).stroke();
                    doc.moveDown(1);
                    doc.moveDown(0.5);

                    // Definizione delle colonne della tabella difetti
                    const colWidthsDefects = {
                        group: 70,
                        code: 70,
                        material: 60,
                        priority: 55,
                        user: 50,
                        phase: 50,
                        status: 50,
                        qn: 50
                    };
                    const colPositionsDefects = {
                        group: 50,
                        code: 50 + colWidthsDefects.group + 2,
                        material: 50 + colWidthsDefects.group + colWidthsDefects.code + 4,
                        priority: 50 + colWidthsDefects.group + colWidthsDefects.code + colWidthsDefects.material + 6,
                        user: 50 + colWidthsDefects.group + colWidthsDefects.code + colWidthsDefects.material + colWidthsDefects.priority + 8,
                        phase: 50 + colWidthsDefects.group + colWidthsDefects.code + colWidthsDefects.material + colWidthsDefects.priority + colWidthsDefects.user + 10,
                        status: 50 + colWidthsDefects.group + colWidthsDefects.code + colWidthsDefects.material + colWidthsDefects.priority + colWidthsDefects.user + colWidthsDefects.phase + 12,
                        qn: 50 + colWidthsDefects.group + colWidthsDefects.code + colWidthsDefects.material + colWidthsDefects.priority + colWidthsDefects.user + colWidthsDefects.phase + colWidthsDefects.status + 14
                    };

                    // Disegna intestazione tabella difetti
                    doc.fontSize(8).font('Helvetica-Bold');
                    doc.rect(colPositionsDefects.group, doc.y, colWidthsDefects.group, 20).stroke();
                    doc.rect(colPositionsDefects.code, doc.y, colWidthsDefects.code, 20).stroke();
                    doc.rect(colPositionsDefects.material, doc.y, colWidthsDefects.material, 20).stroke();
                    doc.rect(colPositionsDefects.priority, doc.y, colWidthsDefects.priority, 20).stroke();
                    doc.rect(colPositionsDefects.user, doc.y, colWidthsDefects.user, 20).stroke();
                    doc.rect(colPositionsDefects.phase, doc.y, colWidthsDefects.phase, 20).stroke();
                    doc.rect(colPositionsDefects.status, doc.y, colWidthsDefects.status, 20).stroke();
                    doc.rect(colPositionsDefects.qn, doc.y, colWidthsDefects.qn, 20).stroke();

                    const headerYDefects = doc.y + 6;
                    doc.text('Group', colPositionsDefects.group + 2, headerYDefects, { width: colWidthsDefects.group - 4, align: 'left' });
                    doc.text('Code', colPositionsDefects.code + 2, headerYDefects, { width: colWidthsDefects.code - 4, align: 'left' });
                    doc.text('Material', colPositionsDefects.material + 2, headerYDefects, { width: colWidthsDefects.material - 4, align: 'left' });
                    doc.text('Priority', colPositionsDefects.priority + 2, headerYDefects, { width: colWidthsDefects.priority - 4, align: 'left' });
                    doc.text('User', colPositionsDefects.user + 2, headerYDefects, { width: colWidthsDefects.user - 4, align: 'left' });
                    doc.text('Phase', colPositionsDefects.phase + 2, headerYDefects, { width: colWidthsDefects.phase - 4, align: 'left' });
                    doc.text('Status', colPositionsDefects.status + 2, headerYDefects, { width: colWidthsDefects.status - 4, align: 'left' });
                    doc.text('QN', colPositionsDefects.qn + 2, headerYDefects, { width: colWidthsDefects.qn - 4, align: 'left' });

                    doc.y += 20;

                    // Disegna righe della tabella difetti
                    allDefects.forEach((defect) => {
                        const group = defect.groupDesc || 'N/A';
                        const code = defect.codeDesc || 'N/A';
                        const material = defect.material || 'N/A';
                        const priority = defect.priority_description || 'N/A';
                        const user = defect.user || 'N/A';
                        const phase = defect.phase || 'N/A';
                        const status = defect.status || 'N/A';
                        const qn = defect.qn_code || 'N/A';

                        // Calcola l'altezza necessaria per il testo più lungo
                        const groupHeight = doc.heightOfString(group, { width: colWidthsDefects.group - 4 });
                        const codeHeight = doc.heightOfString(code, { width: colWidthsDefects.code - 4 });
                        const materialHeight = doc.heightOfString(material, { width: colWidthsDefects.material - 4 });
                        const priorityHeight = doc.heightOfString(priority, { width: colWidthsDefects.priority - 4 });
                        const userHeight = doc.heightOfString(user, { width: colWidthsDefects.user - 4 });
                        const phaseHeight = doc.heightOfString(phase, { width: colWidthsDefects.phase - 4 });
                        const statusHeight = doc.heightOfString(status, { width: colWidthsDefects.status - 4 });
                        const qnHeight = doc.heightOfString(qn, { width: colWidthsDefects.qn - 4 });
                        const rowHeight = Math.max(groupHeight, codeHeight, materialHeight, priorityHeight, userHeight, phaseHeight, statusHeight, qnHeight) + 8;

                        // Verifica se serve una nuova pagina
                        if (doc.y + rowHeight > doc.page.height - 100) {
                            doc.addPage();
                            doc.y = 50;
                        }

                        const rowY = doc.y;

                        // Disegna bordi della riga
                        doc.rect(colPositionsDefects.group, rowY, colWidthsDefects.group, rowHeight).stroke();
                        doc.rect(colPositionsDefects.code, rowY, colWidthsDefects.code, rowHeight).stroke();
                        doc.rect(colPositionsDefects.material, rowY, colWidthsDefects.material, rowHeight).stroke();
                        doc.rect(colPositionsDefects.priority, rowY, colWidthsDefects.priority, rowHeight).stroke();
                        doc.rect(colPositionsDefects.user, rowY, colWidthsDefects.user, rowHeight).stroke();
                        doc.rect(colPositionsDefects.phase, rowY, colWidthsDefects.phase, rowHeight).stroke();
                        doc.rect(colPositionsDefects.status, rowY, colWidthsDefects.status, rowHeight).stroke();
                        doc.rect(colPositionsDefects.qn, rowY, colWidthsDefects.qn, rowHeight).stroke();

                        // Scrivi il contenuto
                        doc.fontSize(7).font('Helvetica');

                        const textY = rowY + 4;
                        doc.text(group, colPositionsDefects.group + 2, textY, { width: colWidthsDefects.group - 4, align: 'left', lineBreak: true });
                        doc.text(code, colPositionsDefects.code + 2, textY, { width: colWidthsDefects.code - 4, align: 'left', lineBreak: true });
                        doc.text(material, colPositionsDefects.material + 2, textY, { width: colWidthsDefects.material - 4, align: 'left', lineBreak: true });
                        doc.text(priority, colPositionsDefects.priority + 2, textY, { width: colWidthsDefects.priority - 4, align: 'left', lineBreak: true });
                        doc.text(user, colPositionsDefects.user + 2, textY, { width: colWidthsDefects.user - 4, align: 'left', lineBreak: true });
                        doc.text(phase, colPositionsDefects.phase + 2, textY, { width: colWidthsDefects.phase - 4, align: 'left', lineBreak: true });
                        doc.text(status, colPositionsDefects.status + 2, textY, { width: colWidthsDefects.status - 4, align: 'left', lineBreak: true });
                        doc.text(qn, colPositionsDefects.qn + 2, textY, { width: colWidthsDefects.qn - 4, align: 'left', lineBreak: true });

                        doc.y = rowY + rowHeight;
                    });

                    // Reset posizione X dopo la tabella difetti
                    doc.x = 50;
                }
            }

            // SEZIONE MODIFICHE
            if (modifiche && modifiche.length > 0) {
                // Estrai tutti i child dalle modifiche della treeTable
                const allModificheChildren = [];
                modifiche.forEach(parent => {
                    if (parent.Children && Array.isArray(parent.Children)) {
                        parent.Children.forEach(child => {
                            allModificheChildren.push({
                                type: parent.type,
                                progEco: parent.progEco,
                                processId: parent.processId,
                                material: parent.material,
                                ...child
                            });
                        });
                    }
                });

                if (allModificheChildren.length > 0) {
                    // Aggiungi sempre una nuova pagina per le modifiche
                    doc.addPage();

                    // Reset posizione X
                    doc.x = 50;
                    doc.y = 50;

                    // Titolo sezione modifiche con bordo più visibile
                    doc.fontSize(18).font('Helvetica-Bold')
                        .text('SEZIONE MODIFICHE', { align: 'center' });
                    doc.moveDown(0.5);
                    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
                    doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).stroke();
                    doc.moveDown(1);
                    doc.moveDown(0.5);

                    // Definizione delle colonne della tabella modifiche
                    const colWidthsModifiche = {
                        type: 40,
                        progEco: 60,
                        processId: 60,
                        material: 60,
                        status: 50,
                        fluxType: 50,
                        qty: 35,
                        childMaterial: 60,
                        resolution: 60
                    };
                    const colPositionsModifiche = {
                        type: 50,
                        progEco: 50 + colWidthsModifiche.type + 2,
                        processId: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + 4,
                        material: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + colWidthsModifiche.processId + 6,
                        status: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + colWidthsModifiche.processId + colWidthsModifiche.material + 8,
                        fluxType: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + colWidthsModifiche.processId + colWidthsModifiche.material + colWidthsModifiche.status + 10,
                        qty: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + colWidthsModifiche.processId + colWidthsModifiche.material + colWidthsModifiche.status + colWidthsModifiche.fluxType + 12,
                        childMaterial: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + colWidthsModifiche.processId + colWidthsModifiche.material + colWidthsModifiche.status + colWidthsModifiche.fluxType + colWidthsModifiche.qty + 14,
                        resolution: 50 + colWidthsModifiche.type + colWidthsModifiche.progEco + colWidthsModifiche.processId + colWidthsModifiche.material + colWidthsModifiche.status + colWidthsModifiche.fluxType + colWidthsModifiche.qty + colWidthsModifiche.childMaterial + 16
                    };

                    // Disegna intestazione tabella modifiche
                    doc.fontSize(7).font('Helvetica-Bold');
                    doc.rect(colPositionsModifiche.type, doc.y, colWidthsModifiche.type, 20).stroke();
                    doc.rect(colPositionsModifiche.progEco, doc.y, colWidthsModifiche.progEco, 20).stroke();
                    doc.rect(colPositionsModifiche.processId, doc.y, colWidthsModifiche.processId, 20).stroke();
                    doc.rect(colPositionsModifiche.material, doc.y, colWidthsModifiche.material, 20).stroke();
                    doc.rect(colPositionsModifiche.status, doc.y, colWidthsModifiche.status, 20).stroke();
                    doc.rect(colPositionsModifiche.fluxType, doc.y, colWidthsModifiche.fluxType, 20).stroke();
                    doc.rect(colPositionsModifiche.qty, doc.y, colWidthsModifiche.qty, 20).stroke();
                    doc.rect(colPositionsModifiche.childMaterial, doc.y, colWidthsModifiche.childMaterial, 20).stroke();
                    doc.rect(colPositionsModifiche.resolution, doc.y, colWidthsModifiche.resolution, 20).stroke();

                    const headerYModifiche = doc.y + 6;
                    doc.text('Type', colPositionsModifiche.type + 2, headerYModifiche, { width: colWidthsModifiche.type - 4, align: 'left' });
                    doc.text('Progr.Eco', colPositionsModifiche.progEco + 2, headerYModifiche, { width: colWidthsModifiche.progEco - 4, align: 'left' });
                    doc.text('Process ID', colPositionsModifiche.processId + 2, headerYModifiche, { width: colWidthsModifiche.processId - 4, align: 'left' });
                    doc.text('Material', colPositionsModifiche.material + 2, headerYModifiche, { width: colWidthsModifiche.material - 4, align: 'left' });
                    doc.text('Status', colPositionsModifiche.status + 2, headerYModifiche, { width: colWidthsModifiche.status - 4, align: 'left' });
                    doc.text('Flux Type', colPositionsModifiche.fluxType + 2, headerYModifiche, { width: colWidthsModifiche.fluxType - 4, align: 'left' });
                    doc.text('Qty', colPositionsModifiche.qty + 2, headerYModifiche, { width: colWidthsModifiche.qty - 4, align: 'left' });
                    doc.text('Child Material', colPositionsModifiche.childMaterial + 2, headerYModifiche, { width: colWidthsModifiche.childMaterial - 4, align: 'left' });
                    doc.text('Resolution', colPositionsModifiche.resolution + 2, headerYModifiche, { width: colWidthsModifiche.resolution - 4, align: 'left' });

                    doc.y += 20;

                    // Disegna righe della tabella modifiche
                    allModificheChildren.forEach((modifica) => {
                        const type = modifica.type || 'N/A';
                        const progEco = modifica.progEco || 'N/A';
                        const processId = modifica.processId || 'N/A';
                        const material = modifica.material || 'N/A';

                        // Mappa lo status numerico in testo
                        let status = 'N/A';
                        if (modifica.status === 0 || modifica.status === '0') {
                            status = 'NEW';
                        } else if (modifica.status === 1 || modifica.status === '1') {
                            status = 'APPLIED';
                        } else if (modifica.status === 2 || modifica.status === '2') {
                            status = 'NOT APPLIED';
                        } else if (modifica.status) {
                            status = modifica.status.toString();
                        }

                        const fluxType = modifica.fluxType || 'N/A';
                        const qty = modifica.qty !== undefined && modifica.qty !== null ? modifica.qty.toString() : 'N/A';
                        const childMaterial = modifica.childMaterial || 'N/A';
                        const resolution = modifica.resolution || 'N/A';

                        // Calcola l'altezza necessaria per il testo più lungo
                        const typeHeight = doc.heightOfString(type, { width: colWidthsModifiche.type - 4 });
                        const progEcoHeight = doc.heightOfString(progEco, { width: colWidthsModifiche.progEco - 4 });
                        const processIdHeight = doc.heightOfString(processId, { width: colWidthsModifiche.processId - 4 });
                        const materialHeight = doc.heightOfString(material, { width: colWidthsModifiche.material - 4 });
                        const statusHeight = doc.heightOfString(status, { width: colWidthsModifiche.status - 4 });
                        const fluxTypeHeight = doc.heightOfString(fluxType, { width: colWidthsModifiche.fluxType - 4 });
                        const qtyHeight = doc.heightOfString(qty, { width: colWidthsModifiche.qty - 4 });
                        const childMaterialHeight = doc.heightOfString(childMaterial, { width: colWidthsModifiche.childMaterial - 4 });
                        const resolutionHeight = doc.heightOfString(resolution, { width: colWidthsModifiche.resolution - 4 });
                        const rowHeight = Math.max(typeHeight, progEcoHeight, processIdHeight, materialHeight, statusHeight, fluxTypeHeight, qtyHeight, childMaterialHeight, resolutionHeight) + 8;

                        // Verifica se serve una nuova pagina
                        if (doc.y + rowHeight > doc.page.height - 100) {
                            doc.addPage();
                            doc.y = 50;
                        }

                        const rowY = doc.y;

                        // Disegna bordi della riga
                        doc.rect(colPositionsModifiche.type, rowY, colWidthsModifiche.type, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.progEco, rowY, colWidthsModifiche.progEco, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.processId, rowY, colWidthsModifiche.processId, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.material, rowY, colWidthsModifiche.material, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.status, rowY, colWidthsModifiche.status, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.fluxType, rowY, colWidthsModifiche.fluxType, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.qty, rowY, colWidthsModifiche.qty, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.childMaterial, rowY, colWidthsModifiche.childMaterial, rowHeight).stroke();
                        doc.rect(colPositionsModifiche.resolution, rowY, colWidthsModifiche.resolution, rowHeight).stroke();

                        // Scrivi il contenuto
                        doc.fontSize(6).font('Helvetica');

                        const textY = rowY + 4;
                        doc.text(type, colPositionsModifiche.type + 2, textY, { width: colWidthsModifiche.type - 4, align: 'left', lineBreak: true });
                        doc.text(progEco, colPositionsModifiche.progEco + 2, textY, { width: colWidthsModifiche.progEco - 4, align: 'left', lineBreak: true });
                        doc.text(processId, colPositionsModifiche.processId + 2, textY, { width: colWidthsModifiche.processId - 4, align: 'left', lineBreak: true });
                        doc.text(material, colPositionsModifiche.material + 2, textY, { width: colWidthsModifiche.material - 4, align: 'left', lineBreak: true });
                        doc.text(status, colPositionsModifiche.status + 2, textY, { width: colWidthsModifiche.status - 4, align: 'left', lineBreak: true });
                        doc.text(fluxType, colPositionsModifiche.fluxType + 2, textY, { width: colWidthsModifiche.fluxType - 4, align: 'left', lineBreak: true });
                        doc.text(qty, colPositionsModifiche.qty + 2, textY, { width: colWidthsModifiche.qty - 4, align: 'left', lineBreak: true });
                        doc.text(childMaterial, colPositionsModifiche.childMaterial + 2, textY, { width: colWidthsModifiche.childMaterial - 4, align: 'left', lineBreak: true });
                        doc.text(resolution, colPositionsModifiche.resolution + 2, textY, { width: colWidthsModifiche.resolution - 4, align: 'left', lineBreak: true });

                        doc.y = rowY + rowHeight;
                    });

                    // Reset posizione X dopo la tabella modifiche
                    doc.x = 50;
                }
            }

            // SEZIONE OPERAZIONI ADDIZIONALI
            if (additionalOperations && additionalOperations.length > 0) {
                doc.addPage();
                doc.x = 50;
                doc.y = 50;

                doc.fontSize(18).font('Helvetica-Bold')
                    .text('SEZIONE OPERAZIONI NON COMPLETATE', { align: 'center' });
                doc.moveDown(0.5);
                doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
                doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).stroke();
                doc.moveDown(1);
                doc.moveDown(0.5);

                // Definizione colonne
                const colWidthsOp = {
                    section: 60, // Machine
                    material: 60,
                    order: 60,
                    group_code: 60,
                    group_description: 80,
                    operation: 60,
                    operation_description: 80
                };
                const colPositionsOp = {
                    section: 50,
                    material: 50 + colWidthsOp.section + 2,
                    order: 50 + colWidthsOp.section + colWidthsOp.material + 4,
                    group_code: 50 + colWidthsOp.section + colWidthsOp.material + colWidthsOp.order + 6,
                    group_description: 50 + colWidthsOp.section + colWidthsOp.material + colWidthsOp.order + colWidthsOp.group_code + 8,
                    operation: 50 + colWidthsOp.section + colWidthsOp.material + colWidthsOp.order + colWidthsOp.group_code + colWidthsOp.group_description + 10,
                    operation_description: 50 + colWidthsOp.section + colWidthsOp.material + colWidthsOp.order + colWidthsOp.group_code + colWidthsOp.group_description + colWidthsOp.operation + 12
                };

                // Intestazione tabella
                doc.fontSize(7).font('Helvetica-Bold');
                doc.rect(colPositionsOp.section, doc.y, colWidthsOp.section, 20).stroke();
                doc.rect(colPositionsOp.material, doc.y, colWidthsOp.material, 20).stroke();
                doc.rect(colPositionsOp.order, doc.y, colWidthsOp.order, 20).stroke();
                doc.rect(colPositionsOp.group_code, doc.y, colWidthsOp.group_code, 20).stroke();
                doc.rect(colPositionsOp.group_description, doc.y, colWidthsOp.group_description, 20).stroke();
                doc.rect(colPositionsOp.operation, doc.y, colWidthsOp.operation, 20).stroke();
                doc.rect(colPositionsOp.operation_description, doc.y, colWidthsOp.operation_description, 20).stroke();

                const headerYOp = doc.y + 6;
                doc.text('Machine', colPositionsOp.section + 2, headerYOp, { width: colWidthsOp.section - 4, align: 'left' });
                doc.text('Order Material', colPositionsOp.material + 2, headerYOp, { width: colWidthsOp.material - 4, align: 'left' });
                doc.text('Order', colPositionsOp.order + 2, headerYOp, { width: colWidthsOp.order - 4, align: 'left' });
                doc.text('Group Code', colPositionsOp.group_code + 2, headerYOp, { width: colWidthsOp.group_code - 4, align: 'left' });
                doc.text('Group Description', colPositionsOp.group_description + 2, headerYOp, { width: colWidthsOp.group_description - 4, align: 'left' });
                doc.text('Operation', colPositionsOp.operation + 2, headerYOp, { width: colWidthsOp.operation - 4, align: 'left' });
                doc.text('Operation Description', colPositionsOp.operation_description + 2, headerYOp, { width: colWidthsOp.operation_description - 4, align: 'left' });

                doc.y += 20;

                // Righe tabella
                additionalOperations.forEach(op => {
                    const section = op.section || 'N/A';
                    const material = op.meterial || op.material || 'N/A';
                    const order = op.order || 'N/A';
                    const group_code = op.group_code || 'N/A';
                    const group_description = op.group_description || 'N/A';
                    const operation = op.operation || 'N/A';
                    const operation_description = op.operation_description || 'N/A';

                    // Calcola altezza riga
                    const sectionHeight = doc.heightOfString(section, { width: colWidthsOp.section - 4 });
                    const materialHeight = doc.heightOfString(material, { width: colWidthsOp.material - 4 });
                    const orderHeight = doc.heightOfString(order, { width: colWidthsOp.order - 4 });
                    const groupCodeHeight = doc.heightOfString(group_code, { width: colWidthsOp.group_code - 4 });
                    const groupDescHeight = doc.heightOfString(group_description, { width: colWidthsOp.group_description - 4 });
                    const operationHeight = doc.heightOfString(operation, { width: colWidthsOp.operation - 4 });
                    const opDescHeight = doc.heightOfString(operation_description, { width: colWidthsOp.operation_description - 4 });
                    const rowHeight = Math.max(sectionHeight, materialHeight, orderHeight, groupCodeHeight, groupDescHeight, operationHeight, opDescHeight) + 8;

                    // Nuova pagina se necessario
                    if (doc.y + rowHeight > doc.page.height - 100) {
                        doc.addPage();
                        doc.y = 50;
                    }

                    const rowY = doc.y;
                    doc.rect(colPositionsOp.section, rowY, colWidthsOp.section, rowHeight).stroke();
                    doc.rect(colPositionsOp.material, rowY, colWidthsOp.material, rowHeight).stroke();
                    doc.rect(colPositionsOp.order, rowY, colWidthsOp.order, rowHeight).stroke();
                    doc.rect(colPositionsOp.group_code, rowY, colWidthsOp.group_code, rowHeight).stroke();
                    doc.rect(colPositionsOp.group_description, rowY, colWidthsOp.group_description, rowHeight).stroke();
                    doc.rect(colPositionsOp.operation, rowY, colWidthsOp.operation, rowHeight).stroke();
                    doc.rect(colPositionsOp.operation_description, rowY, colWidthsOp.operation_description, rowHeight).stroke();

                    doc.fontSize(6).font('Helvetica');
                    const textY = rowY + 4;
                    doc.text(section, colPositionsOp.section + 2, textY, { width: colWidthsOp.section - 4, align: 'left', lineBreak: true });
                    doc.text(material, colPositionsOp.material + 2, textY, { width: colWidthsOp.material - 4, align: 'left', lineBreak: true });
                    doc.text(order, colPositionsOp.order + 2, textY, { width: colWidthsOp.order - 4, align: 'left', lineBreak: true });
                    doc.text(group_code, colPositionsOp.group_code + 2, textY, { width: colWidthsOp.group_code - 4, align: 'left', lineBreak: true });
                    doc.text(group_description, colPositionsOp.group_description + 2, textY, { width: colWidthsOp.group_description - 4, align: 'left', lineBreak: true });
                    doc.text(operation, colPositionsOp.operation + 2, textY, { width: colWidthsOp.operation - 4, align: 'left', lineBreak: true });
                    doc.text(operation_description, colPositionsOp.operation_description + 2, textY, { width: colWidthsOp.operation_description - 4, align: 'left', lineBreak: true });

                    doc.y = rowY + rowHeight;
                });
                doc.x = 50;
            }

            // SEZIONE MANCANTI
            if (mancanti && mancanti.length > 0) {
                doc.addPage();
                doc.x = 50;
                doc.y = 50;

                doc.fontSize(18).font('Helvetica-Bold')
                    .text('SEZIONE MANCANTI', { align: 'center' });
                doc.moveDown(0.5);
                doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
                doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).stroke();
                doc.moveDown(1);
                doc.moveDown(0.5);

                // Definizione colonne per mancanti
                const colWidthsManc = {
                    project: 50,
                    wbs: 50,
                    parentMat: 55,
                    order: 45,
                    material: 55,
                    missingComp: 55,
                    compDesc: 60,
                    missingType: 45,
                    coverType: 45,
                    receiptDate: 50
                };
                const colPositionsManc = {
                    project: 50,
                    wbs: 50 + colWidthsManc.project + 2,
                    parentMat: 50 + colWidthsManc.project + colWidthsManc.wbs + 4,
                    order: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + 6,
                    material: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + colWidthsManc.order + 8,
                    missingComp: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + colWidthsManc.order + colWidthsManc.material + 10,
                    compDesc: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + colWidthsManc.order + colWidthsManc.material + colWidthsManc.missingComp + 12,
                    missingType: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + colWidthsManc.order + colWidthsManc.material + colWidthsManc.missingComp + colWidthsManc.compDesc + 14,
                    coverType: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + colWidthsManc.order + colWidthsManc.material + colWidthsManc.missingComp + colWidthsManc.compDesc + colWidthsManc.missingType + 16,
                    receiptDate: 50 + colWidthsManc.project + colWidthsManc.wbs + colWidthsManc.parentMat + colWidthsManc.order + colWidthsManc.material + colWidthsManc.missingComp + colWidthsManc.compDesc + colWidthsManc.missingType + colWidthsManc.coverType + 18
                };

                // Intestazione tabella mancanti
                doc.fontSize(6).font('Helvetica-Bold');
                doc.rect(colPositionsManc.project, doc.y, colWidthsManc.project, 20).stroke();
                doc.rect(colPositionsManc.wbs, doc.y, colWidthsManc.wbs, 20).stroke();
                doc.rect(colPositionsManc.parentMat, doc.y, colWidthsManc.parentMat, 20).stroke();
                doc.rect(colPositionsManc.order, doc.y, colWidthsManc.order, 20).stroke();
                doc.rect(colPositionsManc.material, doc.y, colWidthsManc.material, 20).stroke();
                doc.rect(colPositionsManc.missingComp, doc.y, colWidthsManc.missingComp, 20).stroke();
                doc.rect(colPositionsManc.compDesc, doc.y, colWidthsManc.compDesc, 20).stroke();
                doc.rect(colPositionsManc.missingType, doc.y, colWidthsManc.missingType, 20).stroke();
                doc.rect(colPositionsManc.coverType, doc.y, colWidthsManc.coverType, 20).stroke();
                doc.rect(colPositionsManc.receiptDate, doc.y, colWidthsManc.receiptDate, 20).stroke();

                const headerYManc = doc.y + 6;
                doc.text('Project', colPositionsManc.project + 2, headerYManc, { width: colWidthsManc.project - 4, align: 'left' });
                doc.text('WBS Element', colPositionsManc.wbs + 2, headerYManc, { width: colWidthsManc.wbs - 4, align: 'left' });
                doc.text('Parent Material', colPositionsManc.parentMat + 2, headerYManc, { width: colWidthsManc.parentMat - 4, align: 'left' });
                doc.text('Group Order', colPositionsManc.order + 2, headerYManc, { width: colWidthsManc.order - 4, align: 'left' });
                doc.text('Group Material', colPositionsManc.material + 2, headerYManc, { width: colWidthsManc.material - 4, align: 'left' });
                doc.text('Missing Component', colPositionsManc.missingComp + 2, headerYManc, { width: colWidthsManc.missingComp - 4, align: 'left' });
                doc.text('Component Description', colPositionsManc.compDesc + 2, headerYManc, { width: colWidthsManc.compDesc - 4, align: 'left' });
                doc.text('Missing Type', colPositionsManc.missingType + 2, headerYManc, { width: colWidthsManc.missingType - 4, align: 'left' });
                doc.text('Cover Element Type', colPositionsManc.coverType + 2, headerYManc, { width: colWidthsManc.coverType - 4, align: 'left' });
                doc.text('Expected Receipt Date', colPositionsManc.receiptDate + 2, headerYManc, { width: colWidthsManc.receiptDate - 4, align: 'left' });

                doc.y += 20;

                // Righe tabella mancanti
                mancanti.forEach(manc => {
                    const project = manc.project || 'N/A';
                    const wbs = manc.wbs_element || 'N/A';
                    const parentMat = manc.parent_material || 'N/A';
                    const order = manc.order || 'N/A';
                    const material = manc.material || 'N/A';
                    const missingComp = manc.missing_component || 'N/A';
                    const compDesc = manc.component_description || 'N/A';
                    const missingType = manc.type_mancante || 'N/A';
                    const coverType = manc.type_cover_element || 'N/A';

                    // Formatta la data in DD/MM/YYYY
                    let receiptDate = 'N/A';
                    if (manc.receipt_expected_date) {
                        try {
                            const date = new Date(manc.receipt_expected_date);
                            if (!isNaN(date.getTime())) {
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                receiptDate = `${day}/${month}/${year}`;
                            }
                        } catch (e) {
                            receiptDate = 'N/A';
                        }
                    }

                    // Calcola altezza riga
                    const projectHeight = doc.heightOfString(project, { width: colWidthsManc.project - 4 });
                    const wbsHeight = doc.heightOfString(wbs, { width: colWidthsManc.wbs - 4 });
                    const parentMatHeight = doc.heightOfString(parentMat, { width: colWidthsManc.parentMat - 4 });
                    const orderHeight = doc.heightOfString(order, { width: colWidthsManc.order - 4 });
                    const materialHeight = doc.heightOfString(material, { width: colWidthsManc.material - 4 });
                    const missingCompHeight = doc.heightOfString(missingComp, { width: colWidthsManc.missingComp - 4 });
                    const compDescHeight = doc.heightOfString(compDesc, { width: colWidthsManc.compDesc - 4 });
                    const missingTypeHeight = doc.heightOfString(missingType, { width: colWidthsManc.missingType - 4 });
                    const coverTypeHeight = doc.heightOfString(coverType, { width: colWidthsManc.coverType - 4 });
                    const receiptDateHeight = doc.heightOfString(receiptDate, { width: colWidthsManc.receiptDate - 4 });
                    const rowHeight = Math.max(projectHeight, wbsHeight, parentMatHeight, orderHeight, materialHeight, missingCompHeight, compDescHeight, missingTypeHeight, coverTypeHeight, receiptDateHeight) + 8;

                    // Nuova pagina se necessario
                    if (doc.y + rowHeight > doc.page.height - 100) {
                        doc.addPage();
                        doc.y = 50;
                    }

                    const rowY = doc.y;
                    doc.rect(colPositionsManc.project, rowY, colWidthsManc.project, rowHeight).stroke();
                    doc.rect(colPositionsManc.wbs, rowY, colWidthsManc.wbs, rowHeight).stroke();
                    doc.rect(colPositionsManc.parentMat, rowY, colWidthsManc.parentMat, rowHeight).stroke();
                    doc.rect(colPositionsManc.order, rowY, colWidthsManc.order, rowHeight).stroke();
                    doc.rect(colPositionsManc.material, rowY, colWidthsManc.material, rowHeight).stroke();
                    doc.rect(colPositionsManc.missingComp, rowY, colWidthsManc.missingComp, rowHeight).stroke();
                    doc.rect(colPositionsManc.compDesc, rowY, colWidthsManc.compDesc, rowHeight).stroke();
                    doc.rect(colPositionsManc.missingType, rowY, colWidthsManc.missingType, rowHeight).stroke();
                    doc.rect(colPositionsManc.coverType, rowY, colWidthsManc.coverType, rowHeight).stroke();
                    doc.rect(colPositionsManc.receiptDate, rowY, colWidthsManc.receiptDate, rowHeight).stroke();

                    doc.fontSize(6).font('Helvetica');
                    const textY = rowY + 4;
                    doc.text(project, colPositionsManc.project + 2, textY, { width: colWidthsManc.project - 4, align: 'left', lineBreak: true });
                    doc.text(wbs, colPositionsManc.wbs + 2, textY, { width: colWidthsManc.wbs - 4, align: 'left', lineBreak: true });
                    doc.text(parentMat, colPositionsManc.parentMat + 2, textY, { width: colWidthsManc.parentMat - 4, align: 'left', lineBreak: true });
                    doc.text(order, colPositionsManc.order + 2, textY, { width: colWidthsManc.order - 4, align: 'left', lineBreak: true });
                    doc.text(material, colPositionsManc.material + 2, textY, { width: colWidthsManc.material - 4, align: 'left', lineBreak: true });
                    doc.text(missingComp, colPositionsManc.missingComp + 2, textY, { width: colWidthsManc.missingComp - 4, align: 'left', lineBreak: true });
                    doc.text(compDesc, colPositionsManc.compDesc + 2, textY, { width: colWidthsManc.compDesc - 4, align: 'left', lineBreak: true });
                    doc.text(missingType, colPositionsManc.missingType + 2, textY, { width: colWidthsManc.missingType - 4, align: 'left', lineBreak: true });
                    doc.text(coverType, colPositionsManc.coverType + 2, textY, { width: colWidthsManc.coverType - 4, align: 'left', lineBreak: true });
                    doc.text(receiptDate, colPositionsManc.receiptDate + 2, textY, { width: colWidthsManc.receiptDate - 4, align: 'left', lineBreak: true });

                    doc.y = rowY + rowHeight;
                });
                doc.x = 50;
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
            idReportWeight: data[i].idReportWeight,
            order: data[i].order,
            assemblyReportDate: data[i].assemblyReportDate || "",
            user: data[i].user || ""
        }
        if (!tree.some(e => e.project === data[i].project)) {
            tree.push({ project: data[i].project, Children: [child] });
        } else {
            tree.find(e => e.project === data[i].project).Children.push(child);
        }
    }
    return tree;
}

// Funzione per recuperare tutti i filtri per Verbal Management (Home)
async function getFilterVerbalManagement(plant) {
    try {
        // Step 1: Recupero tutti i verbali con PHASE='TEST'
        const filterPhase = `(DATA_FIELD eq 'PHASE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'TESTING')`;
        const mockReqPhase = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterPhase})` },
            method: "GET"
        };
        const outMockPhase = await dispatch(mockReqPhase);
        const ordersPhase = outMockPhase?.data?.value?.length > 0 ? outMockPhase.data.value : [];
        
        if (ordersPhase.length === 0) {
            return {
                projects: [],
                cos: [],
                orders: [],
                customers: []
            };
        }

        // Step 2: Filtrare per verbali attivi (EXECUTION_STATUS = 'ACTIVE' OR 'NOT_IN_EXECUTION')
        const ordersList = ordersPhase.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        const filterActive = `(PLANT eq '${plant}' AND (EXECUTION_STATUS eq 'ACTIVE' or EXECUTION_STATUS eq 'NOT_IN_EXECUTION') AND (${ordersList}))`;
        const mockReqActive = {
            path: "/mdo/ORDER",
            query: { $apply: `filter(${filterActive})` },
            method: "GET"
        };
        const outMockActive = await dispatch(mockReqActive);
        const activeOrders = outMockActive?.data?.value?.length > 0 ? outMockActive.data.value : [];
        
        if (activeOrders.length === 0) {
            return {
                projects: [],
                cos: [],
                orders: [],
                customers: []
            };
        }

        // Creo la lista degli ordini attivi
        const activeOrdersList = activeOrders.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        
        // Step 3: Recupero i progetti (COMMESSA)
        const filterProject = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${activeOrdersList}))`;
        const mockReqProject = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterProject})` },
            method: "GET"
        };
        const outMockProject = await dispatch(mockReqProject);
        const projectsData = outMockProject?.data?.value?.length > 0 ? outMockProject.data.value : [];
        
        // Estraggo valori distinti per progetti
        const projects = [...new Set(projectsData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        // Step 4: Recupero i CO
        const filterCO = `(DATA_FIELD eq 'CO_PREV' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${activeOrdersList}))`;
        const mockReqCO = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCO})` },
            method: "GET"
        };
        const outMockCO = await dispatch(mockReqCO);
        const cosData = outMockCO?.data?.value?.length > 0 ? outMockCO.data.value : [];
        
        // Estraggo valori distinti per CO
        const cos = [...new Set(cosData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        // Step 5: Recupero gli ordini (MFG_ORDER)
        const orders = activeOrders.map(item => item.MFG_ORDER);
        
        // Step 6: Recupero i Customer
        const filterCustomer = `(DATA_FIELD eq 'CUSTOMER' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${activeOrdersList}))`;
        const mockReqCustomer = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCustomer})` },
            method: "GET"
        };
        const outMockCustomer = await dispatch(mockReqCustomer);
        const customersData = outMockCustomer?.data?.value?.length > 0 ? outMockCustomer.data.value : [];
        
        // Estraggo valori distinti per Customer
        const customers = [...new Set(customersData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];


         // Step 7: Recupero i Workcenters dalla tabella SAP_MDO_WORKCENTER_V (mi servono dopo per la tree table dei verbali)
        const filterWorkcenter = `(PLANT eq '${plant}' AND STATUS eq 'ENABLED' AND IS_DELETED eq 'false')`;
        const mockReqWorkcenter = {
            path: "/mdo/WORKCENTER",
            query: { $apply: `filter(${filterWorkcenter})` },
            method: "GET"
        };
        const outMockWorkcenter = await dispatch(mockReqWorkcenter);
        const workcentersData = outMockWorkcenter?.data?.value?.length > 0 ? outMockWorkcenter.data.value : [];
        // Estraggo i workcenters con codice e descrizione
        const workcenters = workcentersData.map(item => ({
            workcenter: item.WORKCENTER,
            description: item.DESCRIPTION
        }));
        return {
            projects: projects,
            cos: cos,
            orders: orders,
            customers: customers,
            workcenters: workcenters
        };
    } catch (error) {
        console.error("Error in getFilterVerbalManagement:", error);
        return false;
    }
}

// Funzione per recuperare tutti i filtri per Safety Approval
async function getFilterSafetyApproval(plant) {
    try {
        // Step 1: Recupero tutti gli SFC dalla tabella Z_COMMENTS con comment_type='M'
        const sfcsFromComments = await getSfcFromComments(plant);
        
        if (!sfcsFromComments || sfcsFromComments.length === 0) {
            return {
                projects: [],
                sfcs: [],
                cos: []
            };
        }
        
        // Estraggo la lista degli SFC
        const sfcList = sfcsFromComments.map(item => item.sfc).filter(sfc => sfc);
        
        if (sfcList.length === 0) {
            return {
                projects: [],
                sfcs: [],
                cos: []
            };
        }
        
        // Step 2: Recupero gli MFG_ORDER dalla tabella SAP_MDO_SFC_V con gli SFC trovati
        const sfcFilter = sfcList.map(sfc => `SFC eq '${sfc}'`).join(' or ');
        const filterSFC = `(PLANT eq '${plant}' AND (${sfcFilter}))`;
        const mockReqSFC = {
            path: "/mdo/SFC",
            query: { $apply: `filter(${filterSFC})` },
            method: "GET"
        };
        const outMockSFC = await dispatch(mockReqSFC);
        const sfcData = outMockSFC?.data?.value?.length > 0 ? outMockSFC.data.value : [];
        
        if (sfcData.length === 0) {
            return {
                projects: [],
                sfcs: sfcList,
                cos: []
            };
        }
        
        // Estraggo gli MFG_ORDER
        const ordersList = sfcData.map(item => item.MFG_ORDER).filter(order => order);
        
        if (ordersList.length === 0) {
            return {
                projects: [],
                sfcs: sfcList,
                cos: []
            };
        }
        
        // Creo il filtro per gli ordini
        const ordersFilter = ordersList.map(order => `MFG_ORDER eq '${order}'`).join(' or ');
        
        // Step 3: Recupero i progetti (COMMESSA) dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterProject = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqProject = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterProject})` },
            method: "GET"
        };
        const outMockProject = await dispatch(mockReqProject);
        const projectsData = outMockProject?.data?.value?.length > 0 ? outMockProject.data.value : [];
        
        // Estraggo valori distinti per progetti
        const projects = [...new Set(projectsData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        // Step 4: Recupero i CO dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterCO = `(DATA_FIELD eq 'CO_PREV' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqCO = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCO})` },
            method: "GET"
        };
        const outMockCO = await dispatch(mockReqCO);
        const cosData = outMockCO?.data?.value?.length > 0 ? outMockCO.data.value : [];
        
        // Estraggo valori distinti per CO
        const cos = [...new Set(cosData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        return {
            projects: projects,
            sfcs: sfcList,
            cos: cos
        };
    } catch (error) {
        console.error("Error in getFilterSafetyApproval:", error);
        return false;
    }
}

// Funzione per ottenere i filtri per Final Collaudo
async function getFilterFinalCollaudo(plant) {
    try {
        // Step 1: Recupero tutti gli ordini TESTING dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterPhase = `(DATA_FIELD eq 'PHASE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'TESTING')`;
        const mockReqPhase = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterPhase})` },
            method: "GET"
        };
        const outMockPhase = await dispatch(mockReqPhase);
        const phaseData = outMockPhase?.data?.value?.length > 0 ? outMockPhase.data.value : [];
        
        if (phaseData.length === 0) {
            return {
                projects: [],
                sfcs: [],
                cos: [],
                customers: []
            };
        }
        
        // Estraggo gli MFG_ORDER di tipo TESTING
        const ordersList = phaseData.map(item => item.MFG_ORDER).filter(order => order);
        
        if (ordersList.length === 0) {
            return {
                projects: [],
                sfcs: [],
                cos: [],
                customers: []
            };
        }
        
        // Creo il filtro per gli ordini
        const ordersFilter = ordersList.map(order => `MFG_ORDER eq '${order}'`).join(' or ');
        
        // Step 2: Recupero i progetti (COMMESSA) dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterProject = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqProject = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterProject})` },
            method: "GET"
        };
        const outMockProject = await dispatch(mockReqProject);
        const projectsData = outMockProject?.data?.value?.length > 0 ? outMockProject.data.value : [];
        
        // Estraggo valori distinti per progetti
        const projects = [...new Set(projectsData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        // Step 3: Recupero i CO dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterCO = `(DATA_FIELD eq 'CO_PREV' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqCO = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCO})` },
            method: "GET"
        };
        const outMockCO = await dispatch(mockReqCO);
        const cosData = outMockCO?.data?.value?.length > 0 ? outMockCO.data.value : [];
        
        // Estraggo valori distinti per CO
        const cos = [...new Set(cosData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        // Step 4: Recupero gli SFC dalla tabella SAP_MDO_SFC_V
        const filterSFC = `(PLANT eq '${plant}' AND (${ordersFilter}))`;
        const mockReqSFC = {
            path: "/mdo/SFC",
            query: { $apply: `filter(${filterSFC})` },
            method: "GET"
        };
        const outMockSFC = await dispatch(mockReqSFC);
        const sfcData = outMockSFC?.data?.value?.length > 0 ? outMockSFC.data.value : [];
        
        // Estraggo valori distinti per SFC
        const sfcs = [...new Set(sfcData.map(item => item.SFC).filter(val => val))];
        
        // Step 5: Recupero i Customer dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterCustomer = `(DATA_FIELD eq 'CUSTOMER' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqCustomer = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCustomer})` },
            method: "GET"
        };
        const outMockCustomer = await dispatch(mockReqCustomer);
        const customersData = outMockCustomer?.data?.value?.length > 0 ? outMockCustomer.data.value : [];
        
        // Estraggo valori distinti per Customer
        const customers = [...new Set(customersData.map(item => item.DATA_FIELD_VALUE).filter(val => val))];
        
        return {
            projects: projects,
            sfcs: sfcs,
            cos: cos,
            customers: customers
        };
    } catch (error) {
        console.error("Error in getFilterFinalCollaudo:", error);
        return false;
    }
}

// Funzione per popolare la tabella Final Collaudo con filtri opzionali
async function getFinalCollaudoData(plant, project, sfc, co, customer, showAll, sentToInstallation, showAllSfcStatus) {
    try {
        // Step 1: Recupero tutti gli ordini TESTING dalla tabella SAP_MDO_ORDER_CUSTOM_DATA_V
        const filterPhase = `(DATA_FIELD eq 'PHASE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'TESTING')`;
        const mockReqPhase = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterPhase})` },
            method: "GET"
        };
        const outMockPhase = await dispatch(mockReqPhase);
        const phaseData = outMockPhase?.data?.value?.length > 0 ? outMockPhase.data.value : [];
        
        if (phaseData.length === 0) {
            return [];
        }
        
        // Estraggo gli MFG_ORDER di tipo TESTING
        let ordersList = phaseData.map(item => item.MFG_ORDER).filter(order => order);
        
        if (ordersList.length === 0) {
            return [];
        }
        
        // Step 2: Creo il filtro per gli ordini
        const ordersFilter = ordersList.map(order => `MFG_ORDER eq '${order}'`).join(' or ');
        
        // Step 3: Recupero i progetti (COMMESSA)
        const filterProject = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqProject = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterProject})` },
            method: "GET"
        };
        const outMockProject = await dispatch(mockReqProject);
        const projectsData = outMockProject?.data?.value?.length > 0 ? outMockProject.data.value : [];
        
        // Creo mappa MFG_ORDER -> COMMESSA
        const orderToProjectMap = {};
        projectsData.forEach(item => {
            orderToProjectMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Step 4: Recupero i CO
        const filterCO = `(DATA_FIELD eq 'CO_PREV' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqCO = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCO})` },
            method: "GET"
        };
        const outMockCO = await dispatch(mockReqCO);
        const cosData = outMockCO?.data?.value?.length > 0 ? outMockCO.data.value : [];
        
        // Creo mappa MFG_ORDER -> CO
        const orderToCoMap = {};
        cosData.forEach(item => {
            orderToCoMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Step 5: Recupero i Customer
        const filterCustomer = `(DATA_FIELD eq 'CUSTOMER' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqCustomer = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCustomer})` },
            method: "GET"
        };
        const outMockCustomer = await dispatch(mockReqCustomer);
        const customersData = outMockCustomer?.data?.value?.length > 0 ? outMockCustomer.data.value : [];
        
        // Creo mappa MFG_ORDER -> CUSTOMER
        const orderToCustomerMap = {};
        customersData.forEach(item => {
            orderToCustomerMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Step 6: Recupero gli SFC dalla tabella SAP_MDO_SFC_V
        const filterSFC = `(PLANT eq '${plant}' AND (${ordersFilter}))`;
        const mockReqSFC = {
            path: "/mdo/SFC",
            query: { $apply: `filter(${filterSFC})` },
            method: "GET"
        };
        const outMockSFC = await dispatch(mockReqSFC);
        const sfcData = outMockSFC?.data?.value?.length > 0 ? outMockSFC.data.value : [];
        
        if (sfcData.length === 0) {
            return [];
        }
        
        // Step 7: Recupero TESTING_REPORT_STATUS per tutti gli ordini
        const filterReportStatus = `(DATA_FIELD eq 'TESTING_REPORT_STATUS' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqReportStatus = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterReportStatus})` },
            method: "GET"
        };
        const outMockReportStatus = await dispatch(mockReqReportStatus);
        const reportStatusData = outMockReportStatus?.data?.value?.length > 0 ? outMockReportStatus.data.value : [];
        
        // Creo mappa MFG_ORDER -> TESTING_REPORT_STATUS
        const orderToReportStatusMap = {};
        reportStatusData.forEach(item => {
            orderToReportStatusMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Step 8: Recupero SENT_TO_INSTALLATION per tutti gli ordini
        const filterSentToInstallation = `(DATA_FIELD eq 'SENT_TO_INSTALLATION' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqSentToInstallation = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterSentToInstallation})` },
            method: "GET"
        };
        const outMockSentToInstallation = await dispatch(mockReqSentToInstallation);
        const sentToInstallationData = outMockSentToInstallation?.data?.value?.length > 0 ? outMockSentToInstallation.data.value : [];
        
        // Creo mappa MFG_ORDER -> SENT_TO_INSTALLATION
        const orderToSentToInstallationMap = {};
        sentToInstallationData.forEach(item => {
            orderToSentToInstallationMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Step 9: Costruisco i risultati finali
        const results = [];
        
        for (const sfcItem of sfcData) {
            const order = sfcItem.MFG_ORDER;
            const sfcValue = sfcItem.SFC || '';
            const projectValue = orderToProjectMap[order] || '';
            const coValue = orderToCoMap[order] || '';
            const customerValue = orderToCustomerMap[order] || '';
            const sfcStatus = sfcItem.STATUS || '';
            const reportStatusValue = orderToReportStatusMap[order] || '';
            const sentToInstallationValue = orderToSentToInstallationMap[order] || '';
            
            // Applico i filtri dell'utente
            if (project && project !== '' && projectValue !== project) continue;
            if (sfc && sfc !== '' && sfcValue !== sfc) continue;
            if (co && co !== '' && coValue !== co) continue;
            if (customer && customer !== '' && customerValue !== customer) continue;
            
            // Filtro per sentToInstallation (se specificato)
            if (sentToInstallation !== undefined && sentToInstallation !== null) {
                const isSentToInstallation = sentToInstallationValue === 'true' || sentToInstallationValue === true;
                if (sentToInstallation && !isSentToInstallation) continue;
                if (!sentToInstallation && isSentToInstallation) continue;
            }
            
            // Filtro per showAll (TESTING_REPORT_STATUS)
            if (showAll === false || showAll === 'false') {
                if (reportStatusValue === 'DONE') continue;
            }
            
            // Filtro per showAllSfcStatus (se false, esclude SFC con status DONE)
            if (showAllSfcStatus === false || showAllSfcStatus === 'false') {
                if (sfcStatus === 'DONE') continue;
            }
            
            // Aggiungo la riga al risultato
            results.push({
                project: projectValue,
                sfc: sfcValue,
                co: coValue,
                customer: customerValue,
                sfcStatus: sfcStatus,
                sentToInstallation: sentToInstallationValue === 'true' || sentToInstallationValue === true,
                reportStatus: reportStatusValue,
                order: order
            });
        }
        
        return results;
    } catch (error) {
        console.error("Error in getFinalCollaudoData:", error);
        return false;
    }
}

// Funzione per popolare la tabella Safety Approval con filtri opzionali
async function getSafetyApprovalData(plant, project, sfc, co, startDate, endDate, showAll) {
    try {
        // Step 1: Recupero tutti i commenti di tipo 'M' dalla tabella Z_COMMENTS
        const commentsData = await getSafetyApprovalCommentsData(plant);
        
        if (!commentsData || commentsData.length === 0) {
            return [];
        }
        
        // Step 2: Filtro per status se showAll è false
        let filteredComments = [...commentsData];
        if (showAll === false || showAll === 'false') {
            filteredComments = filteredComments.filter(comment => comment.status === 'Waiting');
        }
        
        if (filteredComments.length === 0) {
            return [];
        }
        
        // Step 3: Filtro per SFC se presente
        if (sfc && sfc !== '') {
            filteredComments = filteredComments.filter(comment => comment.sfc === sfc);
        }
        
        if (filteredComments.length === 0) {
            return [];
        }
        
        // Step 4: Filtro per date range se presente con gestione fuso orario italiano
        if (startDate && startDate !== '') {
            filteredComments = filteredComments.filter(comment => {
                if (!comment.datetime) return false;
                // Parsing DD/MM/YYYY HH24:MI:SS format (orario italiano)
                const [datePart, timePart] = comment.datetime.split(' ');
                const [day, month, year] = datePart.split('/');
                const [hours, minutes, seconds] = timePart.split(':');
                // Creo la data in UTC sottraendo 1 ora (UTC+1 in inverno) o 2 ore (UTC+2 in estate)
                const commentDateLocal = new Date(year, month - 1, day, hours, minutes, seconds);
                const italianOffset = 60 * 60 * 1000; // 1 ora in millisecondi per orario invernale
                const commentDate = new Date(commentDateLocal.getTime() - italianOffset);
                const start = new Date(startDate);
                return commentDate >= start;
            });
        }
        
        if (endDate && endDate !== '') {
            filteredComments = filteredComments.filter(comment => {
                if (!comment.datetime) return false;
                // Parsing DD/MM/YYYY HH24:MI:SS format (orario italiano)
                const [datePart, timePart] = comment.datetime.split(' ');
                const [day, month, year] = datePart.split('/');
                const [hours, minutes, seconds] = timePart.split(':');
                // Creo la data in UTC sottraendo 1 ora (UTC+1 in inverno) o 2 ore (UTC+2 in estate)
                const commentDateLocal = new Date(year, month - 1, day, hours, minutes, seconds);
                const italianOffset = 60 * 60 * 1000; // 1 ora in millisecondi per orario invernale
                const commentDate = new Date(commentDateLocal.getTime() - italianOffset);
                const end = new Date(endDate);
                return commentDate <= end;
            });
        }
        
        if (filteredComments.length === 0) {
            return [];
        }
        
        // Step 5: Recupero gli MFG_ORDER per gli SFC dei commenti filtrati
        const sfcList = [...new Set(filteredComments.map(c => c.sfc).filter(s => s))];
        const sfcFilter = sfcList.map(s => `SFC eq '${s}'`).join(' or ');
        const filterSFC = `(PLANT eq '${plant}' AND (${sfcFilter}))`;
        const mockReqSFC = {
            path: "/mdo/SFC",
            query: { $apply: `filter(${filterSFC})` },
            method: "GET"
        };
        const outMockSFC = await dispatch(mockReqSFC);
        const sfcData = outMockSFC?.data?.value?.length > 0 ? outMockSFC.data.value : [];
        
        // Creo una mappa SFC -> MFG_ORDER
        const sfcToOrderMap = {};
        sfcData.forEach(item => {
            sfcToOrderMap[item.SFC] = item.MFG_ORDER;
        });
        
        // Step 6: Recupero COMMESSA e CO per tutti gli ordini
        const ordersList = [...new Set(sfcData.map(item => item.MFG_ORDER).filter(order => order))];
        
        if (ordersList.length === 0) {
            return [];
        }
        
        const ordersFilter = ordersList.map(order => `MFG_ORDER eq '${order}'`).join(' or ');
        
        // Recupero COMMESSA
        const filterProject = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqProject = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterProject})` },
            method: "GET"
        };
        const outMockProject = await dispatch(mockReqProject);
        const projectsData = outMockProject?.data?.value?.length > 0 ? outMockProject.data.value : [];
        
        // Creo mappa MFG_ORDER -> COMMESSA
        const orderToProjectMap = {};
        projectsData.forEach(item => {
            orderToProjectMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Recupero CO
        const filterCO = `(DATA_FIELD eq 'CO_PREV' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (${ordersFilter}))`;
        const mockReqCO = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCO})` },
            method: "GET"
        };
        const outMockCO = await dispatch(mockReqCO);
        const cosData = outMockCO?.data?.value?.length > 0 ? outMockCO.data.value : [];
        
        // Creo mappa MFG_ORDER -> CO
        const orderToCoMap = {};
        cosData.forEach(item => {
            orderToCoMap[item.MFG_ORDER] = item.DATA_FIELD_VALUE;
        });
        
        // Step 7: Costruisco i risultati finali
        const results = [];
        
        for (const comment of filteredComments) {
            const order = sfcToOrderMap[comment.sfc] || '';
            const projectValue = orderToProjectMap[order] || '';
            const coValue = orderToCoMap[order] || '';
            
            // Applico i filtri rimanenti
            if (project && project !== '' && projectValue !== project) continue;
            if (co && co !== '' && coValue !== co) continue;
            
            // Aggiungo la riga al risultato
            results.push({
                project: projectValue,
                sfc: comment.sfc || '',
                id_lev_2: comment.id_lev_2 || '',
                co: coValue,
                macroActivity: comment.id_lev_2 || '',
                machineType: comment.machine_type || '',
                user: comment.user || '',
                datetime: comment.datetime || '',
                comment: comment.comment || '',
                status: comment.status || '',
                approval_comment: comment.approval_comment || ''
            });
        }
        
        return results;
    } catch (error) {
        console.error("Error in getSafetyApprovalData:", error);
        return false;
    }
}

// Funzione per popolare la tabella del Verbal Management con filtri opzionali
async function getVerbalManagementTable(plant, project, co, order, customer, showAll) {
    try {
        // Step 1: Recupero tutti i verbali di collaudo con PHASE='TESTING'
        const filterPhase = `(DATA_FIELD eq 'PHASE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'TESTING')`;
        const mockReqPhase = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterPhase})` },
            method: "GET"
        };
        const outMockPhase = await dispatch(mockReqPhase);
        const ordersPhase = outMockPhase?.data?.value?.length > 0 ? outMockPhase.data.value : [];
        
        if (ordersPhase.length === 0) {
            return [];
        }

        // Step 2: Filtrare per verbali attivi e applicare filtro showAll
        const ordersList = ordersPhase.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        
        // Costruisco il filtro per RELEASE_STATUS in base a showAll
        let releaseStatusFilter = '';
        if (showAll === false || showAll === 'false') {
            releaseStatusFilter = `RELEASE_STATUS eq 'RELEASABLE'`;
        } else {
            releaseStatusFilter = `(RELEASE_STATUS eq 'RELEASABLE' or RELEASE_STATUS eq 'RELEASED')`;
        }
        
        const filterActive = `(PLANT eq '${plant}' AND (EXECUTION_STATUS eq 'ACTIVE' or EXECUTION_STATUS eq 'NOT_IN_EXECUTION') AND ${releaseStatusFilter} AND (${ordersList}))`;
        const mockReqActive = {
            path: "/mdo/ORDER",
            query: { $apply: `filter(${filterActive})` },
            method: "GET"
        };
        const outMockActive = await dispatch(mockReqActive);
        let activeOrders = outMockActive?.data?.value?.length > 0 ? outMockActive.data.value : [];
        
        if (activeOrders.length === 0) {
            return [];
        }

        // Step 3: Applicare i filtri opzionali dell'utente
        // Creo un array di ordini filtrati
        let filteredOrders = [...activeOrders];
        
        // Filtro per Order specifico se presente (contains)
        if (order && order !== '') {
            filteredOrders = filteredOrders.filter(o => o.MFG_ORDER && o.MFG_ORDER.toUpperCase().includes(order.toUpperCase()));
        }
        
        if (filteredOrders.length === 0) {
            return [];
        }

        // Recupero tutti i custom data per gli ordini filtrati
        const filteredOrdersList = filteredOrders.map(item => `MFG_ORDER eq '${item.MFG_ORDER}'`).join(' or ');
        
        // Recupero i dati custom (COMMESSA, CO, CUSTOMER) per tutti gli ordini
        const filterCustomData = `(PLANT eq '${plant}' AND IS_DELETED eq 'false' AND (DATA_FIELD eq 'COMMESSA' or DATA_FIELD eq 'CO_PREV' or DATA_FIELD eq 'CUSTOMER') AND (${filteredOrdersList}))`;
        const mockReqCustomData = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filterCustomData})` },
            method: "GET"
        };
        const outMockCustomData = await dispatch(mockReqCustomData);
        const customDataList = outMockCustomData?.data?.value?.length > 0 ? outMockCustomData.data.value : [];
        
        // Recupero gli SFC per tutti gli ordini
        const filterSFC = `(PLANT eq '${plant}' AND (${filteredOrdersList}))`;
        const mockReqSFC = {
            path: "/mdo/SFC",
            query: { $apply: `filter(${filterSFC})` },
            method: "GET"
        };
        const outMockSFC = await dispatch(mockReqSFC);
        const sfcList = outMockSFC?.data?.value?.length > 0 ? outMockSFC.data.value : [];
        
        // Step 4: Costruisco i risultati finali
        const results = [];
        
        for (const orderData of filteredOrders) {
            const mfgOrder = orderData.MFG_ORDER;
            
            // Estraggo i custom data per questo ordine
            const orderCustomData = customDataList.filter(cd => cd.MFG_ORDER === mfgOrder);
            const projectValue = orderCustomData.find(cd => cd.DATA_FIELD === 'COMMESSA')?.DATA_FIELD_VALUE || '';
            const coValue = orderCustomData.find(cd => cd.DATA_FIELD === 'CO_PREV')?.DATA_FIELD_VALUE || '';
            const customerValue = orderCustomData.find(cd => cd.DATA_FIELD === 'CUSTOMER')?.DATA_FIELD_VALUE || '';
            
            // Applico i filtri opzionali (contains, case-insensitive)
            if (project && project !== '' && !projectValue.toUpperCase().includes(project.toUpperCase())) continue;
            if (co && co !== '' && !coValue.toUpperCase().includes(co.toUpperCase())) continue;
            if (customer && customer !== '' && !customerValue.toUpperCase().includes(customer.toUpperCase())) continue;
            
            // Estraggo l'SFC per questo ordine
            const sfcValue = sfcList.find(sfc => sfc.MFG_ORDER === mfgOrder)?.SFC || '';
            
            // Aggiungo la riga al risultato
            results.push({
                project: projectValue,
                sfc: sfcValue,
                order: mfgOrder,
                co: coValue,
                customer: customerValue,
                status: orderData.RELEASE_STATUS || ''
            });
        }
        
        return results;
    } catch (error) {
        console.error("Error in getVerbalManagementTable:", error);
        return false;
    }
}

// Funzione per popolare la TreeTable del Verbal Management Detail
async function getVerbalManagementTreeTable(plant, order) {
    try {
        // Step 1: Recupero i dati dell'ordine per ottenere ROUTING, ROUTING_VERSION e ROUTING_TYPE
        const filterOrder = `(MFG_ORDER eq '${order}' and PLANT eq '${plant}')`;
        const mockReqOrder = {
            path: "/mdo/ORDER",
            query: { $apply: `filter(${filterOrder})` },
            method: "GET"
        };
        const outMockOrder = await dispatch(mockReqOrder);
        const orderData = outMockOrder?.data?.value?.length > 0 ? outMockOrder.data.value[0] : null;
        
        if (!orderData) {
            return [];
        }
        
        const routing = orderData.ROUTING;
        const routingVersion = orderData.ROUTING_VERSION;
        const routingType = orderData.ROUTING_TYPE;
        
        // Step 2: Chiamata API per recuperare i Routing Steps
        const urlRouting = `${hostname}/routing/v1/routings?plant=${plant}&routing=${routing}&type=${routingType}&version=${routingVersion}`;
        const routingResponse = await callGet(urlRouting);
        const routingSteps = routingResponse[0]?.routingSteps || [];
        
        // Step 3: Recupero i dati di livello 2 dalla tabella Z_VERBALE_LEV2
        const lev2Data = await getVerbaleLev2ByOrder(order, plant);
        
        // Step 4: Recupero i dati di livello 3 dalla tabella Z_VERBALE_LEV3
        const lev3Data = await getVerbaleLev3ByOrder(order, plant);
        
        // Step 5: Costruisco la TreeTable
        const treeTable = [];
        
        for (const step of routingSteps) {
            const stepId = step.stepId;
            const description = step.description || '';
            const operationActivity = step.routingOperation?.operationActivity?.operationActivity || '';
            const workCenter = step.workCenter?.workCenter || '';
            
            // Verifica se è una duplicazione controllando se l'operationActivity contiene un suffisso _1, _2, etc.
            const isDuplicate = /_\d+$/.test(operationActivity);
            
            // Livello 1
            const level1Node = {
                level: 1,
                stepId: stepId,
                workcenter: workCenter,
                description: description,
                operationActivity: operationActivity,
                __isDuplicate: isDuplicate,
                _original: {
                    workcenter: workCenter,
                    safety: false,
                    active: false
                },
                children: []
            };
            
            // Filtra i dati di livello 2 che corrispondono a questo operationActivity (ID_Lev1)
            const matchingLev2 = lev2Data.filter(l2 => l2.id_lev_1 === stepId);
            
            for (const lev2 of matchingLev2) {
                // Livello 2
                const level2Node = {
                    level: 2,
                    description: lev2.lev_2 || '',
                    machineType: lev2.machine_type || '',
                    workcenter: lev2.workcenter_lev_2 || '',
                    safety: lev2.safety != null ? lev2.safety : false,
                    active: lev2.active != null ? lev2.active : false,
                    idLev2: lev2.id_lev_2,
                    _original: {
                        workcenter: lev2.workcenter_lev_2 || '',
                        safety: lev2.safety != null ? lev2.safety : false,
                        active: lev2.active != null ? lev2.active : false
                    },
                    children: []
                };
                
                // Filtra i dati di livello 3 che corrispondono a questo ID_Lev2
                const matchingLev3 = lev3Data.filter(l3 => l3.id_lev_2 === lev2.id_lev_2 && l3.id_lev_1 === stepId);
                
                for (const lev3 of matchingLev3) {
                    // Livello 3
                    const level3Node = {
                        level: 3,
                        description: lev3.lev_3 || '',
                        idLev3: lev3.id_lev_3
                    };
                    
                    level2Node.children.push(level3Node);
                }
                
                level1Node.children.push(level2Node);
            }
            
            treeTable.push(level1Node);
        }
        
        // Ordina i livelli 1 per stepId
        treeTable.sort((a, b) => {
            const stepIdA = parseInt(a.stepId) || 0;
            const stepIdB = parseInt(b.stepId) || 0;
            return stepIdA - stepIdB;
        });
        
        return treeTable;
    } catch (error) {
        console.error("Error in getVerbalManagementTreeTable:", error);
        return false;
    }
}

// Funzione per popolare la TreeTable di Progress Collaudo (più semplice, senza campi _original)
async function getCollaudoProgressTreeTable(plant, order) {
    try {
        // Step 1: Recupero i dati dell'ordine per ottenere ROUTING, ROUTING_VERSION e ROUTING_TYPE
        const filterOrder = `(MFG_ORDER eq '${order}' and PLANT eq '${plant}')`;
        const mockReqOrder = {
            path: "/mdo/ORDER",
            query: { $apply: `filter(${filterOrder})` },
            method: "GET"
        };
        const outMockOrder = await dispatch(mockReqOrder);
        const orderData = outMockOrder?.data?.value?.length > 0 ? outMockOrder.data.value[0] : null;
        
        if (!orderData) {
            return [];
        }
        
        const routing = orderData.ROUTING;
        const routingVersion = orderData.ROUTING_VERSION;
        const routingType = orderData.ROUTING_TYPE;
        
        // Step 2: Chiamata API per recuperare i Routing Steps
        const urlRouting = `${hostname}/routing/v1/routings?plant=${plant}&routing=${routing}&type=${routingType}&version=${routingVersion}`;
        const routingResponse = await callGet(urlRouting);
        const routingSteps = routingResponse[0]?.routingSteps || [];
        
        // Step 3: Recupero i dati di livello 2 dalla tabella Z_VERBALE_LEV2
        const lev2Data = await getVerbaleLev2ByOrder(order, plant);
        
        // Step 4: Recupero i dati di livello 3 dalla tabella Z_VERBALE_LEV3
        const lev3Data = await getVerbaleLev3ByOrder(order, plant);
        
        // Step 5: Recupero SFC per calcolare lo status del livello 1
        const filterSFC = `(MFG_ORDER eq '${order}' and PLANT eq '${plant}')`;
        const mockReqSFC = {
            path: "/mdo/SFC",
            query: { $apply: `filter(${filterSFC})` },
            method: "GET"
        };
        const outMockSFC = await dispatch(mockReqSFC);
        const sfcValue = outMockSFC?.data?.value?.length > 0 ? outMockSFC.data.value[0]?.SFC : '';
        
        // Recupero SFC details per status dei livelli 1
        let sfcSteps = [];
        if (sfcValue) {
            const urlSfcDetails = `${hostname}/sfc/v1/sfcdetail?plant=${plant}&sfc=${sfcValue}`;
            const sfcDetails = await callGet(urlSfcDetails);
            sfcSteps = sfcDetails?.steps || [];
        }
        
        // Step 6: Costruisco la TreeTable
        const treeTable = [];
        
        for (const step of routingSteps) {
            const stepId = step.stepId;
            const description = step.description || '';
            const workCenter = step.workCenter?.workCenter || '';
            
            // Filtra i dati di livello 2 che corrispondono a questo stepId
            const matchingLev2 = lev2Data.filter(l2 => l2.id_lev_1 === stepId && l2.active === true);
            
            // Calcolo Status livello 1 (simile a POD Operations)
            let level1Status = '';
            const sfcStep = sfcSteps.find(s => s.stepId === stepId);
            if (sfcStep) {
                if (sfcStep.quantityInQueue === 1) {
                    level1Status = 'New';
                } else if (sfcStep.quantityInWork === 1) {
                    level1Status = 'In Work';
                } else if (sfcStep.quantityDone === 1) {
                    level1Status = 'Done';
                }
            }
            
            // Calcolo percentuale: (somma time_lev_2 con status_lev_2='Done' e Active=true) / (somma time_lev_2 con Active=true)
            let totalTimeDone = 0;
            let totalTime = 0;
            matchingLev2.forEach(l2 => {
                const time = parseFloat(l2.time_lev_2) || 0;
                totalTime += time;
                if (l2.status_lev_2 === 'Done') {
                    totalTimeDone += time;
                }
            });
            const percentage = totalTime === 0 ? 0 : Math.round((totalTimeDone / totalTime) * 100 * 100) / 100;
            
            // Calcolo NC livello 1: se almeno un figlio ha NC, il padre è valorizzato
            let hasNC = false;
            
            // Arrays per Start e Complete
            let allStarts = [];
            let allCompletes = [];
            
            // Livello 1
            const level1Node = {
                level: 1,
                description: description,
                workcenter: workCenter,
                nc: false, // Verrà aggiornato dopo aver controllato i figli
                status: level1Status,
                percentage: percentage,
                start: '',
                complete: '',
                children: []
            };
            
            // Processa i livelli 2
            for (const lev2 of matchingLev2) {
                // Filtra i dati di livello 3 che corrispondono a questo ID_Lev2
                const matchingLev3 = lev3Data.filter(l3 => l3.id_lev_2 === lev2.id_lev_2 && l3.id_lev_1 === stepId);
                
                // Calcolo NC livello 2: se almeno un figlio ha NC
                let hasNCLev2 = matchingLev3.some(l3 => l3.nonconformances === true);
                if (hasNCLev2) {
                    hasNC = true; // Propaga al livello 1
                }
                
                // Livello 2
                const level2Node = {
                    level: 2,
                    description: lev2.lev_2 || '',
                    machineType: lev2.machine_type || '',
                    workcenter: lev2.workcenter_lev_2 || '',
                    nc: hasNCLev2,
                    status: lev2.status_lev_2 || '',
                    start: '',
                    complete: '',
                    children: []
                };
                
                // Arrays temporanei per livello 2
                let lev2Starts = [];
                let lev2Completes = [];
                
                // Processa i livelli 3
                for (const lev3 of matchingLev3) {
                    // Costruisco Start e Complete
                    const startText = lev3.start_user && lev3.start_date 
                        ? `${lev3.start_user}\n${lev3.start_date}` 
                        : '';
                    const completeText = lev3.complete_user && lev3.complete_date 
                        ? `${lev3.complete_user}\n${lev3.complete_date}` 
                        : '';
                    
                    if (startText) {
                        // Parsing data italiana DD/MM/YYYY HH:mm
                        const [datePart, timePart] = lev3.start_date.split(' ');
                        const [day, month, year] = datePart.split('/');
                        const [hours, minutes] = timePart.split(':');
                        const startDate = new Date(year, month - 1, day, hours, minutes);
                        
                        lev2Starts.push({ date: startDate, text: startText });
                        allStarts.push({ date: startDate, text: startText });
                    }
                    if (completeText) {
                        // Parsing data italiana DD/MM/YYYY HH:mm
                        const [datePart, timePart] = lev3.complete_date.split(' ');
                        const [day, month, year] = datePart.split('/');
                        const [hours, minutes] = timePart.split(':');
                        const completeDate = new Date(year, month - 1, day, hours, minutes);
                        
                        lev2Completes.push({ date: completeDate, text: completeText });
                        allCompletes.push({ date: completeDate, text: completeText });
                    }
                    
                    // Livello 3
                    const level3Node = {
                        level: 3,
                        description: lev3.lev_3 || '',
                        nc: lev3.nonconformances === true,
                        status: lev3.status_lev_3 || '',
                        start: startText,
                        complete: completeText
                    };
                    
                    level2Node.children.push(level3Node);
                }
                
                // Calcolo Start e Complete per livello 2: primo start e ultimo complete
                if (lev2Starts.length > 0) {
                    lev2Starts.sort((a, b) => a.date - b.date);
                    level2Node.start = lev2Starts[0].text;
                }
                if (lev2Completes.length > 0) {
                    lev2Completes.sort((a, b) => b.date - a.date);
                    level2Node.complete = lev2Completes[0].text;
                }
                
                level1Node.children.push(level2Node);
            }
            
            // Aggiorna NC livello 1
            level1Node.nc = hasNC;
            
            // Calcolo Start e Complete per livello 1: primo start e ultimo complete tra tutti i figli
            if (allStarts.length > 0) {
                allStarts.sort((a, b) => a.date - b.date);
                level1Node.start = allStarts[0].text;
            }
            if (allCompletes.length > 0) {
                allCompletes.sort((a, b) => b.date - a.date);
                level1Node.complete = allCompletes[0].text;
            }
            
            treeTable.push(level1Node);
        }
        
        return treeTable;
    } catch (error) {
        console.error("Error in getCollaudoProgressTreeTable:", error);
        return false;
    }
}

// Funzione per salvare le modifiche alla TreeTable del Verbal Management
async function saveVerbalManagementTreeTableChanges(plant, order, level1Changes, level2Changes, newLevel1, newLevel2, newLevel3, deletedLevel1) {
    try {
        // Step 1: Recupero i dati dell'ordine per ottenere ROUTING, ROUTING_VERSION e ROUTING_TYPE
        const filterOrder = `(MFG_ORDER eq '${order}' and PLANT eq '${plant}')`;
        const mockReqOrder = {
            path: "/mdo/ORDER",
            query: { $apply: `filter(${filterOrder})` },
            method: "GET"
        };
        const outMockOrder = await dispatch(mockReqOrder);
        const orderData = outMockOrder?.data?.value?.length > 0 ? outMockOrder.data.value[0] : null;
        
        if (!orderData) {
            throw new Error("Order not found");
        }
        
        const routing = orderData.ROUTING;
        const routingVersion = orderData.ROUTING_VERSION;
        const routingType = orderData.ROUTING_TYPE;
        
        // Step 2 e 4 unificati: Modifica WC livello 1 e Duplicazioni livello 1
        // Recupero e aggiorno il routing una sola volta per entrambe le operazioni
        if ((level1Changes && level1Changes.length > 0) || (newLevel1 && newLevel1.length > 0)) {
            // Recupero il routing completo
            const urlRouting = `${hostname}/routing/v1/routings?plant=${plant}&routing=${routing}&type=${routingType}&version=${routingVersion}`;
            const routingResponse = await callGet(urlRouting);
            
            if (!routingResponse[0]) {
                throw new Error("Routing not found");
            }
            
            // Step 2: Modifico i workCenter per gli stepId specificati
            if (level1Changes && level1Changes.length > 0) {
                for (const change of level1Changes) {
                    const step = routingResponse[0].routingSteps?.find(s => s.stepId === change.stepId);
                    if (step) {
                        // Aggiorno il workcenter
                        if (!step.workCenter) {
                            step.workCenter = {};
                        }
                        step.workCenter.workCenter = change.workcenter;
                    }
                }
            }
            
            // Step 4: Gestione duplicazioni livello 1 (operationActivity e routing)
            if (newLevel1 && newLevel1.length > 0) {
                for (const duplication of newLevel1) {
                    const { originalStepId, stepId, originalOperationActivity, operationActivity, workcenter, description } = duplication;
                    
                    // Verifica se l'operationActivity esiste già
                    const urlCheckOperation = `${hostname}/operationActivity/v1/operationActivities?plant=${plant}&operation=${operationActivity}`;
                
                    const operationCheck = await callGet(urlCheckOperation);
                    // Se non esiste, la creo duplicando quella originale
                    if (!operationCheck || (operationCheck.empty === true) || (operationCheck.content.length === 0)) {
                        const urlGetOriginalOperation = `${hostname}/operationActivity/v1/operationActivities?plant=${plant}&operation=${originalOperationActivity}`;
                        const originalOperationData = await callGet(urlGetOriginalOperation);
                        if (originalOperationData && originalOperationData.content.length > 0) {
                            const newOperationData = JSON.parse(JSON.stringify(originalOperationData.content[0]));
                            newOperationData.operation = operationActivity;
                            if (description) {
                                newOperationData.description = description;
                            }
                            
                            const urlPutOperation = `${hostname}/operationActivity/v1/operationActivities`;
                            await callPost(urlPutOperation, [newOperationData]);
                        }
                    }
                    
                    // Duplica il routingStep nel routing
                    const originalStep = routingResponse[0].routingSteps?.find(s => s.stepId === originalStepId);
                    if (originalStep) {
                        const newStep = JSON.parse(JSON.stringify(originalStep));
                        newStep.stepId = stepId;
                        newStep.entry = false;
                        newStep.routingOperation.operationActivity.operationActivity = operationActivity;
                        newStep.description = description || originalStep.description;
                        if (workcenter) {
                            if (!newStep.workCenter) {
                                newStep.workCenter = {};
                            }
                            newStep.workCenter.workCenter = workcenter;
                        }
                        
                        // Inserisco il nuovo step nella lista routingSteps
                        routingResponse[0].routingSteps.push(newStep);
                    }

                    // Duplica il routingOperationGroups nel routing
                    const originalOperationGroups = routingResponse[0].routingOperationGroups?.find(s => s.routingOperationGroup === originalOperationActivity);
                    if (originalOperationGroups) {
                        const newStepOpGrouup = JSON.parse(JSON.stringify(originalOperationGroups));
                        newStepOpGrouup.routingOperationGroup = operationActivity;
                        newStepOpGrouup.routingOperationGroupSteps[0].routingStep.stepId = stepId;
                        newStepOpGrouup.routingOperationGroupSteps[0].routingStep.description = description;
                        newStepOpGrouup.routingOperationGroupSteps[0].routingStep.routingOperation.operationActivity.operationActivity = operationActivity;
                        if (workcenter) {
                            newStepOpGrouup.routingOperationGroupSteps[0].routingStep.workCenter.workCenter = workcenter;
                        }
                        // Inserisco il nuovo step nella lista routingSteps
                        routingResponse[0].routingOperationGroups.push(newStepOpGrouup);
                    }
                    // Duplica anche il marking testing se esiste
                    await duplicateMarkingTesting(plant, order, stepId, originalStepId);
                }
                console.log("Routing dopo duplicazioni livello 1:", JSON.stringify(routingResponse, null, 2));
            }
            
            // Salvo il routing aggiornato una sola volta con tutte le modifiche
            const urlPutRouting = `${hostname}/routing/v1/routings`;
            await callPut(urlPutRouting, routingResponse);
        }
        
        // Step 3: Modifica livello 2 - Aggiornare la tabella Z_VERBALE_LEV2
        if (level2Changes && level2Changes.length > 0) {
            for (const change of level2Changes) {
                // Aggiorno solo i campi specificati (workcenter, safety, active)
                await updateVerbaleLev2(
                    plant,
                    change.idLev2,
                    change.workcenter !== undefined ? change.workcenter : null,
                    change.safety !== undefined ? change.safety : null,
                    change.active !== undefined ? change.active : null
                );
            }
        }
        
        // Step 5: Duplicazione livello 2
        if (newLevel2 && newLevel2.length > 0) {
                const { originalStepId, stepId, suffix, safety, workcenter, active, originalOperationActivity, operationActivity } = newLevel2[0];
                
                await duplicateVerbaleLev2(
                    order,
                    plant,
                    stepId,
                    suffix,
                    safety !== undefined ? safety : false,
                    workcenter !== undefined ? workcenter : null,
                    active !== undefined ? active : false,
                    originalStepId
                );
        }
        
        // Step 6: Duplicazione livello 3
        if (newLevel3 && newLevel3.length > 0) {
            // Raggruppo per originalLev2Id distinti per evitare duplicazioni multiple
            const uniqueLev2Ids = [...new Set(newLevel3.map(item => item.originalLev2Id))];
            
            for (const uniqueLev2Id of uniqueLev2Ids) {
                // Prendo il primo elemento con questo originalLev2Id
                const duplication = newLevel3.find(item => item.originalLev2Id === uniqueLev2Id);
                const { newStepId, suffix, originalLev2Id, originalLev1Id } = duplication;
                
                await duplicateVerbaleLev3(
                    order,
                    plant,
                    newStepId,
                    suffix || '',
                    originalLev2Id,
                    originalLev1Id
                );
            }
        }
        
        // Step 7: Eliminazione livello 1 (operationActivity e routing)
        if (deletedLevel1 && deletedLevel1.length > 0) {
            // Recupero il routing completo per le eliminazioni
            const urlRouting = `${hostname}/routing/v1/routings?plant=${plant}&routing=${routing}&type=${routingType}&version=${routingVersion}`;
            const routingResponse = await callGet(urlRouting);
            
            if (!routingResponse[0]) {
                throw new Error("Routing not found");
            }
            
            for (const deletion of deletedLevel1) {
                const { stepId, operationActivity } = deletion;
                
                // Rimuovo lo step dal routing
                // Rimuovo da routingSteps
                routingResponse[0].routingSteps = routingResponse[0].routingSteps?.filter(s => s.stepId !== stepId) || [];
                
                // Rimuovo da routingStepGroups se presente
                if (routingResponse[0].routingStepGroups) {
                    routingResponse[0].routingStepGroups.forEach(group => {
                        if (group.routingStepGroupStepList) {
                            group.routingStepGroupStepList = group.routingStepGroupStepList.filter(step => step.routingStep !== stepId);
                        }
                    });
                }
                
                // Rimuovo da routingOperationGroups
                if (routingResponse[0].routingOperationGroups) {
                    routingResponse[0].routingOperationGroups = routingResponse[0].routingOperationGroups.filter(
                        opGroup => opGroup.routingOperationGroup !== operationActivity
                    );
                }
                
                // Elimino le righe dal database
                await deleteVerbaleLev3(order, plant, stepId); // Prima elimino lev3 per rispettare le foreign key
                await deleteVerbaleLev2(order, plant, stepId);
                await deleteMarkingTesting(plant, order, stepId);
            }
            
            // Salvo il routing aggiornato senza gli step eliminati
            const urlPutRouting = `${hostname}/routing/v1/routings`;
            await callPut(urlPutRouting, routingResponse);
        }
        
        return true;
    } catch (error) {
        console.error("Error in saveVerbalManagementTreeTableChanges:", error);
        throw error;
    }
}

// Funzione per rilasciare il verbale
async function releaseVerbalManagement(plant, order) {
    try {
        var routing = order;
        //Aggiorno il campo custom RELEASE_STATUS in ORDER a 'DONE' per permettere il riladcio dell'ordine in seguito all'aggiornamento del routing
        let customFieldToUpdate = [{"customField":"TESTING_VERBALE_STATUS", "customValue": "DONE"}];
        await updateCustomField(plant, order, customFieldToUpdate);
        await manageRelease(plant, routing);
        return true;
    } catch (error) {
        console.error("Error in releaseVerbalManagement:", error);
        throw error;
    }
}

// Funzione per approvare la safety approval
async function doSafetyApproval(plant, sfc, idLev2, machineType, user, comment) {
    try {
        // Step 1: Aggiorno Z_COMMENTS con status = 'Approved', approval_user e approval_datetime
        await updateCommentApprovalStatus(plant, sfc, idLev2, user, comment);
        
        // Step 2: Sblocco la riga corrente in Z_VERBALE_LEV2
        await unblockVerbaleLev2(plant, sfc, idLev2, machineType);
        
        // Step 3: Recupero tutte le righe successive ordinate per ID_LEV2 crescente
        const allRows = await getVerbaleLev2ToUnblock(plant, sfc, machineType);
        
        // Trovo l'indice della riga corrente
        const currentIndex = allRows.findIndex(row => row.id_lev_2 === idLev2);
        
        if (currentIndex === -1) {
            throw new Error("Current row not found in Z_VERBALE_LEV2");
        }
        
        // Step 4: Itero sulle righe successive
        for (let i = currentIndex + 1; i < allRows.length; i++) {
            const row = allRows[i];
            
            // Se safety = false, sblocco la riga
            if (row.safety === false || row.safety === null) {
                await unblockVerbaleLev2(plant, sfc, row.id_lev_2, machineType);
            } else if (row.safety === true) {
                // Se safety = true, interrompo la ricerca
                break;
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error in doSafetyApproval:", error);
        throw error;
    }
}

// Funzione per cancellare/respingere la safety approval
async function doCancelSafety(plant, sfc, idLev2, user) {
    try {
        // Aggiorno Z_COMMENTS con status = 'Not Approved', approval_user e approval_datetime
        await updateCommentCancelStatus(plant, sfc, idLev2, user);
        
        return true;
    } catch (error) {
        console.error("Error in doCancelSafety:", error);
        throw error;
    }
}

async function getActivitiesTestingData(plant, project) {
    try {
        // Step 1: Recupero SFC dalla tabella ORDER_CUSTOM_DATA con COMMESSA = project
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

        // Step 2: Recupero SFC dagli ordini
        const sfcs = [];
        for (const order of orders) {
            try {
                const orderUrl = `${hostname}/order/v1/orders?order=${order}&plant=${plant}`;
                const orderResponse = await callGet(orderUrl);
                if (orderResponse?.sfcs && orderResponse.sfcs.length > 0) {
                    sfcs.push(...orderResponse.sfcs);
                }
            } catch (error) {
                console.log(`Error fetching SFC for order ${order}: ${error.message}`);
            }
        }

        if (sfcs.length === 0) {
            return [];
        }

        // Step 3: Recupero activities da z_verbale_lev_2 con status != 'Done' e active = true
        const activities = await getActivitiesTesting(plant, sfcs);

        if (activities.length === 0) {
            return [];
        }

        // Step 4: Creo tree table raggruppata per id_lev_1 (macrofase)
        const treeTable = [];
        
        for (const activity of activities) {
            // Elemento figlio (dettaglio) - livello 2
            const child = {
                level: 2,
                id_lev_2: activity.id_lev_2 || "",
                macroattivita: activity.lev_2 || "",
                progressivo: activity.id_lev_2 || "",
                workcenter: activity.workcenter_lev_2 || "",
                machine_type: activity.machine_type || "",
                status: activity.status_lev_2 || "",
                safety: activity.safety || false,
                owner: activity.owner || "", // nuova colonna
                due_date: activity.due_date || "", // nuova colonna
                sfc: activity.sfc || "",
                order: activity.order || ""
            };

            // Cerco se esiste già il gruppo parent per id_lev_1
            const existingGroup = treeTable.find(item => item.id_lev_1 === activity.id_lev_1);
            
            if (!existingGroup) {
                // Creo nuovo gruppo parent - livello 1
                treeTable.push({
                    level: 1,
                    id_lev_1: activity.id_lev_1 || "",
                    macrofase: activity.lev_1 || "",
                    children: [child]
                });
            } else {
                // Aggiungo al gruppo esistente
                existingGroup.children.push(child);
            }
        }

        return treeTable;

    } catch (error) {
        console.error("Error in getActivitiesTestingData:", error);
        return false;
    }
}

/**
 * Helper per convertire colore hex in RGB
 * @param {string} hex - Colore in formato #RRGGBB
 * @returns {Object} {r, g, b} valori normalizzati 0-1
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
}

/**
 * Disegna un pie chart direttamente sulla pagina PDF
 * @param {PDFPage} page - Pagina PDF su cui disegnare
 * @param {Array} data - Array di {cluster: string, hours: number}
 * @param {number} centerX - Coordinata X del centro
 * @param {number} centerY - Coordinata Y del centro
 * @param {number} radius - Raggio del cerchio
 * @param {PDFFont} font - Font per le etichette
 */
function drawPieChart(page, data, centerX, centerY, radius, font) {
    const colors = ["#0A6ED1", "#A57225", "#F2C80F", "#2B9EB3", "#D0011B"];
    
    // Calcola totale per le percentuali
    const total = data.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    if (total === 0) return;
    
    let startAngle = -Math.PI / 2; // Inizia da ore 12
    
    // Disegna ogni segmento
    data.forEach((item, index) => {
        const value = Number(item.hours || 0);
        const percentage = value / total;
        const sweepAngle = percentage * 2 * Math.PI;
        const endAngle = startAngle + sweepAngle;
        
        // Disegna lo spicchio usando cerchi concentrici per riempimento solido
        const colorRgb = hexToRgb(colors[index % colors.length]);
        const pdfColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b);
        
        // Disegna linee radiali ravvicinate per riempire lo spicchio
        const radialLines = Math.max(30, Math.ceil(sweepAngle / (Math.PI / 180) * 3));
        for (let r = 0; r < radialLines; r++) {
            const angle = startAngle + (sweepAngle * r / radialLines);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            page.drawLine({
                start: { x: centerX, y: centerY },
                end: { x: x, y: y },
                thickness: (radius * 2 * Math.PI * percentage) / radialLines + 0.5,
                color: pdfColor,
                opacity: 1
            });
        }
        
        // Disegna bordo dello spicchio
        const borderSegments = Math.max(20, Math.ceil(sweepAngle / (Math.PI / 180) * 2));
        for (let i = 0; i < borderSegments; i++) {
            const angle1 = startAngle + (sweepAngle * i / borderSegments);
            const angle2 = startAngle + (sweepAngle * (i + 1) / borderSegments);
            
            const x1 = centerX + radius * Math.cos(angle1);
            const y1 = centerY + radius * Math.sin(angle1);
            const x2 = centerX + radius * Math.cos(angle2);
            const y2 = centerY + radius * Math.sin(angle2);
            
            page.drawLine({
                start: { x: x1, y: y1 },
                end: { x: x2, y: y2 },
                thickness: 1.5,
                color: pdfColor,
                opacity: 1
            });
        }
        
        startAngle = endAngle;
    });
    
    // Titolo
    const title = 'Distribuzione Ore per Cluster';
    const titleWidth = font.widthOfTextAtSize(title, 12);
    page.drawText(title, {
        x: centerX - titleWidth / 2,
        y: centerY + radius + 25,
        size: 12,
        font: font,
        color: rgb(0, 0, 0)
    });
    
    // Legenda sotto il grafico
    let legendY = centerY - radius - 15;
    const legendX = centerX - 80;
    
    data.forEach((item, index) => {
        const value = Number(item.hours || 0);
        const percentage = ((value / total) * 100).toFixed(1);
        const colorRgb = hexToRgb(colors[index % colors.length]);
        const legendColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b);
        
        // Quadratino colorato
        page.drawRectangle({
            x: legendX,
            y: legendY,
            width: 12,
            height: 10,
            color: legendColor
        });
        
        // Testo legenda
        const legendText = `${item.cluster}: ${value}h (${percentage}%)`;
        page.drawText(legendText, {
            x: legendX + 17,
            y: legendY,
            size: 9,
            font: font,
            color: rgb(0, 0, 0)
        });
        
        legendY -= 15;
    });
}

/**
 * Disegna uno stacked column chart direttamente sulla pagina PDF
 * @param {PDFPage} page - Pagina PDF su cui disegnare
 * @param {Array} data - Array di {Type: string, OreBase: number, OreExtra: number}
 * @param {number} startX - Coordinata X iniziale
 * @param {number} startY - Coordinata Y della base
 * @param {number} chartWidth - Larghezza totale del grafico
 * @param {number} maxHeight - Altezza massima del grafico
 * @param {PDFFont} font - Font per le etichette
 */
function drawStackedBarChart(page, data, startX, startY, chartWidth, maxHeight, font) {
    if (!data || data.length === 0) return;
    
    const baseColorRgb = hexToRgb("#0A6ED1");
    const extraColorRgb = hexToRgb("#A57225");
    const baseColor = rgb(baseColorRgb.r, baseColorRgb.g, baseColorRgb.b);
    const extraColor = rgb(extraColorRgb.r, extraColorRgb.g, extraColorRgb.b);
    
    // Trova il valore massimo per scalare
    let maxValue = 0;
    data.forEach(item => {
        const total = Number(item.OreBase || 0) + Number(item.OreExtra || 0);
        if (total > maxValue) maxValue = total;
    });
    
    if (maxValue === 0) return;
    
    const barWidth = (chartWidth * 0.7) / data.length;
    const spacing = (chartWidth * 0.3) / (data.length + 1);
    
    // Disegna assi
    page.drawLine({
        start: { x: startX, y: startY },
        end: { x: startX + chartWidth, y: startY },
        thickness: 1,
        color: rgb(0, 0, 0)
    });
    
    page.drawLine({
        start: { x: startX, y: startY },
        end: { x: startX, y: startY + maxHeight },
        thickness: 1,
        color: rgb(0, 0, 0)
    });
    
    // Disegna barre
    data.forEach((item, index) => {
        const oreBase = Number(item.OreBase || 0);
        const oreExtra = Number(item.OreExtra || 0);
        
        const x = startX + spacing + index * (barWidth + spacing);
        
        // Barra Ore Base
        const baseHeight = (oreBase / maxValue) * maxHeight;
        if (baseHeight > 0) {
            page.drawRectangle({
                x: x,
                y: startY,
                width: barWidth,
                height: baseHeight,
                color: baseColor,
                opacity: 1
            });
        }
        
        // Barra Ore Extra (sopra base)
        const extraHeight = (oreExtra / maxValue) * maxHeight;
        if (extraHeight > 0) {
            page.drawRectangle({
                x: x,
                y: startY + baseHeight,
                width: barWidth,
                height: extraHeight,
                color: extraColor,
                opacity: 1
            });
        }
        
        // Etichetta tipo sotto la barra
        const labelWidth = font.widthOfTextAtSize(item.Type, 8);
        page.drawText(item.Type, {
            x: x + barWidth / 2 - labelWidth / 2,
            y: startY - 15,
            size: 8,
            font: font,
            color: rgb(0, 0, 0)
        });
    });
    
    // Legenda
    const legendY = startY + maxHeight + 30;
    
    // Ore Base
    page.drawRectangle({
        x: startX + chartWidth / 2 - 100,
        y: legendY,
        width: 15,
        height: 10,
        color: baseColor
    });
    page.drawText('Ore Base', {
        x: startX + chartWidth / 2 - 80,
        y: legendY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0)
    });
    
    // Ore Extra
    page.drawRectangle({
        x: startX + chartWidth / 2,
        y: legendY,
        width: 15,
        height: 10,
        color: extraColor
    });
    page.drawText('Ore Extra', {
        x: startX + chartWidth / 2 + 20,
        y: legendY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0)
    });
    
    // Titolo
    const title = 'Analisi Ore Collaudo';
    const titleWidth = font.widthOfTextAtSize(title, 12);
    page.drawText(title, {
        x: startX + chartWidth / 2 - titleWidth / 2,
        y: startY + maxHeight + 50,
        size: 12,
        font: font,
        color: rgb(0, 0, 0)
    });
}

async function generatePdfFineCollaudo(data) {
    try {
        // ============================================
        // VALIDAZIONE E PREPARAZIONE DATI
        // ============================================
        if (!data) {
            throw new Error("PDF data is required");
        }
        
        const header = data.header || {};
        const groupsData = Array.isArray(data.groupsData) ? data.groupsData : [];
        const weights = Array.isArray(data.weights) ? data.weights : [];
        const varianzaCollaudo = Array.isArray(data.varianzaCollaudo) ? data.varianzaCollaudo : [];
        const treeData = Array.isArray(data.treeData) ? data.treeData : [];
        const treeDataModifiche = Array.isArray(data.treeDataModifiche) ? data.treeDataModifiche : [];
        const treeDataActivities = Array.isArray(data.treeDataActivities) ? data.treeDataActivities : [];
        const mancanti = Array.isArray(data.mancanti) ? data.mancanti : [];
        const parameteresData = Array.isArray(data.parameteresData) ? data.parameteresData : [];
        const riepilogoText = data.riepilogoText || "";
        const resultsOreCollaudo = Array.isArray(data.oreCollaudo) ? data.oreCollaudo : [];

        // ============================================
        // INIZIALIZZAZIONE PDF
        // ============================================
        const pdfDoc = await PDFLib.create();
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        let margin = 50;
        let contentWidth = width - (margin * 2);
        let y = height - margin;

        // ============================================
        // HELPER FUNCTIONS
        // ============================================
        
        /**
         * Controlla se serve una nuova pagina
         */
        const checkNewPage = (requiredSpace = 80) => {
            if (y < requiredSpace) {
                page = pdfDoc.addPage();
                y = page.getSize().height - margin;
                return true;
            }
            return false;
        };

        /**
         * Disegna testo con formattazione
         */
        const drawText = (text, options = {}) => {
            const {
                size = 10,
                bold = false,
                color = rgb(0, 0, 0),
                x = margin,
                centered = false,
                maxWidth = contentWidth
            } = options;
            
            checkNewPage(size + 10);
            
            const textFont = bold ? fontBold : font;
            const textStr = String(text || "");
            let textX = x;
            
            if (centered) {
                const textWidth = textFont.widthOfTextAtSize(textStr, size);
                textX = (width - textWidth) / 2;
            }
            
            page.drawText(textStr, {
                x: textX,
                y,
                size,
                font: textFont,
                color,
                maxWidth
            });
            
            y -= size + 5;
        };

        /**
         * Disegna linea divisoria
         */
        const drawLine = (thickness = 1, color = rgb(0, 0, 0)) => {
            checkNewPage(20);
            page.drawLine({
                start: { x: margin, y },
                end: { x: width - margin, y },
                thickness,
                color
            });
            y -= 10;
        };

        /**
         * Disegna intestazione sezione
         */
        const drawSectionHeader = (title) => {
            checkNewPage(40);
            y -= 10;
            drawText(title, {
                size: 14,
                bold: true,
                color: rgb(0.1, 0.2, 0.6)
            });
            drawLine(1, rgb(0.1, 0.2, 0.6));
        };

        /**
         * Disegna tabella professionale con word wrapping
         */
        const drawTable = (headers, rows, columnWidths, options = {}) => {
            const { fontSize = 8, headerFontSize = 9, minRowHeight = 20 } = options;
            
            checkNewPage(100);
            
            const headerHeight = 25;
            let currentX = margin;
            
            // Helper per calcolare righe di testo necessarie (con gestione parole lunghe)
            const calculateTextLines = (text, maxWidth, size) => {
                const textStr = String(text || "");
                if (!textStr) return [""];
                
                const words = textStr.split(" ");
                const lines = [];
                let currentLine = "";
                
                for (const word of words) {
                    // Controlla se la parola singola è troppo lunga
                    const wordWidth = font.widthOfTextAtSize(word, size);
                    
                    if (wordWidth > maxWidth - 10) {
                        // Parola troppo lunga: la spezza carattere per carattere
                        if (currentLine) {
                            lines.push(currentLine);
                            currentLine = "";
                        }
                        
                        let charLine = "";
                        for (let i = 0; i < word.length; i++) {
                            const testChar = charLine + word[i];
                            const testWidth = font.widthOfTextAtSize(testChar, size);
                            
                            if (testWidth <= maxWidth - 10) {
                                charLine = testChar;
                            } else {
                                if (charLine) lines.push(charLine);
                                charLine = word[i];
                            }
                        }
                        if (charLine) {
                            currentLine = charLine;
                        }
                    } else {
                        // Parola di lunghezza normale
                        const testLine = currentLine ? currentLine + " " + word : word;
                        const testWidth = font.widthOfTextAtSize(testLine, size);
                        
                        if (testWidth <= maxWidth - 10) {
                            currentLine = testLine;
                        } else {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        }
                    }
                }
                if (currentLine) lines.push(currentLine);
                return lines.length > 0 ? lines : [""];
            };
            
            // Disegna header
            page.drawRectangle({
                x: margin,
                y: y - headerHeight,
                width: contentWidth,
                height: headerHeight,
                color: rgb(0.9, 0.9, 0.95),
                borderColor: rgb(0.3, 0.3, 0.3),
                borderWidth: 1
            });
            
            headers.forEach((header, i) => {
                const headerLines = calculateTextLines(header, columnWidths[i], headerFontSize);
                headerLines.forEach((line, lineIdx) => {
                    page.drawText(line, {
                        x: currentX + 5,
                        y: y - 12 - (lineIdx * 10),
                        size: headerFontSize,
                        font: fontBold,
                        color: rgb(0, 0, 0),
                        maxWidth: columnWidths[i] - 10
                    });
                });
                currentX += columnWidths[i];
            });
            
            y -= headerHeight;
            
            // Disegna righe con altezza dinamica
            rows.forEach((row, rowIndex) => {
                // Calcola altezza necessaria per questa riga
                let maxLines = 1;
                const cellLinesArray = [];
                
                row.forEach((cell, i) => {
                    const lines = calculateTextLines(cell, columnWidths[i], fontSize);
                    cellLinesArray.push(lines);
                    maxLines = Math.max(maxLines, lines.length);
                });
                
                // Calcola altezza riga basata sul numero di linee effettive
                const lineHeight = fontSize + 4; // Spazio tra linee
                const rowHeight = Math.max(minRowHeight, maxLines * lineHeight + 8);
                
                checkNewPage(rowHeight + 10);
                
                const isEvenRow = rowIndex % 2 === 0;
                page.drawRectangle({
                    x: margin,
                    y: y - rowHeight,
                    width: contentWidth,
                    height: rowHeight,
                    color: isEvenRow ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.97),
                    borderColor: rgb(0.7, 0.7, 0.7),
                    borderWidth: 0.5
                });
                
                currentX = margin;
                cellLinesArray.forEach((lines, i) => {
                    lines.forEach((line, lineIdx) => {
                        // Calcola posizione Y per ogni riga di testo
                        const textY = y - 12 - (lineIdx * lineHeight);
                        
                        page.drawText(line, {
                            x: currentX + 5,
                            y: textY,
                            size: fontSize,
                            font,
                            color: rgb(0, 0, 0)
                        });
                    });
                    currentX += columnWidths[i];
                });
                
                y -= rowHeight;
            });
            
            y -= 15;
        };

        /**
         * Crea una pagina in orientamento landscape
         */
        const createLandscapePage = () => {
            const landscapePage = pdfDoc.addPage([height, width]); // Inverte dimensioni
            return landscapePage;
        };

        /**
         * Adattamento intelligente della tabella
         * Analizza il contenuto e decide automaticamente:
         * - Orientamento (portrait vs landscape)
         * - Dimensione font ottimale
         * - Larghezza colonne proporzionale al contenuto
         */
        const drawSmartTable = (headers, rows, options = {}) => {
            const { forceOrientation = null, maxFontSize = 9, minFontSize = 6 } = options;
            
            // 1. Analizza la complessità della tabella
            const numColumns = headers.length;
            const avgContentLength = [];
            
            // Calcola lunghezza media per ogni colonna
            headers.forEach((header, colIndex) => {
                let totalLength = String(header).length;
                let count = 1;
                
                rows.forEach(row => {
                    const cellContent = String(row[colIndex] || "");
                    totalLength += cellContent.length;
                    count++;
                });
                
                avgContentLength.push(totalLength / count);
            });
            
            // 2. Decide orientamento
            const currentWidth = page.getSize().width;
            const currentHeight = page.getSize().height;
            const currentMargin = margin;
            const availableWidth = currentWidth - (currentMargin * 2);
            
            // Stima larghezza necessaria (carattere medio ~6 punti a font 8)
            const estimatedWidthNeeded = avgContentLength.reduce((sum, len) => sum + (len * 4), 0);
            
            let useOrientationLandscape = forceOrientation === 'landscape' || 
                                          (forceOrientation !== 'portrait' && 
                                           (numColumns > 8 || estimatedWidthNeeded > availableWidth * 1.2));
            
            // 3. Crea nuova pagina con orientamento ottimale
            let targetPage, targetWidth, targetHeight, targetMargin, targetContentWidth;
            
            if (useOrientationLandscape) {
                targetPage = createLandscapePage();
                targetWidth = targetPage.getSize().width;
                targetHeight = targetPage.getSize().height;
                targetMargin = 40;
                targetContentWidth = targetWidth - (targetMargin * 2);
                page = targetPage;
                y = targetHeight - targetMargin;
            } else {
                targetPage = pdfDoc.addPage();
                targetWidth = targetPage.getSize().width;
                targetHeight = targetPage.getSize().height;
                targetMargin = margin;
                targetContentWidth = availableWidth;
                page = targetPage;
                y = targetHeight - targetMargin;
            }
            
            // 4. Calcola larghezze colonne proporzionali al contenuto
            const totalAvgLength = avgContentLength.reduce((sum, len) => sum + len, 0);
            const columnWidths = avgContentLength.map(len => {
                const proportion = len / totalAvgLength;
                const width = targetContentWidth * proportion;
                // Larghezza minima 40, massima 30% del totale
                return Math.max(40, Math.min(width, targetContentWidth * 0.3));
            });
            
            // Normalizza per riempire esattamente la larghezza disponibile
            const totalCalculatedWidth = columnWidths.reduce((sum, w) => sum + w, 0);
            const normalizedWidths = columnWidths.map(w => (w / totalCalculatedWidth) * targetContentWidth);
            
            // 5. Determina font size ottimale
            let fontSize = maxFontSize;
            
            // Riduce font se troppo contenuto
            if (numColumns > 10) {
                fontSize = Math.max(minFontSize, maxFontSize - 2);
            } else if (numColumns > 7) {
                fontSize = Math.max(minFontSize, maxFontSize - 1);
            }
            
            const headerFontSize = fontSize + 1;
            
            // 6. Salva e ripristina contesto
            const originalMargin = margin;
            const originalContentWidth = contentWidth;
            margin = targetMargin;
            contentWidth = targetContentWidth;
            
            // 7. Disegna tabella con parametri ottimizzati
            drawTable(headers, rows, normalizedWidths, {
                fontSize: fontSize,
                headerFontSize: headerFontSize,
                minRowHeight: fontSize * 2 + 4
            });
            
            // 8. Ripristina contesto
            margin = originalMargin;
            contentWidth = originalContentWidth;
            
            return {
                orientation: useOrientationLandscape ? 'landscape' : 'portrait',
                fontSize: fontSize,
                columnWidths: normalizedWidths
            };
        };

        /**
         * Disegna immagine (grafico)
         */
        const drawImage = async (base64Data, maxWidth = 450, maxHeight = 300) => {
            if (!base64Data) return;
            
            try {
                const imageData = base64Data.includes(",") 
                    ? base64Data.split(",")[1] 
                    : base64Data;
                const imageBytes = Buffer.from(imageData, "base64");
                
                let image;
                try {
                    image = await pdfDoc.embedPng(imageBytes);
                } catch {
                    image = await pdfDoc.embedJpg(imageBytes);
                }
                
                const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
                const imgWidth = image.width * scale;
                const imgHeight = image.height * scale;
                
                checkNewPage(imgHeight + 20);
                
                page.drawImage(image, {
                    x: (width - imgWidth) / 2,
                    y: y - imgHeight,
                    width: imgWidth,
                    height: imgHeight
                });
                
                y -= imgHeight + 20;
            } catch (error) {
                console.error("Error embedding image:", error.message);
                drawText("[Grafico non disponibile]", {
                    size: 10,
                    color: rgb(0.5, 0.5, 0.5),
                    centered: true
                });
            }
        };

        // ============================================
        // COSTRUZIONE PDF
        // ============================================

        // HEADER PRINCIPALE
        drawText("REPORT FINALE DI COLLAUDO", {
            size: 20,
            bold: true,
            centered: true
        });
        y -= 10;
        drawLine(2);
        y -= 10;
        
        // Informazioni header
        drawText(`Progetto: ${header.project || "N/A"}`, { size: 12, bold: true });
        drawText(`SFC: ${header.sfc || "N/A"}`, { size: 12 });
        drawText(`Cliente: ${header.customer || "N/A"}`, { size: 12 });
        
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
        drawText(`Data generazione: ${formattedDate}`, { size: 10, color: rgb(0.4, 0.4, 0.4) });
        
        // SEZIONI COLLAUDATE
        if (groupsData.length > 0) {
            page = pdfDoc.addPage();
            y = page.getSize().height - margin;
            
            drawSectionHeader("SEZIONI COLLAUDATE");
            groupsData.forEach(group => {
                drawText(`• ${group.description || "N/A"}`, { size: 10 });
            });
        }

        // PARAMETRI - Sezioni multiple
        if (parameteresData.length > 0) {
            // Itero su ogni sezione di parametri
            for (const section of parameteresData) {
                // Verifica se la sezione ha parametri
                const sectionParams = Array.isArray(section.parameters) ? section.parameters : [];
                
                if (sectionParams.length > 0) {
                    page = pdfDoc.addPage();
                    y = page.getSize().height - margin;
                    
                    // Intestazione della sezione con il nome
                    const sectionTitle = section.description || section.group || "PARAMETRI DI COLLAUDO";
                    drawSectionHeader(sectionTitle);
                    
                    // Creo le righe della tabella dai parametri di questa sezione
                    const paramRows = sectionParams.map(p => {
                        const value = p.valueText || p.valueNumber || p.valueData || 
                                     p.valueBoolean || p.valueList || "-";
                        return [
                            p.description || "N/A",
                            String(value),
                            p.comment || ""
                        ];
                    });
                    
                    const colWidths = [contentWidth * 0.4, contentWidth * 0.3, contentWidth * 0.3];
                    drawTable(
                        ["Parametro", "Valore", "Commento"],
                        paramRows,
                        colWidths
                    );
                }
            }
        }

        // VALUTAZIONE PESI
        if (weights.length > 0) {
            page = pdfDoc.addPage();
            y = page.getSize().height - margin;
            
            drawSectionHeader("SEZIONI ISPEZIONE");
            
            const weightRows = weights.map(w => [
                w.id || "N/A",
                w.section || "N/A",
                (w.weight || "0") + (String(w.weight || "").includes("%") ? "" : "%"),
                w.value || "N/A"
            ]);
            
            const colWidths = [contentWidth * 0.1, contentWidth * 0.4, contentWidth * 0.25, contentWidth * 0.25];
            drawTable(["Id", "Sezione", "Peso", "Valore"], weightRows, colWidths);
        }

        // ANALISI ORE COLLAUDO
        if (resultsOreCollaudo.length > 0) {
            page = pdfDoc.addPage();
            y = page.getSize().height - margin;
            
            drawSectionHeader("ANALISI ORE COLLAUDO");
            
            // Tabella con tutti i parametri ore collaudo
            const oreCollaudoRows = resultsOreCollaudo.map(item => [
                item.description || item.parameterName || "N/A",
                String(item.valueNumber || "0"),
                item.comment || ""
            ]);
            
            const colWidths = [contentWidth * 0.5, contentWidth * 0.25, contentWidth * 0.25];
            drawTable(["Parametro", "Valore", "Commento"], oreCollaudoRows, colWidths);
            
            // Prepara dati per il grafico stacked bar
            // Estrai valori specifici dai parametri
            const oreBaseLine = resultsOreCollaudo.find(p => p.parameterName === "Ore Base Line" || p.description === "Ore Base Line");
            const oreVarianza = resultsOreCollaudo.find(p => p.parameterName === "Ore Varianza" || p.description === "Ore Varianza");
            const oreConsuntivo = resultsOreCollaudo.find(p => p.parameterName === "Ore Consuntivo" || p.description === "Ore Consuntivo");
            
            // Se abbiamo i dati necessari, disegna il grafico
            if (oreBaseLine || oreVarianza || oreConsuntivo) {
                const chartData = [];
                
                const baseLineValue = Number(oreBaseLine?.valueNumber || 0);
                const varianzaValue = Number(oreVarianza?.valueNumber || 0);
                const consuntivoValue = Number(oreConsuntivo?.valueNumber || 0);
                
                // Baseline: solo ore base line (senza extra)
                chartData.push({
                    Type: "Baseline",
                    OreBase: baseLineValue,
                    OreExtra: 0
                });
                
                // Consuntivo: ore consuntivo come base + ore varianza (extra) sopra
                chartData.push({
                    Type: "Consuntivo",
                    OreBase: consuntivoValue,
                    OreExtra: varianzaValue
                });
                
                // Disegna grafico stacked column
                if (chartData.length > 0) {
                    try {
                        y -= 20;
                        checkNewPage(280);
                        const chartStartX = margin + 30;
                        const chartStartY = y - 220;
                        const chartWidth = contentWidth - 60;
                        const chartHeight = 180;
                        drawStackedBarChart(page, chartData, chartStartX, chartStartY, chartWidth, chartHeight, font);
                        y -= 280;
                    } catch (error) {
                        console.error("Error generating stacked column chart:", error.message);
                        drawText("[Grafico non disponibile]", {
                            size: 10,
                            color: rgb(0.5, 0.5, 0.5),
                            centered: true
                        });
                    }
                }
            }
        }

        // ANALISI ORE VARIANZA
        if (varianzaCollaudo.length > 0) {
            page = pdfDoc.addPage();
            y = page.getSize().height - margin;
            
            drawSectionHeader("ANALISI VARIANZA COLLAUDO");
            
            const varianzaRows = varianzaCollaudo.map(v => [
                v.cluster || "N/A",
                String(v.hours || "0") + " ore"
            ]);
            
            const colWidths = [contentWidth * 0.6, contentWidth * 0.4];
            drawTable(["Cluster", "Ore"], varianzaRows, colWidths);
            
            // Disegna grafico pie chart direttamente
            try {
                y -= 20;
                // Spazio necessario: raggio*2 + titolo + legenda (numero elementi * 15)
                const chartSpace = 180 + 40 + (varianzaCollaudo.length * 15);
                checkNewPage(chartSpace);
                const centerX = width / 2;
                const centerY = y - 110;
                drawPieChart(page, varianzaCollaudo, centerX, centerY, 90, font);
                y -= chartSpace;
            } catch (error) {
                console.error("Error generating pie chart:", error.message);
                drawText("[Grafico non disponibile]", {
                    size: 10,
                    color: rgb(0.5, 0.5, 0.5),
                    centered: true
                });
            }
        }

        // NON CONFORMITÀ (Adattamento Intelligente)
        if (treeData.length > 0) {
            const ncRows = treeData.map(nc => [
                nc.groupDesc || "N/A",
                nc.codeDesc || "N/A",
                nc.material || "N/A",
                nc.priority_description || "N/A",
                nc.user || "N/A",
                nc.phase || "N/A",
                nc.status || "N/A",
                nc.qn_code || "N/A",
                nc.owner || "N/A",
                nc.due_date || "N/A"
            ]);
            
            const ncHeaders = ["NC Group", "NC Code", "Material", "Priority", "User", "Phase", "Status", "QN Code", "Owner", "Due Date"];
            
            // Adattamento intelligente con analisi automatica
            const tableInfo = drawSmartTable(ncHeaders, ncRows);
            
            console.log(`NON CONFORMITÀ: ${tableInfo.orientation}, font: ${tableInfo.fontSize}`);
        }

        // MODIFICHE (Adattamento Intelligente)
        if (treeDataModifiche.length > 0) {
            const modRows = treeDataModifiche.map(mod => [
                mod.type || "N/A",
                mod.prog_eco || "N/A",
                mod.process_id || "N/A",
                mod.material || "N/A",
                mod.material_description || "N/A",
                mod.child_material || "N/A",
                mod.quantity || "N/A",
                mod.flux_type || "N/A",
                mod.status || "N/A",
                mod.resolution || "N/A",
                mod.note || "N/A",
                mod.owner || "N/A",
                mod.due_date || "N/A"
            ]);
            
            const modHeaders = ["Type", "Progr.Eco", "Proc.Id", "Material", "Material Desc.", "Child Mat.", "Qty", "Flux Type", "Status", "Resolution", "Note", "Owner", "Due Date"];
            
            // Adattamento intelligente con analisi automatica
            const tableInfo = drawSmartTable(modHeaders, modRows);
            
            console.log(`MODIFICHE: ${tableInfo.orientation}, font: ${tableInfo.fontSize}`);
        }

        // ACTIVITIES (Adattamento Intelligente)
        if (treeDataActivities.length > 0) {
            const actRows = treeDataActivities.map(act => [
                act.id_lev_1 || "N/A",
                act.macroattivita || "N/A",
                act.machine_type || "N/A",
                act.progressivo || "N/A",
                act.workcenter || "N/A",
                act.status || "N/A",
                act.safety || "N/A",
                act.owner || "N/A",
                act.due_date || "N/A"
            ]);
            
            const actHeaders = ["Macro-Phase", "Macro-Activity", "Mach.Type", "Progr.", "WorkCenter", "Status", "Safety", "Owner", "Due Date"];
            
            // Adattamento intelligente con analisi automatica
            const tableInfo = drawSmartTable(actHeaders, actRows);
            
            console.log(`ATTIVITÀ: ${tableInfo.orientation}, font: ${tableInfo.fontSize}`);
        }

        // MANCANTI (Adattamento Intelligente)
        if (mancanti.length > 0) {
            const manRows = mancanti.map(m => [
                m.wbs_element || "N/A",
                m.material || "N/A",
                m.missing_component || "N/A",
                m.component_description || "N/A",
                m.type_mancante || "N/A",
                m.type_cover_element || "N/A",
                m.receipt_expected_date || "N/A",
                m.owner || "N/A",
                m.due_date || "N/A"
            ]);
            
            const manHeaders = ["WBS", "Material", "Miss.Comp.", "Miss.Comp.Desc.", "Type", "Cover Elem.Type", "Receipt Date", "Owner", "Due Date"];
            
            // Adattamento intelligente con analisi automatica
            const tableInfo = drawSmartTable(manHeaders, manRows);
            
            console.log(`COMPONENTI MANCANTI: ${tableInfo.orientation}, font: ${tableInfo.fontSize}`);
        }

        // RIEPILOGO FINALE
        if (riepilogoText) {
            page = pdfDoc.addPage();
            y = page.getSize().height - margin;
            
            drawSectionHeader("RIEPILOGO COLLAUDO");
            
            const lines = riepilogoText.split("\n");
            lines.forEach(line => {
                if (line.trim()) {
                    drawText(line, { size: 10 });
                } else {
                    y -= 5;
                }
            });
        }

        // ============================================
        // FINALIZZAZIONE E RESTITUZIONE
        // ============================================
        const pdfBytes = await pdfDoc.save();
        
        if (!pdfBytes || pdfBytes.length === 0) {
            throw new Error("PDF generation failed: empty result");
        }
        
        return pdfBytes;
        
    } catch (error) {
        console.error("Error in generatePdfFineCollaudo:", error.message);
        throw error;
    }
}

// Funzione generica per aggiornare uno o più campi custom di un ordine
async function updateCustomField(plant, order, customFieldsUpdate) {
    try {
        // Verifica se customFieldsUpdate è un array, altrimenti lo trasforma in array
        const fieldsArray = Array.isArray(customFieldsUpdate) ? customFieldsUpdate : [customFieldsUpdate];
        
        // Trasforma l'array di {customField, customValue} nel formato richiesto dall'API
        const customValues = fieldsArray.map(field => ({
            "attribute": field.customField,
            "value": field.customValue
        }));
        
        const url = hostname + "/order/v1/orders/customValues";
        const body = {
            "plant": plant,
            "order": order,
            "customValues": customValues
        };
        await callPatch(url, body);
        return true;
    } catch (error) {
        console.error("Error in updateCustomField:", error.message);
        throw error;
    }
}

// Esporta la funzione
module.exports = { getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly, getWBEVerbaliSupervisoreAssembly, getVerbaliTileSupervisoreTesting,getProjectsVerbaliTileSupervisoreTesting, generateTreeTable, updateCustomAssemblyReportStatusOrderDone, updateCustomAssemblyReportStatusOrderInWork, updateCustomSentTotTestingOrder, generateInspectionPDF, sendToTestingAdditionalOperations, updateTestingDefects, updateTestingModifiche, getFilterVerbalManagement, getVerbalManagementTable, getVerbalManagementTreeTable, getCollaudoProgressTreeTable, saveVerbalManagementTreeTableChanges, releaseVerbalManagement, getFilterSafetyApproval, getSafetyApprovalData, doSafetyApproval, doCancelSafety, getFilterFinalCollaudo, getFinalCollaudoData, getActivitiesTestingData, updateCustomTestingReportStatusOrderInWork, updateCustomAssemblyReportStatusIdReportWeight, generatePdfFineCollaudo, updateCustomField, getCollaudoProgressTreeTable };