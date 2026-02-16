const postgresdbService = require('../../connection');
const { getErpPlantFromDMPlant, getPlantFromERPPlant } = require("../../../../utility/MappingPlant");
const queryDefect = require("./queries");
const queryPriority = require("../priority/queries");
const { dispatch } = require("../../../mdo/library");
const { getZSharedMemoryData } = require("../../../postgres-db/services/shared_memory/library");
const { getUserGroup } = require("../../../api/users/library");
const { callGet, callPost } = require("../../../../utility/CommonCallApi");
const { stringify } = require('yamljs');
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function insertZDefect(idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN,
    notificationType, coding, replaceInAssembly, defectNote, responsible, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, cause, project, phase, idLev1, idLev2, idLev3) {
    
    // Devo recuperare il campo custom del defect type, per salvarlo nella tabella z_defect
    let sapCode = await getOrderCustomDataDefectType(code, plant);
    console.log("SAP CODE: " + JSON.stringify(sapCode));
    if (sapCode && sapCode.data && sapCode.data.value && sapCode.data.value.length > 0) {
        sapCode = sapCode.data.value[0].DATA_FIELD_VALUE;
    }else{
        sapCode = null;
    }

    if (createQN) {
        var data = await postgresdbService.executeQuery(queryDefect.insertZDefect, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN,
                notificationType, coding, replaceInAssembly, defectNote, responsible, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, sapCode, cause, project, phase]);
    }else{
        var data = await postgresdbService.executeQuery(queryDefect.insertZDefectNoQN, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, sapCode, cause, project, phase]);
    }

    if (phase == "Testing") {
        await postgresdbService.executeQuery(queryDefect.insertZDefectTesting, [idDefect, plant, sfc, idLev1, idLev2, idLev3]); 
    }

    return data;

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

async function setNonconformanceField(id, plant) {
    var data = await postgresdbService.executeQuery(queryDefect.checkNonconformanceField, [id, plant]);
    console.log("dati difetto: " + JSON.stringify(datiDifetto))
    console.log("data: " + JSON.stringify(data))
    if (data.length == 0) {
        var datiDifetto = await postgresdbService.executeQuery(queryDefect.getDatiDifetto, [id, plant]);
        await postgresdbService.executeQuery(queryDefect.setNonconformanceField, [datiDifetto[0].id_lev_1, datiDifetto[0].id_lev_2, datiDifetto[0].id_lev_3, datiDifetto[0].sfc, plant]);
    }
}

