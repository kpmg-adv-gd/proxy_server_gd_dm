const postgresdbService = require('../../connection');
const queryVerbali = require("./queries");
const { dispatch } = require("../../../mdo/library");
const { callGet, callPost } = require("../../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

// Recupero dati per POD Selection
async function getVerbaleLev2NotDone(plant, workcenter, project, customer, co) {
    const data = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev2NotDoneQuery, [plant, workcenter]);
    // Per ogni record, devo ottenere CUSTOMER, CO_PREV, COMMESSA tramite MDO 
    for (var i = 0; i < data.length; i++) {
        try{
            
            const requests = [
                { key: "project", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(MFG_ORDER eq '" + data[i].order + "' and DATA_FIELD eq 'COMMESSA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
                { key: "customer", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(MFG_ORDER eq '" + data[i].order + "' and DATA_FIELD eq 'CUSTOMER' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
                { key: "co", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(MFG_ORDER eq '" + data[i].order + "' and DATA_FIELD eq 'CO_PREV' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
                { key: "WBE", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(MFG_ORDER eq '" + data[i].order + "' and DATA_FIELD eq 'WBE' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            ];

            // Esegui tutte le chiamate in parallelo
            await Promise.all(
                //per ogni chiamata che devo fare (per ogni oggetto di request)
                requests.map(async (request) => {
                        const mockReq = {
                            path: request.path,
                            query: request.query,
                            method: request.method
                        };
                        try {
                            //chiamo l'api del mdo con quella request
                            var result = await dispatch(mockReq);
                            console.log("MDO API Result:" + data[i][request.key] +  ": " + JSON.stringify(result));
                            //ritorno un oggetto con chiave della chiamta e il suo risultato
                            data[i][request.key] = result.data?.value[0]?.DATA_FIELD_VALUE || null;
                        } catch (error) {
                            data[i][request.key] = null;
                        }
                })
            );

            // Recupero lo status del SFC
            var url = hostname+"/sfc/v1/sfcdetail?plant="+plant+"&sfc="+data[i].sfc;
            var response = await callGet(url);
            data[i]["status"] = response.status || null;

        } catch(e){
            console.error("Errore in getFilterPODTI: "+ e);
            throw new Error("Errore in getFilterPODTI:"+e);
        }
    }

    return data.filter(item => {
        return (project ? item.project === project : true) &&
               (customer ? item.customer === customer : true) &&
               (co ? item.co === co : true);
    });
}

// Recupero dati per livello 2 e livello 3
async function getVerbaleLev2ByLev1(plant, order, sfc, id_lev_1) {
    const data = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev2ByLev1, [plant, order, sfc, id_lev_1]);
    return data;
}

// Recupero tutti i machine type
async function getAllMachineType(plant, sfc) {
    const data = await postgresdbService.executeQuery(queryVerbali.getAllMachineType, [plant, sfc]);
    return data;
}

// Recupero info su task terzo livello
async function getInfoTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type) {
    const data = await postgresdbService.executeQuery(queryVerbali.getInfoTerzoLivello, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type]);
    return data;
}

// Recupero commenti sul task terzo livello
async function getCommentsVerbale(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type) {
    const data = await postgresdbService.executeQuery(queryVerbali.getCommentsVerbale, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, "C"]);
    return data;
}

// Recupero commenti per approvazione del task terzo livello
async function getCommentsVerbaleForApproval(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type) {
    const data = await postgresdbService.executeQuery(queryVerbali.getCommentsVerbale, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, "M"]);
    if (data.length == 0) {
        return "NO-REQUEST";
    } else if (data.filter(item => item.status == 'Approved').length > 0) {
        return "APPROVED";
    } else if (data.filter(item => item.status == 'Waiting').length > 0) {
        return "WAITING";
    } else {
        return "REJECTED";
    }
}

// Salvataggio commenti sul task terzo livello
async function saveCommentsVerbale(plant, sfc, wbe, id_lev_1, id_lev_2, id_lev_3, machine_type, user, comment, comment_type, status) {
    try {
        await postgresdbService.executeQuery(queryVerbali.saveCommentsVerbale, [plant, sfc, wbe, id_lev_1, id_lev_2, id_lev_3, machine_type, user, comment, comment_type, status]);
        return true;
    } catch (error) {
        return false;
    }
}

// Start task terzo livello (prima controllo che non sia già in In Work o Done)
// Se serve, faccio startare anche il secondo e primo livello
async function startTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, order, operation, user) {
    try {
        var data = await postgresdbService.executeQuery(queryVerbali.getInfoTerzoLivello, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type]);
        if (data.length == 0 || data[0].status_lev_3 == 'In Work') {
            return { result: false, message: "Operation already started." };
        }else if (data[0].status_lev_3 == 'Done') {
            return { result: false, message: "Operation already done." };
        }
        var infoSecondoLivello = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev2ByLev1, [plant, order, sfc, id_lev_1]);

        // terzo livello passa da New a In Work
        await postgresdbService.executeQuery(queryVerbali.startTerzoLivello, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, user]);
        // Gli altri terzo livello dello stesso secondo livello che sono in New passano In Queue
        await postgresdbService.executeQuery(queryVerbali.startOtherTerzoLivelloInQueue, [plant, sfc, id_lev_3]);
        // secondo livello passa da New a In Work (se lo era già non accade nulla)
        await postgresdbService.executeQuery(queryVerbali.startSecondoLivello, [plant, sfc, id_lev_1, id_lev_2, machine_type]);
        // Gli altri secondo livello dello stesso primo livello che sono in New passano In Queue
        await postgresdbService.executeQuery(queryVerbali.startOtherSecondoLivelloInQueue, [plant, sfc, id_lev_2]);
        // primo livello passa da New a In Work (se lo era già non accade nulla)
        if (infoSecondoLivello.filter(item => item.status_lev_3 == 'New').length == infoSecondoLivello.length) {
            var url = hostname+"/sfc/v1/sfcs/start";
            var params = {
                "plant": plant,
                "operation": operation,
                "resource": "DEFAULT",
                "sfcs": [sfc]
            };
            await callPost(url,params);
        }
        return { result: true, message: "Operation started successfully." };
    } catch (error) {
        return { result: false, message: error.message };
    }
}

