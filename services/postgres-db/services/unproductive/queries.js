const selectZUnproductive = `SELECT * from z_unproductive_wbs where plant = $1`;

const insertWBS = `INSERT INTO z_unproductive_wbs (plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group, coordination_activity)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;

const deleteWBS = `DELETE FROM z_unproductive_wbs WHERE confirmation_number = ANY($2) AND plant = $1`;

const updateWBS = `UPDATE z_unproductive_wbs SET wbe = $2, wbe_description = $3, wbs = $4, wbs_description = $5, network = $6, 
    network_description = $7, activity_id = $8, activity_id_description = $9, user_group = $11 
    WHERE plant = $1 and confirmation_number = $10`;

const getMarcatureDayAndValue = `select marking_date as "DAY", sum(marked_labor + variance_labor) as "VALUE" from z_op_confirmations where plant = $1 and user_personal_number = $2 
    and cancellation_flag = false and cancelled_confirmation is null group by marking_date `;

const getUnproductiveByConfirmationNumber = `SELECT * FROM z_unproductive_wbs WHERE plant = $1 AND confirmation_number = $2`;

module.exports = { selectZUnproductive, insertWBS, deleteWBS, updateWBS, getMarcatureDayAndValue, getUnproductiveByConfirmationNumber };