async function receiveStatusByQNCode(jsonDefects) {

    var result = [];
    if (jsonDefects && jsonDefects.qn && jsonDefects.qn.length > 0) {
        for (var i=0; i < jsonDefects.qn.length; i++) {
            var item = jsonDefects.qn[i];
            var plant = await getPlantFromERPPlant(item.plant);
            console.log("PLANT MAPPING: " + item.plant + " -> " + plant);
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

async function getCauses(plant) {
    var data = await getZSharedMemoryData(plant,"CAUSA_DIFETTI");
    try {
        return JSON.parse(data[0].value);
    } catch (error) {
        console.error("Error parsing CAUSA_DIFETTI data: ", error);
    }
    return [];
}


async function getDefectsTI(plant, project,isOnlyOpenDefects) {
    var defects = [];
    if(isOnlyOpenDefects){
        defects = await postgresdbService.executeQuery(queryDefect.getDefectsTIOpen, [plant, project]);
    }else{ 
        defects = await postgresdbService.executeQuery(queryDefect.getDefectsTI, [plant, project]);
    }   
    var difettiStandard = [], codesTrovati = [], url = hostname;
    // prima di mandare a FE, recuperare dati STD
    url = hostname + "/nonconformancegroup/v1/nonconformancegroups?plant=" + plant;
    var groupResponse = await callGet(url);
    for (var i = 0; i < defects.length; i++) {
        try {
            // Altri dati custom
            defects[i].okClose = (!defects[i].create_qn || (defects[i].system_status != null && defects[i].system_status.includes("ATCO")) || defects[i].qn_annullata) && defects[i].status == "OPEN";
            // Recupero difetto standard
            if (difettiStandard.filter(dif => dif.id == defects[i].id).length == 0) {
                url = hostname + "/nonconformance/v2/nonconformances?plant=" + plant + "&sfc=" + defects[i].sfc + "&size=1000";
                var defectResponse = await callGet(url);
                defectResponse = defectResponse.content || [];
                difettiStandard = [...difettiStandard, ...defectResponse];
            }
            defects[i].defectStandard = difettiStandard.filter(dif => dif.id == defects[i].id)[0] || null;
            // Recupero code description
            if (codesTrovati.filter(code => code.code == defects[i].code).length == 0) {
                url = hostname + "/nonconformancecode/v1/nonconformancecodes?plant=" + plant + "&code=" + defects[i].code;
                var codeResponse = await callGet(url) || [];
                codesTrovati = [...codesTrovati, ...codeResponse];
            }
            defects[i].codeDescription = codesTrovati.filter(code => code.code == defects[i].code)[0]?.description || null;
            defects[i].groupDescription = groupResponse.filter(group => group.group == defects[i].group)[0]?.description || null;
            // Recupero livello 1 associato al difetto
            if (defects[i].phase == "Testing") {
                var urlRouting = hostname+"/routing/v1/routings?plant="+plant+"&routing="+defects[i].mes_order+"&type=SHOP_ORDER";
                var responseRouting = await callGet(urlRouting);
                responseRouting[0].routingOperationGroups.forEach(group => {
                    group.routingOperationGroupSteps.forEach(operation => {
                        if (operation.routingStep.stepId == defects[i].id_lev_1) {
                            defects[i].lev1 = operation.routingStep.description;
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Error processing defect ID " + defects[i].id + ": " + error);
        }
    }
    // Una volta aggiunti i dati, creo TreeTable partendo dal group description
    var treeTable = []
    for (var i = 0; i < defects.length; i++) {
        var child = {
            level: 2,
            id: defects[i].id,
            groupOrCode: defects[i].codeDescription,
            material: defects[i].material,
            priority: defects[i].priority,
            priority_description: defects[i].priority_description,
            user: defects[i].user,
            phase: defects[i].phase,
            status: defects[i].status,
            qn_code: defects[i].qn_code,
            okClose: defects[i].okClose,
            lev1: defects[i].lev1,
            lev2: defects[i].lev_2,
            lev3: defects[i].lev_3,
            system_status: defects[i].system_status,
            type_order: defects[i].type_order,
            mes_order: defects[i].mes_order,
            assembly: defects[i].assembly,
            title: defects[i].title,
            description: defects[i].description,
            varianceDesc: defects[i].variance_description,
            defect_note: defects[i].defect_note,
            responsible_description: defects[i].responsible_description,
            groupDesc: defects[i].groupDescription,
            codeDesc: defects[i].codeDescription,
            varianceDesc: defects[i].variance_description,
            blocking: defects[i].blocking,
            notification_type_description: defects[i].notification_type_description,
            coding_group_description: defects[i].coding_group_description,
            coding_description: defects[i].coding_description,
            replaced_in_assembly: defects[i].replaced_in_assembly,
            user_status: defects[i].user_status,
            approval_user: defects[i].approval_user,
            creation_date: defects[i].creation_date,
            cause: defects[i].cause,
            modifiedDateTime: defects[i].defectStandard.modifiedDateTime,
            hasAttachment: defects[i].defectStandard.fileIds && defects[i].defectStandard.fileIds.length > 0,
            fileIds: defects[i].defectStandard.fileIds || [],
            numDefect: defects[i].defectStandard.quantity || 1,
            sfc: defects[i].sfc,
            wbe: defects[i].wbe,
            dm_order: defects[i].dm_order,
            owner: defects[i].owner,
            due_date: defects[i].due_date
        };
        if (treeTable.filter(item => item.groupOrCode == defects[i].groupDescription).length == 0) {
            treeTable.push({
                level: 1,
                groupOrCode: defects[i].groupDescription,
                // elementi figli
                Children: [child]
            });
        }else{
            treeTable.filter(item => item.groupOrCode == defects[i].groupDescription)[0].Children.push(child);
        }
    }
    return treeTable;
}   

// Per il verbale
async function getDefectsToVerbale(plant, orders) {
    const defects = await postgresdbService.executeQuery(queryDefect.getDefectsToVerbale, [plant, orders]);
    var difettiStandard = [], codesTrovati = [], url = hostname;
    // prima di mandare a FE, recuperare dati STD
    url = hostname + "/nonconformancegroup/v1/nonconformancegroups?plant=" + plant;
    var groupResponse = await callGet(url);
    for (var i = 0; i < defects.length; i++) {
        try {
            // Altri dati custom
            defects[i].okClose = (!defects[i].create_qn || (defects[i].system_status != null && defects[i].system_status.includes("ATCO")) || defects[i].qn_annullata) && defects[i].status == "OPEN";
            // Recupero difetto standard
            if (difettiStandard.filter(dif => dif.id == defects[i].id).length == 0) {
                url = hostname + "/nonconformance/v2/nonconformances?plant=" + plant + "&sfc=" + defects[i].sfc + "&size=1000";
                var defectResponse = await callGet(url);
                defectResponse = defectResponse.content || [];
                difettiStandard = [...difettiStandard, ...defectResponse];
            }
            defects[i].defectStandard = difettiStandard.filter(dif => dif.id == defects[i].id)[0] || null;
            // Recupero code description
            if (codesTrovati.filter(code => code.code == defects[i].code).length == 0) {
                url = hostname + "/nonconformancecode/v1/nonconformancecodes?plant=" + plant + "&code=" + defects[i].code;
                var codeResponse = await callGet(url) || [];
                codesTrovati = [...codesTrovati, ...codeResponse];
            }
            defects[i].codeDescription = codesTrovati.filter(code => code.code == defects[i].code)[0]?.description || null;
            defects[i].groupDescription = groupResponse.filter(group => group.group == defects[i].group)[0]?.description || null;
            // Recupero livello 1 associato al difetto
            if (defects[i].phase == "Testing") {
                var urlRouting = hostname+"/routing/v1/routings?plant="+plant+"&routing="+defects[i].mes_order+"&type=SHOP_ORDER";
                var responseRouting = await callGet(urlRouting);
                responseRouting[0].routingOperationGroups.forEach(group => {
                    group.routingOperationGroupSteps.forEach(operation => {
                        if (operation.routingStep.stepId == defects[i].id_lev_1) {
                            defects[i].lev1 = operation.routingStep.description;
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Error processing defect ID " + defects[i].id + ": " + error);
        }
    }
    // Una volta aggiunti i dati, creo TreeTable partendo dal group description
    var treeTable = []
    for (var i = 0; i < defects.length; i++) {
        var child = {
            level: 2,
            id: defects[i].id,
            groupOrCode: defects[i].codeDescription,
            material: defects[i].material,
            priority: defects[i].priority,
            priority_description: defects[i].priority_description,
            user: defects[i].user,
            phase: defects[i].phase,
            status: defects[i].status,
            qn_code: defects[i].qn_code,
            okClose: defects[i].okClose,
            lev1: defects[i].lev1,
            lev2: defects[i].lev_2,
            lev3: defects[i].lev_3,
            system_status: defects[i].system_status,
            type_order: defects[i].type_order,
            mes_order: defects[i].mes_order,
            assembly: defects[i].assembly,
            title: defects[i].title,
            description: defects[i].description,
            varianceDesc: defects[i].variance_description,
            defect_note: defects[i].defect_note,
            responsible_description: defects[i].responsible_description,
            groupDesc: defects[i].groupDescription,
            codeDesc: defects[i].codeDescription,
            varianceDesc: defects[i].variance_description,
            blocking: defects[i].blocking,
            notification_type_description: defects[i].notification_type_description,
            coding_group_description: defects[i].coding_group_description,
            coding_description: defects[i].coding_description,
            replaced_in_assembly: defects[i].replaced_in_assembly,
            user_status: defects[i].user_status,
            approval_user: defects[i].approval_user,
            creation_date: defects[i].creation_date,
            cause: defects[i].cause,
            modifiedDateTime: defects[i].defectStandard.modifiedDateTime,
            hasAttachment: defects[i].defectStandard.fileIds && defects[i].defectStandard.fileIds.length > 0,
            fileIds: defects[i].defectStandard.fileIds || [],
            numDefect: defects[i].defectStandard.quantity || 1,
            sfc: defects[i].sfc,
            wbe: defects[i].wbe,
            dm_order: defects[i].dm_order,
            owner: defects[i].owner,
            due_date: defects[i].due_date
        };
        if (treeTable.filter(item => item.groupOrCode == defects[i].groupDescription).length == 0) {
            treeTable.push({
                level: 1,
                groupOrCode: defects[i].groupDescription,
                // elementi figli
                Children: [child]
            });
        }else{
            treeTable.filter(item => item.groupOrCode == defects[i].groupDescription)[0].Children.push(child);
        }
    }
    return treeTable;
}   

async function getDefectsFromAdditionalOperationsTI(plant, project, operation, sfc) {
    const defects = await postgresdbService.executeQuery(queryDefect.getDefectsFromAdditionalOperationsTI, [plant, project, operation, sfc]);
    var difettiStandard = [], codesTrovati = [], url = hostname;
    // prima di mandare a FE, recuperare dati STD
    url = hostname + "/nonconformancegroup/v1/nonconformancegroups?plant=" + plant;
    var groupResponse = await callGet(url);
    for (var i = 0; i < defects.length; i++) {
        // Recupero difetto standard
        if (difettiStandard.filter(dif => dif.id == defects[i].id).length == 0) {
            url = hostname + "/nonconformance/v2/nonconformances?plant=" + plant + "&sfc=" + defects[i].sfc + "&size=1000";
            var defectResponse = await callGet(url);
            defectResponse = defectResponse.content || [];
            difettiStandard = [...difettiStandard, ...defectResponse];
        }
        defects[i].defectStandard = difettiStandard.filter(dif => dif.id == defects[i].id)[0] || null;
        // Recupero code description
        if (codesTrovati.filter(code => code.code == defects[i].code).length == 0) {
            url = hostname + "/nonconformancecode/v1/nonconformancecodes?plant=" + plant + "&code=" + defects[i].code;
            var codeResponse = await callGet(url) || [];
            codesTrovati = [...codesTrovati, ...codeResponse];
        }
        defects[i].codeDescription = codesTrovati.filter(code => code.code == defects[i].code)[0]?.description || null;
        defects[i].groupDescription = groupResponse.filter(group => group.group == defects[i].group)[0]?.description || null;
        // Recupero livello 1 associato al difetto
        if (defects[i].phase == "Testing") {
            var urlRouting = hostname+"/routing/v1/routings?plant="+plant+"&routing="+defects[i].mes_order+"&type=SHOP_ORDER";
            var responseRouting = await callGet(urlRouting);
            responseRouting[0].routingOperationGroups.forEach(group => {
                group.routingOperationGroupSteps.forEach(operation => {
                    if (operation.routingStep.stepId == defects[i].id_lev_1) {
                        defects[i].lev1 = operation.routingStep.description;
                    }
                });
            });
        }
        // Altri dati custom
        defects[i].okClose = (!defects[i].create_qn || (defects[i].system_status != null && defects[i].system_status.includes("ATCO")) || defects[i].qn_annullata) && defects[i].status == "OPEN";
    }
    // Una volta aggiunti i dati, creo TreeTable partendo dal group description
    var treeTable = []
    for (var i = 0; i < defects.length; i++) {
        var child = {
            level: 2,
            id: defects[i].id,
            groupOrCode: defects[i].codeDescription,
            material: defects[i].material,
            priority: defects[i].priority,
            priority_description: defects[i].priority_description,
            user: defects[i].user,
            phase: defects[i].phase,
            status: defects[i].status,
            qn_code: defects[i].qn_code,
            okClose: defects[i].okClose,
            lev1: defects[i].lev1,
            lev2: defects[i].lev_2,
            lev3: defects[i].lev_3,
            system_status: defects[i].system_status,
            type_order: defects[i].type_order,
            mes_order: defects[i].mes_order,
            assembly: defects[i].assembly,
            title: defects[i].title,
            description: defects[i].description,
            varianceDesc: defects[i].variance_description,
            defect_note: defects[i].defect_note,
            responsible_description: defects[i].responsible_description,
            groupDesc: defects[i].groupDescription,
            codeDesc: defects[i].codeDescription,
            varianceDesc: defects[i].variance_description,
            blocking: defects[i].blocking,
            notification_type_description: defects[i].notification_type_description,
            coding_group_description: defects[i].coding_group_description,
            coding_description: defects[i].coding_description,
            replaced_in_assembly: defects[i].replaced_in_assembly,
            user_status: defects[i].user_status,
            approval_user: defects[i].approval_user,
            creation_date: defects[i].creation_date,
            cause: defects[i].cause,
            modifiedDateTime: defects[i].defectStandard.modifiedDateTime,
            hasAttachment: defects[i].defectStandard.fileIds && defects[i].defectStandard.fileIds.length > 0,
            fileIds: defects[i].defectStandard.fileIds || [],
            numDefect: defects[i].defectStandard.quantity || 1,
            sfc: defects[i].sfc,
            dm_order: defects[i].dm_order
        };
        if (treeTable.filter(item => item.groupOrCode == defects[i].groupDescription).length == 0) {
            treeTable.push({
                level: 1,
                groupOrCode: defects[i].groupDescription,
                // elementi figli
                Children: [child]
            });
        }else{
            treeTable.filter(item => item.groupOrCode == defects[i].groupDescription)[0].Children.push(child);
        }
    }
    return treeTable;
}   

async function getFiltersDefectsTI() {
    var phase = await postgresdbService.executeQuery(queryDefect.getPhaseDefects, []);
    var status = await postgresdbService.executeQuery(queryDefect.getStatusDefects, []);
    var priority = await postgresdbService.executeQuery(queryPriority.getZPriorityDataQuery, []);
    return { 
        phase: [...[{phase: ""}], ...phase], 
        status: [...[{status: ""}], ...status],
        priority: [...[{priority: "", description: ""}], ...priority]
    };
}   

async function updateDefectsToTesting(plant, listOrders) {
    const data = await postgresdbService.executeQuery(queryDefect.updateDefectsToTesting, [plant, listOrders]);
    return data;
}

async function getDefectsTesting(orders) {
    const data = await postgresdbService.executeQuery(queryDefect.getDefectsTestingQuery, [orders]);
    return data;
}

// Funzione per aggiornare owner e due_date in z_defects
async function updateDefectsOwnerAndDueDate(defect) {
    const { id, owner, due_date } = defect;
    const data = await postgresdbService.executeQuery(queryDefect.updateDefectsOwnerAndDueDateQuery, 
        [owner, due_date, id]);
    return data;
}

module.exports = { insertZDefect, getDefectsWBE, setNonconformanceField, updateZDefect, getOrderCustomDataDefectType, selectZDefect, selectDefectToApprove, cancelDefectQN, sendApproveDefectQN, selectDefectForReport, getOrderCustomDataDefect, closeDefect, sendApproveQNToSap, checkAllDefectClose, receiveStatusByQNCode, getCauses, getDefectsTI, getDefectsFromAdditionalOperationsTI, getFiltersDefectsTI, updateDefectsToTesting, getDefectsTesting, updateDefectsOwnerAndDueDate, getDefectsToVerbale };