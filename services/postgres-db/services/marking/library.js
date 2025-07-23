const postgresdbService = require('../../connection');
const queryMarking = require("./queries");


async function getZOpConfirmationData(plant,project,wbe,userId,startMarkingDate,endMarkingDate){
    let whereCondition = " WHERE zoc.cancelled_confirmation IS NULL and zoc.plant ='"+plant+"'";
    if (!!project) {
        whereCondition += " AND zoc.project = '"+project+"'";
    }
    if(!!wbe){
        whereCondition += " AND zoc.wbe_machine LIKE '%"+wbe+"%'";
    } 
    if(!!userId){
        whereCondition += " AND zoc.user_id LIKE '%"+userId+"%'";
    }
    if(!!startMarkingDate && endMarkingDate){
        whereCondition += " AND TO_DATE(zoc.marking_date, 'DD/MM/YYYY') BETWEEN TO_DATE('"+startMarkingDate+"', 'DD/MM/YYYY') AND TO_DATE('"+endMarkingDate+"', 'DD/MM/YYYY')";
    }
    whereCondition += " ORDER BY zoc.confirmation_number::numeric ASC,zoc.confirmation_counter DESC, TO_DATE(zoc.marking_date, 'DD/MM/YYYY') DESC"
    const fullQuery = queryMarking.getZOpConfirmationDataByFilterQuery+whereCondition;
    const data = await postgresdbService.executeQuery(fullQuery,[]);
    return data;
}

async function insertZMarkingRecap(plant,project,wbe_machine,operation,mes_order,confirmation_number,planned_labor,uom_planned_labor,marked_labor,uom_marked_labor,remaining_labor,uom_remaining_labor,variance_labor,uom_variance,opDescription,isModify){
    const data = await postgresdbService.executeQuery(queryMarking.insertMarkingRecapQuery, [plant,project, wbe_machine, operation, mes_order, confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor, remaining_labor, uom_remaining_labor, variance_labor, uom_variance,opDescription,isModify]);
    return data;
}


async function getMarkingByConfirmationNumber(confirmationNumber){
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingByConfirmationNumberQuery, [confirmationNumber]);
    return data;
}

async function getMarkingData(wbe_machine, mes_order, operation) {
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingDataQuery, [wbe_machine, mes_order, operation]);
    return data;
}

async function insertOpConfirmation(plant,wbe_machine, operation, mes_order,sfc, confirmation_number, confirmation_counter, marking_date, marked_labor, uom_marked_labor, variance_labor, uom_variance_labor, reason_for_variance, user_id, user_personal_number, cancellation_flag, cancelled_confirmation,modification, workcenter, operation_description, project, defectId) {
    let actualDate = new Date();
    const data = await postgresdbService.executeQuery(queryMarking.insertOpConfirmationQuery, [plant,wbe_machine, operation, mes_order,sfc, confirmation_number, confirmation_counter, marking_date, marked_labor, uom_marked_labor, variance_labor, uom_variance_labor, reason_for_variance, user_id, user_personal_number, cancellation_flag, cancelled_confirmation,modification, workcenter, operation_description, project, actualDate, defectId]);
    return data;
}

async function updateZMarkingRecap(confirmation_number,cancelled_confirmation,marked_labor,variance_labor) {
    let isStorno = cancelled_confirmation && cancelled_confirmation !== "";
    await postgresdbService.executeQuery(queryMarking.updateMarkingRecapQuery, [isStorno,marked_labor,variance_labor,confirmation_number]);
}

async function updateCancelFlagOpConfirmation(confirmation_number,cancelled_confirmation,user_id) {
    await postgresdbService.executeQuery(queryMarking.updateCancelFlagOpConfirmationQuery, [confirmation_number,cancelled_confirmation,user_id]);
}
async function getModificationsBySfcService(plant,order,sfc) {
    const data = await postgresdbService.executeQuery(queryMarking.getModificationsBySfcQuery, [plant,order,sfc]);
    return data;
}

async function getProjectData(plant) {
    const data = await postgresdbService.executeQuery(queryMarking.getProjectDataQuery, [plant]);
    return data;
}

module.exports = { getMarkingData, insertOpConfirmation, insertZMarkingRecap, getMarkingByConfirmationNumber,getZOpConfirmationData, updateZMarkingRecap, updateCancelFlagOpConfirmation, getModificationsBySfcService, getProjectData }