// Complete task terzo livello (prima controllo che non sia già in Done)
// Se serve, faccio completare anche il secondo e primo livello
async function completeTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, order, operation, user) {
    try {
        var data = await postgresdbService.executeQuery(queryVerbali.getInfoTerzoLivello, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type]);
        if (data.length == 0 || data[0].status_lev_3 == 'New' || data[0].status_lev_3 == 'In Queue') {
            return { result: false, message: "Operation is not started yet." };
        } else if (data[0].status_lev_3 == 'Done') {
            return { result: false, message: "Operation already done." };
        }
        // terzo livello passa da In Work a Done
        await postgresdbService.executeQuery(queryVerbali.completeTerzoLivello, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, user]);
        // secondo livello passa da In Work a Done (se sono completati tutti i task)
        await postgresdbService.executeQuery(queryVerbali.completeSecondoLivello, [plant, sfc, id_lev_1, id_lev_2, machine_type]);
        // primo livello passa da In Work a Done (se sono completati tutti i task)
        var infoSecondoLivello = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev2ByLev1, [plant, order, sfc, id_lev_1]);
        if (infoSecondoLivello.filter(item => item.status_lev_3 == 'Done').length == infoSecondoLivello.length) {
            var url = hostname+"/sfc/v1/sfcs/complete";
            var params = {
                "plant": plant,
                "operation": operation,
                "resource": "DEFAULT",
                "sfcs": [sfc]
            };
            await callPost(url,params);
        }
        return { result: true, message: "Operation completed successfully." };
    } catch (error) {
        return { result: false, message: error.message };
    }
}

async function updateNonConformanceLevel3(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type) {
    try {
        await postgresdbService.executeQuery(queryVerbali.updateNonConformanceLevel3, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type]);
        return true;
    } catch (error) {
        return false;
    }
}

async function insertZVerbaleLev2(order, id_lev_1, lev_2, id_lev_2, machine_type, safety, time_lev_2, uom, workcenter_lev_2, plant, active, priority, wbe, date, operationActivityDescription) {
    try {
        await postgresdbService.executeQuery(queryVerbali.insertZVerbaleLev2, [order, id_lev_1, lev_2, id_lev_2, machine_type, safety, time_lev_2, uom, workcenter_lev_2, plant, active, priority, wbe, date, operationActivityDescription]);
        return true;
    } catch (error) {
        return false;
    }
}

async function insertZVerbaleLev3(order, id_lev_1, id_lev_2, id_lev_3, lev_3, machine_type, plant) {
    try {
        await postgresdbService.executeQuery(queryVerbali.insertZVerbaleLev3, [order, id_lev_1, id_lev_2, id_lev_3, lev_3, machine_type, plant]);
        return true;
    } catch (error) {
        return false;
    }
}

