const getMarkingDataQuery = `SELECT *
                            FROM z_marking_recap
                            WHERE wbe_machine = $1 AND mes_order = $2 AND operation = $3`;


const insertOpConfirmationQuery = `INSERT INTO z_op_confirmations (plant,wbe_machine, operation, mes_order,
                                sfc, confirmation_number, confirmation_counter, marking_date, marked_labor, uom_marked_labor, 
                                variance_labor, uom_variance_labor, reason_for_variance, user_id, user_personal_number, cancellation_flag, cancelled_confirmation,
                                modification, workcenter, operation_description, project, updated_timestamp, defect_id, testing)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`;   
                               
const updateMarkingRecapQuery = `UPDATE z_marking_recap
                                SET 
                                    marked_labor = marked_labor + CASE WHEN $1 THEN -$2::numeric ELSE $2::numeric END,
                                    variance_labor = variance_labor + CASE WHEN $1 THEN -$3::numeric ELSE $3::numeric END,
                                    remaining_labor = planned_labor - (marked_labor + CASE WHEN $1 THEN -$2::numeric ELSE $2::numeric END)
                                WHERE confirmation_number = $4`

const insertMarkingRecapQuery = `INSERT INTO z_marking_recap(plant,project,wbe_machine,operation,mes_order,confirmation_number,planned_labor,uom_planned_labor,marked_labor,uom_marked_labor,remaining_labor,uom_remaining_labor,variance_labor,uom_variance,operation_description,"modify")
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;


const getMarkingByConfirmationNumberQuery = `SELECT * FROM z_marking_recap WHERE confirmation_number = $1`;

const getZOpConfirmationDataByFilterQuery = `SELECT zoc.*,
COALESCE(zrc.planned_labor, zmt.planned_labor) as planned_labor,
COALESCE(zrc.uom_planned_labor, zmt.uom_planned_labor) as uom_planned_labor,
COALESCE(zrc.marked_labor,zmt.marked_labor) AS marked_labor_total,
COALESCE(zrc.uom_marked_labor,zmt.uom_marked_labor) as uom_marked_labor_total,
COALESCE(zrc.remaining_labor,zmt.remaining_labor) as remaining_labor,
COALESCE(zrc.uom_remaining_labor,zmt.uom_remaining_labor) as uom_remaining_labor,
COALESCE(zrc.variance_labor,zmt.variance_labor) AS variance_labor_total,
COALESCE(zrc.uom_variance,zmt.uom_variance) AS uom_variance_total,
zvt.description AS variance_description,zdef.title AS defect_description, zol.child_material
FROM z_op_confirmations zoc
LEFT JOIN z_marking_recap zrc ON zoc.confirmation_number = zrc.confirmation_number
left join z_marking_testing zmt on zoc.confirmation_number = zmt.confirmation_number 
LEFT JOIN z_orders_link zol on zol.child_order = zrc.mes_order or zol.child_order = zmt."order"  
LEFT JOIN z_variance_type zvt ON zoc.reason_for_variance = zvt.cause
LEFT JOIN z_defects zdef ON zoc.defect_id = zdef.id
                                                `;

const updateCancelFlagOpConfirmationQuery = `UPDATE z_op_confirmations
                                            SET cancellation_flag=true,
                                            cancelled_by = $3
                                            WHERE confirmation_number=$1 AND confirmation_counter=$2`;

const getModificationsBySfcQuery = `SELECT prog_eco,process_id,flux_type,"type"
                                    FROM z_modify
                                    WHERE plant=$1 AND (child_order = $2 OR sfc=$3)`;

const getProjectDataQuery = `SELECT DISTINCT project FROM z_op_confirmations WHERE plant = $1 and project IS NOT NULL AND project <> '' ORDER BY project`;

const getSumMarkedLaborByOrderQuery = `SELECT COALESCE(SUM(marked_labor), 0) as total_marked_labor 
                                        FROM z_marking_recap 
                                        WHERE plant = $1 AND mes_order = $2`;

const getSumVarianceLaborByOrderQuery = `SELECT COALESCE(SUM(variance_labor), 0) as total_variance_labor 
                                          FROM z_marking_recap 
                                          WHERE plant = $1 AND mes_order = $2`;

const getMarkingTestingDataByOrderQuery = `SELECT * 
                                             FROM z_marking_testing 
                                             WHERE plant = $1 AND "order" = $2 AND type = $3`;

const getAnalisiOreVarianzaQuery = `SELECT 
                                        SUBSTRING(reason_for_variance, 1, 2) as variance_cluster,
                                        SUM(variance_labor) as total_variance_labor
                                    FROM z_op_confirmations
                                    WHERE plant = $1 
                                        AND mes_order = $2 
                                        AND reason_for_variance IS NOT NULL 
                                        AND cancellation_flag = false
                                    GROUP BY SUBSTRING(reason_for_variance, 1, 2)`;

module.exports = { getMarkingDataQuery, updateMarkingRecapQuery, insertOpConfirmationQuery, insertMarkingRecapQuery, getMarkingByConfirmationNumberQuery, getZOpConfirmationDataByFilterQuery, updateCancelFlagOpConfirmationQuery, getModificationsBySfcQuery, getProjectDataQuery, getSumMarkedLaborByOrderQuery, getSumVarianceLaborByOrderQuery, getMarkingTestingDataByOrderQuery, getAnalisiOreVarianzaQuery };