const getReasonsForVarianceQuery = `SELECT * FROM z_variance_type`;

const getMarkingDataQuery = `SELECT confirmation_number, planned_labor, marked_labor, remaining_labor, variance_labor
                                FROM z_marking_recap
                                WHERE project = $1 AND operation = $2`;

const insertOpConfirmation = `INSERT INTO z_op_confirmations (wbe_macchina, operation, mes_order,
                                 confirmation_number, marking_date, start_time, finish_time, marked_labor,
                                 uom_marked_labor, variance_labor, uom_variance_labor, reason_for_variance, user_id)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

const getZOrdersLinkByProjectParentOrderChildOrderFlagQuery = `SELECT *
                                FROM z_orders_link
                                WHERE project = $1 AND parent_order = $2 AND child_material in ($3) AND parent_assembly_flag = $4`;

module.exports = { getReasonsForVarianceQuery, getMarkingDataQuery, insertOpConfirmation, getZOrdersLinkByProjectParentOrderChildOrderFlagQuery };