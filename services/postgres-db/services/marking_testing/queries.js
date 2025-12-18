const insertMarkingTestingQuery = ` INSERT INTO z_marking_testing (plant, wbs, network, "order", activity_id, id_lev_1, confirmation_number, planned_labor, uom_planned_labor, variance_labor, uom_variance, "type")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;

const getMarkingTestingQuery = ` SELECT * FROM z_marking_testing WHERE plant = $1 AND wbs = $2 and "type" = $3`;

module.exports = { insertMarkingTestingQuery, getMarkingTestingQuery };