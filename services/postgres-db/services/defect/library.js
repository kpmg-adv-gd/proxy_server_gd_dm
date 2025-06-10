const postgresdbService = require('../../connection');
const queryDefect = require("./queries");

async function insertZDefect(idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, 
    notificationType, coding, replaceInAssembly, defectNote, responsible, time, sfc){
    if (createQN) {
        const data = await postgresdbService.executeQuery(queryDefect.insertZDefect, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, 
                notificationType, coding, replaceInAssembly, defectNote, responsible, time, sfc]);
        return data;
    }else{
        const data = await postgresdbService.executeQuery(queryDefect.insertZDefectNoQN, 
            [idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, sfc]);
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

async function cancelDefectQN(defectId, userId) {
    const data = await postgresdbService.executeQuery(queryDefect.cancelDefectQN, [defectId, userId]);
    return data;
}

async function approveDefectQN(defectId, userId) {
    const data = await postgresdbService.executeQuery(queryDefect.approveDefectQN, [defectId, userId]);
    return data;
}   

// Questa chiamata ottiene in input direttamente la query da eseguire
async function selectDefectForReport(query) {
    const data = await postgresdbService.executeQuery(query, []);
    return data;    
}

module.exports = { insertZDefect, selectZDefect, selectDefectToApprove, cancelDefectQN, approveDefectQN, selectDefectForReport };