const insertMarkingTestingQuery = ` INSERT INTO z_marking_testing (plant, wbs, network, "order", activity_id, id_lev_1, confirmation_number, planned_labor, uom_planned_labor, variance_labor, uom_variance, "type")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;

const getMarkingTestingQuery = ` SELECT * FROM z_marking_testing WHERE plant = $1 AND wbs = $2 and "type" = $3`;

const getMarkingDataTestingQuery = ` SELECT DISTINCT * FROM z_marking_testing where plant = $1 AND wbs = $2 and id_lev_1 = $3 and "type" = 'T' and "order" = $4`;

const getMarkingTestingByConfirmationNumberQuery = ` SELECT * FROM z_marking_testing WHERE plant = $1 AND confirmation_number = $2`;

const updateMarkingTestingQuery = ` UPDATE z_marking_testing 
    SET marked_labor = marked_labor + $4, variance_labor = variance_labor + $5,
    remaining_labor = CASE WHEN $4 = 0 THEN remaining_labor ELSE planned_labor - (marked_labor + $4) END
    WHERE plant = $1 and id_lev_1 = $2 and confirmation_number = $3`;

module.exports = { insertMarkingTestingQuery, getMarkingTestingQuery, getMarkingDataTestingQuery, updateMarkingTestingQuery, getMarkingTestingByConfirmationNumberQuery };