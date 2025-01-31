const getReasonsForVarianceQuery = "SELECT * FROM z_tipologia_varianza";

const getMarkingDataQuery = `SELECT confirmation_number, planned_labor, marked_labor, remaining_labor
                                FROM z_marcature
                                WHERE project = $1 AND operation = $2`;

const insertOpConfirmation = `INSERT INTO z_op_conferme (wbe_macchina, operation, mes_order, 
                                confirmation_number, marking_date, start_time, finish_time, reason_for_variance)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

const getZOrdersLinkByProjectParentOrderChildOrderFlagQuery = `SELECT *
                                FROM z_orders_link
                                WHERE project = $1 AND parent_order = $2 AND child_material = $3 AND parent_assembly_flag = $4`;

module.exports = { getReasonsForVarianceQuery, getMarkingDataQuery, insertOpConfirmation, getZOrdersLinkByProjectParentOrderChildOrderFlagQuery };