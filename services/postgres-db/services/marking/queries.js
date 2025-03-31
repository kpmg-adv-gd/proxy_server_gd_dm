const getMarkingDataQuery = `SELECT *
                            FROM z_marking_recap
                            WHERE wbe_machine = $1 AND mes_order = $2 AND operation = $3`;

const updateMarkedLabor_ZMarkingRecapQuery = `UPDATE z_marking_recap
                                                SET marked_labor = ( 
                                                SELECT COALESCE(SUM(marked_labor), 0) AS marked_labor
                                                FROM z_op_confirmations
                                                WHERE wbe_machine = $1 AND mes_order = $2 AND operation = $3 AND cancellation_flag = false AND cancelled_confirmation = 0
                                                ),
                                                variance_labor = ( 
                                                SELECT COALESCE(SUM(variance_labor), 0) AS variance_labor
                                                FROM z_op_confirmations
                                                WHERE wbe_machine = $1 AND mes_order = $2 AND operation = $3 AND cancellation_flag = false AND cancelled_confirmation = 0
                                                ),
                                                remaining_labor = (
                                                SELECT COALESCE(SUM(planned_labor-marked_labor),0) AS remaining_labor
                                                FROM z_marking_recap
                                                WHERE wbe_machine = $1 AND mes_order = $2 AND operation = $3
                                                )
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

const getZOpConfirmationDataByFilterQuery = `SELECT zoc.*,zrc.planned_labor,zrc.uom_planned_labor,zrc.marked_labor AS marked_labor_total,zrc.uom_marked_labor as uom_marked_labor_total,zrc.remaining_labor,zrc.uom_remaining_labor,zrc.variance_labor AS variance_labor_total,zrc.uom_variance AS uom_variance_total,zvt.description AS variance_description
                                                FROM z_op_confirmations zoc
                                                LEFT JOIN z_marking_recap zrc ON zoc.confirmation_number = zrc.confirmation_number
                                                LEFT JOIN z_variance_type zvt ON zoc.reason_for_variance = zvt.cause
                                                `;

module.exports = { getMarkingDataQuery, updateMarkedLabor_ZMarkingRecapQuery, updateMarkingRecapQuery, calculateLaborQuery, getPlannedLaborQuery, insertOpConfirmationQuery, insertMarkingRecapQuery, getMarkingByConfirmationNumberQuery,
    getZOpConfirmationDataByFilterQuery
 };