async function getCustomTableNC(plant, order) {
    try {
        var ordersToCheck = await ordersChildrenRecursion(plant, order);
        var data = await postgresdbService.executeQuery(queryVerbali.getGroupByPriorityDefects, [plant, ordersToCheck]);   
        // Aggiungo riga con totale
        var total = { priority: "TOTALE", description: "TOTALE", weight: "", quantity: 0, value: 0 };
        for (var i = 0; i < data.length; i++) {
            total.quantity += parseInt(data[i].quantity);
            total.value += parseInt(data[i].value);
        }  
        data.push(total);
        // una volta ottenuti i dati, estraggo anche il voto che rispetta il range in Z_REPORT_NC_TRANSCODE
        var votoSezioneQuery = await postgresdbService.executeQuery(queryVerbali.getVotoNCTranscode, [total.value]);
        if (votoSezioneQuery.length > 0) var votoSezione = votoSezioneQuery[0].voto;
        else var votoSezione = "NA";
        return { results: data, votoSezione: votoSezione };
    } catch (error) {
        return false;
    }
}

async function ordersChildrenRecursion(plant, order) {
    var ordersToCheck = [order], index = 0;
        while (index < ordersToCheck.length) {
            var currentOrder = ordersToCheck[index];            
            var childOrders = await postgresdbService.executeQuery(queryVerbali.getChildsOrders, [plant, currentOrder]);
            for (var i = 0; i < childOrders.length; i++) {
                if (!ordersToCheck.includes(childOrders[i].child_order)) { 
                    ordersToCheck.push(childOrders[i].child_order);
                }
            }
            index++;
        }
    return ordersToCheck;
}

// Recupero livello 2 per ordine
async function getVerbaleLev2ByOrder(order, plant) {
    const data = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev2ByOrder, [order, plant]);
    return data;
}

// Recupero livello 3 per ordine
async function getVerbaleLev3ByOrder(order, plant) {
    const data = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev3ByOrder, [order, plant]);
    return data;
}

// Update level 2 fields (workcenter, safety, active)
async function updateVerbaleLev2(plant, idLev1, idLev2, workcenter, safety, active) {
    await postgresdbService.executeQuery(queryVerbali.updateVerbaleLev2Fields, [plant, idLev2, workcenter, safety, active, idLev1]);
}

// Duplicate level 2 by stepId
async function duplicateVerbaleLev2(order, plant, newStepId, suffix, safety, workcenter, active, originalStepId, idLev2) {
    await postgresdbService.executeQuery(queryVerbali.duplicateVerbaleLev2ByStepId, [order, plant, newStepId, safety, workcenter, active, originalStepId, idLev2]);
}

// Duplicate level 3 by lev2 id
async function duplicateVerbaleLev3(order, plant, newStepId, suffix, originalLev2Id, originalLev1Id) {
    await postgresdbService.executeQuery(queryVerbali.duplicateVerbaleLev3ByLev2Ids, [order, plant, newStepId, originalLev2Id, originalLev1Id]);
}

// Duplicate marking recap
async function duplicateMarkingRecap(plant, order, newOperation, newOperationDescritption, originalOperation) {
    await postgresdbService.executeQuery(queryVerbali.duplicateMarkingRecap, [plant, order, newOperation, newOperationDescritption, originalOperation]);
}

// Delete level 2 by stepId
async function deleteVerbaleLev2(order, plant, stepId) {
    await postgresdbService.executeQuery(queryVerbali.deleteVerbaleLev2ByStepId, [order, plant, stepId]);
}

// Delete level 3 by stepId
async function deleteVerbaleLev3(order, plant, stepId) {
    await postgresdbService.executeQuery(queryVerbali.deleteVerbaleLev3ByStepId, [order, plant, stepId]);
}

// Delete marking recap by operation
async function deleteMarkingRecap(plant, order, operation) {
    await postgresdbService.executeQuery(queryVerbali.deleteMarkingRecapByOperation, [plant, order, operation]);
}

// Duplicate marking testing by stepId
async function duplicateMarkingTesting(plant, order, newStepId, originalStepId) {
    await postgresdbService.executeQuery(queryVerbali.duplicateMarkingTesting, [plant, order, newStepId, originalStepId]);
}

// Delete marking testing by stepId
async function deleteMarkingTesting(plant, order, stepId) {
    await postgresdbService.executeQuery(queryVerbali.deleteMarkingTestingByStepId, [plant, order, stepId]);
}

// Get SFC from comments for safety approval
async function getSfcFromComments(plant) {
    const data = await postgresdbService.executeQuery(queryVerbali.getSfcFromCommentsSafetyApproval, [plant]);
    return data;
}

