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
async function getAllMachineType(plant) {
    const data = await postgresdbService.executeQuery(queryVerbali.getAllMachineType, [plant]);
    return data;
}

// Recupero info su task terzo livello
async function getInfoTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type) {
    const data = await postgresdbService.executeQuery(queryVerbali.getInfoTerzoLivello, [plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type]);
    return data;
}

// Recupero commenti sul task terzo livello
async function getCommentsVerbale(plant, sfc, id_lev_2, id_lev_3, machine_type) {
    const data = await postgresdbService.executeQuery(queryVerbali.getCommentsVerbale, [plant, sfc, id_lev_2, id_lev_3, machine_type]);
    return data;
}

// Recupero commenti per approvazione del task terzo livello
async function getCommentsVerbaleForApproval(plant, sfc, id_lev_2, id_lev_3, machine_type) {
    const data = await postgresdbService.executeQuery(queryVerbali.getCommentsVerbaleForApproval, [plant, sfc, id_lev_2, id_lev_3, machine_type]);
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
async function saveCommentsVerbale(plant, sfc, id_lev_2, id_lev_3, machine_type, user, comment, comment_type) {
    try {
        await postgresdbService.executeQuery(queryVerbali.saveCommentsVerbale, [plant, sfc, id_lev_2, id_lev_3, machine_type, user, comment, comment_type]);
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
        // secondo livello passa da New a In Work (se lo era già non accade nulla)
        await postgresdbService.executeQuery(queryVerbali.startSecondoLivello, [plant, sfc, id_lev_1, id_lev_2, machine_type]);
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
        if (data.length == 0 || data[0].status_lev_3 == 'New') {
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

async function insertZVerbaleLev2(order, id_lev_1, lev_2, id_lev_2, machine_type, safety, time_lev_2, uom, workcenter_lev_2, plant, active, priority) {
    try {
        await postgresdbService.executeQuery(queryVerbali.insertZVerbaleLev2, [order, id_lev_1, lev_2, id_lev_2, machine_type, safety, time_lev_2, uom, workcenter_lev_2, plant, active, priority]);
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
        var data = await postgresdbService.executeQuery(queryVerbali.getGroupByPriorityDefects, [plant, "'" + ordersToCheck.join("','") + "'"]);      
        // Aggiungo riga con totale
        var total = { priority: "TOTALE", description: "Totale", weight: 0, quantity: 0 };
        for (var i = 0; i < data.length; i++) {
            total.weight += parseInt(data[i].weight);
            total.quantity += parseInt(data[i].quantity);
        }  
        total.value = total.weight * total.quantity;
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


module.exports = { getVerbaleLev2NotDone, getVerbaleLev2ByLev1, getAllMachineType, getInfoTerzoLivello, getCommentsVerbale, getCommentsVerbaleForApproval, saveCommentsVerbale, startTerzoLivello, completeTerzoLivello, updateNonConformanceLevel3, insertZVerbaleLev2, insertZVerbaleLev3, getCustomTableNC, ordersChildrenRecursion }