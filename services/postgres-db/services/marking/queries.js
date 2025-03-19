const getMarkingDataQuery = `SELECT confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor,
                                remaining_labor, uom_remaining_labor, variance_labor, uom_variance
                                FROM z_marking_recap
                                WHERE wbe_machine = $1 AND mes_order = $2 AND operation = $3`;
                                
const calculateLaborQuery = `SELECT COALESCE(SUM(marked_labor), 0) AS marked_labor, COALESCE(SUM(variance_labor), 0) AS variance_labor
                                FROM z_op_confirmations 
                                WHERE confirmation_number = $1`

const getPlannedLaborQuery = `SELECT planned_labor 
                                FROM z_marking_recap 
                                WHERE confirmation_number = $1`

const insertOpConfirmationQuery = `INSERT INTO z_op_confirmations (wbe_machine, operation, mes_order,
                                confirmation_number, marking_date, start_time, finish_time, marked_labor,
                                uom_marked_labor, variance_labor, uom_variance_labor, reason_for_variance, user_id)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;   
                               
const updateMarkingRecapQuery = `UPDATE z_marking_recap
                                SET 
                                    marked_labor = $1,
                                    variance_labor = $2,
                                    remaining_labor = $3
                                WHERE confirmation_number = $4`

const insertMarkingRecapQuery = `INSERT INTO z_marking_recap(plant,project,wbe_machine,operation,mes_order,confirmation_number,planned_labor,uom_planned_labor,marked_labor,uom_marked_labor,remaining_labor,uom_remaining_labor,variance_labor,uom_variance)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;


const getMarkingByConfirmationNumberQuery = `SELECT * FROM z_marking_recap WHERE confirmation_number = $1`;

module.exports = { getMarkingDataQuery, updateMarkingRecapQuery, calculateLaborQuery, getPlannedLaborQuery, insertOpConfirmationQuery, insertMarkingRecapQuery, getMarkingByConfirmationNumberQuery };