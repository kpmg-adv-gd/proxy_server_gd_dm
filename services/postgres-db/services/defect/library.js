const postgresdbService = require('../../connection');
const { getErpPlantFromDMPlant, getPlantFromERPPlant } = require("../../../../utility/MappingPlant");
const queryDefect = require("./queries");
const { dispatch } = require("../../../mdo/library");
const { getZSharedMemoryData } = require("../../../postgres-db/services/shared_memory/library");
const { callGet, callPost } = require("../../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function insertZDefect(idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, 
    notificationType, coding, replaceInAssembly, defectNote, responsible, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder) {
    
    // Devo recuperare il campo custom del defect type, per salvarlo nella tabella z_defect
    let sapCode = await getOrderCustomDataDefectType(code, plant);
    console.log("SAP CODE: " + JSON.stringify(sapCode));
    if (sapCode && sapCode.data && sapCode.data.value && sapCode.data.value.length > 0) {
        sapCode = sapCode.data.value[0].DATA_FIELD_VALUE;
    }else{
        sapCode = null;
    }

    if (createQN) {
        const data = await postgresdbService.executeQuery(queryDefect.insertZDefect, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, 
                notificationType, coding, replaceInAssembly, defectNote, responsible, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, sapCode]);
        return data;
    }else{
        const data = await postgresdbService.executeQuery(queryDefect.insertZDefectNoQN, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, sapCode]);
        return data;
    }
}

async function updateZDefect(idDefect, title, description, priority, variance, create_qn, blocking, notificationType, coding, replaceInAssembly, defectNote, responsible){
    const data = await postgresdbService.executeQuery(queryDefect.updateZDefect, 
            [idDefect, title, description, priority, create_qn, variance, blocking, notificationType, coding, replaceInAssembly, defectNote, responsible]);
    return data;
}

async function selectZDefect(listDefect, plant) {
    const data = await postgresdbService.executeQuery(queryDefect.selectZDefect, [listDefect, plant]);
    return data;
}

async function selectDefectToApprove(plant) {
    const data = await postgresdbService.executeQuery(queryDefect.selectDefectToApprove, [plant]);
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

async function getOrderCustomDataDefectType(code, plant) {
    try {
        const mockReq = {
            path: "/mdo/NON_CONFORMANCE_CODE_CUSTOM_DATA",
            query: { $apply: "filter(DATA_FIELD eq 'SAP CODE' and NC_CODE eq '" + code + "' and PLANT eq '" + plant + "')" },
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

async function sendApproveDefectQN(dataForSap, defectId, userId, plant) {
    const data = await postgresdbService.executeQuery(queryDefect.sendApproveDefectQN, [defectId, userId]);
    if (data) {
        var response = await sendApproveQNToSap(dataForSap, plant, defectId);
    }
    return response;
}   

async function getDefectsWBE(plant) {
    const data = await postgresdbService.executeQuery(queryDefect.getDefectsWBE, [plant]);
    return data;
}   

async function sendApproveQNToSap(dataForSap, plant, defectId) {
    var pathApproveQN = await getZSharedMemoryData(plant,"APPROVE_QN");
    if(pathApproveQN.length>0) pathApproveQN = pathApproveQN[0].value;
    var url = hostname + pathApproveQN;

    dataForSap.materialPlant = await getErpPlantFromDMPlant(plant);

    console.log("SAP body:"+JSON.stringify(dataForSap));
    let response = await callPost(url,dataForSap);
    console.log("RESPONSE SAP: "+JSON.stringify(response));


    if (response.OUTPUT.esito == "OK") {
        console.log("UPDATE DIFETTO: "+ defectId);
        await postgresdbService.executeQuery(queryDefect.receiveQNCode, [defectId, response.OUTPUT.qmnum, response.OUTPUT.link_qn, response.OUTPUT.system_status, response.OUTPUT.user_status]);
    }

    return response;
}

async function closeDefect(defectId, qnCode, plant) {

    if (qnCode && qnCode != null && qnCode != "") {
        var pathCloseDefect = await getZSharedMemoryData(plant, "CLOSE_DEFECT");
        if (pathCloseDefect.length > 0) pathCloseDefect = pathCloseDefect[0].value;
        var url = hostname + pathCloseDefect;

        var dataForSap = {
            qualityNotificationNumber: qnCode
        }

        console.log("SAP body:" + JSON.stringify(dataForSap));
        let response = await callPost(url, dataForSap);
        console.log("RESPONSE SAP: " + JSON.stringify(response));

        if (response.OUTPUT && response.OUTPUT.outcome == "OK") {
            await postgresdbService.executeQuery(queryDefect.closeDefect, [defectId]);
            if (response.OUTPUT.message) {
                await postgresdbService.executeQuery(queryDefect.updateStatusCloseDefect, [defectId, response.OUTPUT.message]);
            }
            return response;
        }else{
            return response;
        }
    }else{
        await postgresdbService.executeQuery(queryDefect.closeDefect, [defectId]);
        return "OK";
    }

}

async function checkAllDefectClose(sfc) {
    const data = await postgresdbService.executeQuery(queryDefect.checkAllDefectClose, [sfc]);
    // If the length of the data is 0, it means there are no open defects
    return data.length === 0;
}

async function receiveStatusByQNCode(jsonDefects) {

    var result = [];
    if (jsonDefects && jsonDefects.qn && jsonDefects.qn.length > 0) {
        for (var i=0; i < jsonDefects.qn.length; i++) {
            var item = jsonDefects.qn[i];
            var plant = await getPlantFromERPPlant(item.plant);
            var qn_code = item.qn_code;
            var qn_link = item.qn_link;
            var system_status = item.system_status;
            var user_status = item.user_status;
            var data = await postgresdbService.executeQuery(queryDefect.receiveStatusByQNCode, [plant, qn_code, qn_link, system_status, user_status]);
            result.push(data);
        }
    }
    return result;
}

module.exports = { insertZDefect, getDefectsWBE, updateZDefect, selectZDefect, selectDefectToApprove, cancelDefectQN, sendApproveDefectQN, selectDefectForReport, getOrderCustomDataDefect, closeDefect, sendApproveQNToSap, checkAllDefectClose, receiveStatusByQNCode };
