const postgresdbService = require('../../connection');
const queryVariance = require("./queries");

async function insertMarkingTesting(plant, wbs, network, order, activity_id, id_lev_1, confirmation_number, planned_labor, uom_planned_labor, variance_labor, uom_variance, type) {
    const data = await postgresdbService.executeQuery(queryVariance.insertMarkingTestingQuery, [plant, wbs, network, order, activity_id, id_lev_1, confirmation_number, planned_labor, uom_planned_labor, variance_labor, uom_variance, type]);
    return data;
}

module.exports = { insertMarkingTesting }