// Get safety approval comments data
async function getSafetyApprovalCommentsData(plant) {
    const data = await postgresdbService.executeQuery(queryVerbali.getSafetyApprovalComments, [plant]);
    return data;
}

// Update comment approval
async function updateCommentApprovalStatus(plant, sfc, idLev2, user, comment) {
    await postgresdbService.executeQuery(queryVerbali.updateCommentApproval, [plant, sfc, idLev2, user, comment]);
}

// Update comment cancel
async function updateCommentCancelStatus(plant, sfc, idLev2, user) {
    await postgresdbService.executeQuery(queryVerbali.updateCommentCancel, [plant, sfc, idLev2, user]);
}

// Unblock verbale lev2
async function unblockVerbaleLev2(plant, sfc, idLev2, machineType) {
    await postgresdbService.executeQuery(queryVerbali.updateVerbaleLev2Unblock, [plant, sfc, idLev2, machineType]);
}

// Get verbale lev2 for unblocking
async function getVerbaleLev2ToUnblock(plant, sfc, machineType) {
    const data = await postgresdbService.executeQuery(queryVerbali.getVerbaleLev2ForUnblocking, [plant, sfc, machineType]);
    return data;
}

// Get report weight sections
async function getReportWeightSectionsData(report) {
    const data = await postgresdbService.executeQuery(queryVerbali.getReportWeightSections, [report]);
    return data;
}

// Get report weight by ID and report
async function getReportWeightData(report, id) {
    const data = await postgresdbService.executeQuery(queryVerbali.getReportWeightByIdAndReport, [report, id]);
    return data;
}

async function getActivitiesTesting(plant, sfcs) {
    const data = await postgresdbService.executeQuery(queryVerbali.getActivitiesTestingQuery, [plant, sfcs]);
    return data;
}

// Funzione per aggiornare owner e due_date in z_verbale_lev_2
async function updateActivitiesOwnerAndDueDate(activity) {
    const { id_lev_1, id_lev_2, order, owner, due_date } = activity;
    const data = await postgresdbService.executeQuery(queryVerbali.updateActivitiesOwnerAndDueDateQuery, 
        [owner, due_date, id_lev_1, id_lev_2, order]);
    return data;
}

// Funzione per recuperare i report weight con i valori da z_weight_values
async function getReportWeightWithValues(plant, project, order, report) {
    const data = await postgresdbService.executeQuery(queryVerbali.getReportWeightWithValuesQuery, 
        [plant, project, order, report]);
    return data;
}

// Funzione per inserire o aggiornare un valore in z_weight_values
async function upsertWeightValue(plant, project, order, weightData) {
    const { id, section, value } = weightData;
    const report = 'Testing';
    let dateNow = new Date();
    const data = await postgresdbService.executeQuery(queryVerbali.upsertWeightValueQuery, 
        [id, section, plant, project, order, report, value,dateNow]);
    return data;
}
async function updateZverbaleLev1TableWithSfc(plant, order, sfc) {
    const update = await postgresdbService.executeQuery(queryVerbali.updateZverbaleLev1TableWithSfcQuery, [plant, order, sfc]);
    return update;
}
async function updateZverbaleLev2TableWithSfc(plant, order, sfc) {
    const update = await postgresdbService.executeQuery(queryVerbali.updateZverbaleLev2TableWithSfcQuery, [plant, order, sfc]);
    return update;
}



module.exports = { getVerbaleLev2NotDone, getVerbaleLev2ByLev1, getAllMachineType, getInfoTerzoLivello, getCommentsVerbale, getCommentsVerbaleForApproval, saveCommentsVerbale, startTerzoLivello, completeTerzoLivello, updateNonConformanceLevel3, insertZVerbaleLev2, insertZVerbaleLev3, getCustomTableNC, ordersChildrenRecursion, getVerbaleLev2ByOrder, getVerbaleLev3ByOrder, updateVerbaleLev2, duplicateVerbaleLev2, duplicateVerbaleLev3, duplicateMarkingRecap, deleteVerbaleLev2, deleteVerbaleLev3, deleteMarkingRecap, duplicateMarkingTesting, deleteMarkingTesting, getSfcFromComments, getSafetyApprovalCommentsData, updateCommentApprovalStatus, updateCommentCancelStatus, unblockVerbaleLev2, getVerbaleLev2ToUnblock, getReportWeightSectionsData, getReportWeightData, getActivitiesTesting, updateActivitiesOwnerAndDueDate, getReportWeightWithValues, upsertWeightValue,updateZverbaleLev1TableWithSfc, updateZverbaleLev2TableWithSfc };