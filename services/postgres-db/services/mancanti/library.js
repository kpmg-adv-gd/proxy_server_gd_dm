const postgresdbService = require('../../connection');
const queryLoipro = require("./queries");
const { getBomInfoByOrder, getMaterial } = require('../../../../utility/CommonFunction');

async function updateZSpecialGroups(plant,project,wbe,order,isElaborated){
    const data = await postgresdbService.executeQuery(queryLoipro.updateZSpecialGroupsQuery, [isElaborated,plant, project, wbe, order]);
    return data;
}

async function getZSpecialGroupsNotElbaoratedByWBS(pojectsArray){
    const data = await postgresdbService.executeQuery(queryLoipro.getZSpecialGroupsNotElbaoratedByWBSQuery, [pojectsArray]);
    return data;
}

async function upsertZReportMancanti(plant,project,wbs_element,order,material,missing_material,materialDescription,missing_quantity,receipt_expected_date,first_conf_date,mrp_date,date_from_workshop,cover_element,storage_location,component_order,isMissing){
    // Applicare formattazione data per ogni data
    receipt_expected_date = formatDate(receipt_expected_date);
    first_conf_date = formatDate(first_conf_date);
    mrp_date = formatDate(mrp_date);
    date_from_workshop = formatDate(date_from_workshop);

    const data = await postgresdbService.executeQuery(queryLoipro.upsertZReportMancantiQuery, [plant,project,wbs_element,order,material,missing_material,materialDescription,missing_quantity,receipt_expected_date,first_conf_date,mrp_date,date_from_workshop,cover_element,storage_location,component_order,isMissing]);
    return data;
}

async function getZMancantiReportData(plant,project,wbe,typeMancante,startDeliveryDate,endDeliveryDate){
    let whereCondition = "";
    if(!!project){
        whereCondition += " AND mr.project LIKE '%"+project+"%'";
    } 
    if(!!wbe){
        whereCondition += " AND mr.wbs_element LIKE '%"+wbe+"%'";
    }
    if(!!typeMancante){
        whereCondition += " AND mr.type_mancante LIKE '%"+typeMancante+"%'";
    }
    if(!!startDeliveryDate && endDeliveryDate){
        whereCondition += " AND TO_DATE(mr.delivery_date, 'DD/MM/YYYY') BETWEEN TO_DATE('"+startDeliveryDate+"', 'DD/MM/YYYY') AND TO_DATE('"+endDeliveryDate+"', 'DD/MM/YYYY')";
    }
    const fullQuery = queryLoipro.getZMancantiReportDataQuery+whereCondition;
    var data = await postgresdbService.executeQuery(fullQuery, [plant]);
    return data;
}

async function getZMancantiReportDataToVerbale(plant,project,ordersList){
    var inOrders = "'" + ordersList.join("','") + "'";
    var fullQuery = 'select * from z_report_mancanti where plant = $1 and project = $2 and "order" in ('+inOrders+') and active = true';
    var data = await postgresdbService.executeQuery(fullQuery, [plant, project]);
    return data;
}

async function getMancantiInfoData(plant,project,orderGroup){
    const responseQuery = await postgresdbService.executeQuery(queryLoipro.getMancantiInfoDataQuery, [plant,project,orderGroup]);
    let responseBom = await getBomInfoByOrder(plant,orderGroup);
    let numberGroupComponents = responseBom[0].components.length;
    let numberMancanti = responseQuery[0].tot_mancanti;
    let response = {
        numberGroupComponents: numberGroupComponents,
        numberMancanti: numberMancanti
    }
    return response;
}

async function getTotalQuantityFromOrders(plant, ordersList){
    const responseQuery = await postgresdbService.executeQuery(queryLoipro.getTotalQuantityFromOrders, [plant, ordersList]);
    return responseQuery[0].counter;
}

// Gestire le date "00000000"
function formatDate(date) {
    // Se la data è "00000000" o "falsy", restituisci NULL
    if (date === "00000000" || !date) return null;

    // Se la data è nel formato YYYYMMDD (8 cifre), la converto in YYYY-MM-DD
    const dateRegex = /^\d{8}$/;  // Controlla se la data è nel formato 'YYYYMMDD'
    if (dateRegex.test(date)) {
        // Es. '20250728' -> '2025-07-28'
        return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
    }
    // Se la data è già nel formato corretto, la restituisco così com'è
    return date;
}

// Funzione per aggiornare owner e due_date in z_report_mancanti
async function updateMancantiOwnerAndDueDate(mancante) {
    const { plant, order, project, material, missing_component, owner, due_date } = mancante;
    const data = await postgresdbService.executeQuery(queryLoipro.updateMancantiOwnerAndDueDateQuery, 
        [owner, due_date, plant, order, project, material, missing_component]);
    return data;
}

module.exports = { updateZSpecialGroups, getZSpecialGroupsNotElbaoratedByWBS, getZMancantiReportDataToVerbale, upsertZReportMancanti, getZMancantiReportData, getMancantiInfoData, getTotalQuantityFromOrders, updateMancantiOwnerAndDueDate }