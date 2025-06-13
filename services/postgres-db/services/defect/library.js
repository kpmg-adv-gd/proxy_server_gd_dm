const postgresdbService = require('../../connection');
const queryDefect = require("./queries");
const { dispatch } = require("../../../mdo/library");
const { getZSharedMemoryData } = require("../../../postgres-db/services/shared_memory/library");

async function insertZDefect(idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, 
    notificationType, coding, replaceInAssembly, defectNote, responsible, time, sfc, user, operation){
    if (createQN) {
        const data = await postgresdbService.executeQuery(queryDefect.insertZDefect, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, 
                notificationType, coding, replaceInAssembly, defectNote, responsible, time, sfc, user, operation]);
        return data;
    }else{
        const data = await postgresdbService.executeQuery(queryDefect.insertZDefectNoQN, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, sfc, user, operation]);
        return data;
    }
}

async function selectZDefect(listDefect) {
    const data = await postgresdbService.executeQuery(queryDefect.selectZDefect, [listDefect]);
    return data;
}

async function selectDefectToApprove() {
    const data = await postgresdbService.executeQuery(queryDefect.selectDefectToApprove);
    return data;
}   

// Questa chiamata ottiene in input direttamente la query da eseguire
async function selectDefectForReport(query) {
    const data = await postgresdbService.executeQuery(query, []);
    return data;    
}

async function getOrderCustomDataDefect(sfc, plant) {
    try {
        const mockReq = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: "filter((DATA_FIELD eq 'ORDER_TYPE' or DATA_FIELD eq 'PURCHASE_ORDER') and MFG_ORDER eq '" + sfc + "' and PLANT eq '" + plant + "')" },
            method: "GET"
        };
        try {
            //chiamo l'api del mdo con quella request
            var result = await dispatch(mockReq);
            //ritorno un oggetto con chiave della chiamta e il suo risultato
            return result
        } catch (error) {
            return { error: true, message: error.message, code: error.code || 500 }; // Errore
        }

    } catch (e) {
        console.error("Errore in getOrderCustomDataDefect: " + e);
        throw new Error("Errore in getOrderCustomDataDefect:" + e);
    }

}

async function cancelDefectQN(defectId, userId) {
    const data = await postgresdbService.executeQuery(queryDefect.cancelDefectQN, [defectId, userId]);
    return data;
}

async function approveDefectQN(defectId, userId, dataForSap) {
    const data = await postgresdbService.executeQuery(queryDefect.approveDefectQN, [defectId, userId]);
    if (data && data.rowCount > 0) {
        await sendApproveQNToSap(dataForSap);
    }
    return data;
}   

async function sendApproveQNToSap(dataForSap) {
    var pathApproveQN = await getZSharedMemoryData(plant,"APPROVE_QN");
    if(pathApproveQN.length>0) pathApproveQN = pathApproveQN[0].value;
    var url = hostname + pathApproveQN;
    console.log("URL SAP: "+url);

    console.log("SAP body:"+JSON.stringify(dataForSap));
    let response = await callPost(url,dataForSap);
    console.log("RESPONSE SAP: "+JSON.stringify(response));

    return response;
}


module.exports = { insertZDefect, selectZDefect, selectDefectToApprove, cancelDefectQN, approveDefectQN, selectDefectForReport, getOrderCustomDataDefect };