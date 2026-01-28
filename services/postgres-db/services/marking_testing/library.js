const postgresdbService = require('../../connection');
const queryMarking = require("./queries");

async function insertMarkingTesting(plant, wbs, network, order, activity_id, id_lev_1, confirmation_number, planned_labor, uom_planned_labor, variance_labor, uom_variance, type) {
    const data = await postgresdbService.executeQuery(queryMarking.insertMarkingTestingQuery, [plant, wbs, network, order, activity_id, id_lev_1, confirmation_number, planned_labor, uom_planned_labor, variance_labor, uom_variance, type]);
    return data;
}

async function getMarkingTesting(plant, project, type) {
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingTestingQuery, [plant, project, type]);
    return data;
}

async function getMarkingDataTesting(plant, wbs, id_lev_1, order) {
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingDataTestingQuery, [plant, wbs, id_lev_1, order ]);
    return data;
}

async function updateZMarkingTesting(plant, confirmationNumber, durationMarked, durationVariance) {
    await postgresdbService.executeQuery(queryMarking.updateMarkingTestingQuery, [plant, confirmationNumber, durationMarked, durationVariance]);
}

async function getMarkingTestingByConfirmationNumber(plant, confirmationNumber) {
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingTestingByConfirmationNumberQuery, [plant, confirmationNumber]);
    return data;
}

module.exports = { insertMarkingTesting, getMarkingTesting, getMarkingDataTesting, updateZMarkingTesting, getMarkingTestingByConfirmationNumber }