const getVerbaleLev2NotDoneQuery = `SELECT DISTINCT "order", plant, sfc, workcenter_lev_2 FROM z_verbale_lev_2 WHERE plant = $1 AND workcenter_lev_2 = $2 AND status_lev_2 != 'Done' and sfc is not null`;

const getVerbaleLev2ByLev1 = `SELECT l2.sfc, l2.id_lev_2, l2.lev_2, l2.machine_type as machine_type_2, l2.safety, 
    l2.status_lev_2 as status, l2.time_lev_2, l2.workcenter_lev_2, l2.wbe, 
    l3.id_lev_3, l3.lev_3, l3.status_lev_3, l3.machine_type as machine_type_3, l3.status_lev_3, l3.nonconformances
    FROM z_verbale_lev_2 l2 
    INNER JOIN z_verbale_lev_3 l3 ON l2.id_lev_2 = l3.id_lev_2 AND l2.sfc = l3.sfc
    WHERE l2.plant = $1 AND l2."order" = $2 AND l2.sfc = $3
    AND l2.id_lev_1 = $4 AND l3.id_lev_1 = $4 AND l2.active = true 
    ORDER BY l3.id_lev_2, l3.id_lev_3`;

const getAllMachineType = `SELECT DISTINCT wbe, machine_type FROM z_verbale_lev_2 WHERE plant = $1 and sfc = $2 ORDER BY wbe, machine_type`;

const getInfoTerzoLivello = `SELECT "order", sfc, id_lev_2, id_lev_3, lev_3, machine_type, status_lev_3, 
    TO_CHAR((start_date  AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as start_date,
    TO_CHAR((complete_date  AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as complete_date,
    start_user, complete_user, plant, nonconformances
    FROM z_verbale_lev_3 
    WHERE plant = $1 AND sfc = $2 and id_lev_1 = $3
    AND id_lev_2 = $4 AND id_lev_3 = $5 AND machine_type = $6`;

const getCommentsVerbale = `SELECT sfc, plant, id_lev_2, id_lev_3, machine_type, "user", comment, comment_type, status, approval_user, 
    TO_CHAR((datetime  AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as datetime,
    TO_CHAR((approval_datetime  AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as approval_datetime
    FROM z_comments
    WHERE plant = $1 AND sfc = $2 AND id_lev_1 = $3
    AND id_lev_2 = $4
    AND id_lev_3 = $5
    AND machine_type = $6 AND comment_type = $7
    ORDER BY datetime DESC`;

const getCommentsVerbaleForApproval = `SELECT sfc, plant, id_lev_2, id_lev_3, machine_type, "user", comment, comment_type, status, approval_user, 
    TO_CHAR((datetime  AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as datetime,
    TO_CHAR((approval_datetime  AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as approval_datetime
    FROM z_comments
    WHERE plant = $1 AND sfc = $2 
    AND id_lev_2 = $3
    AND id_lev_3 = $4
    AND machine_type = $5 AND comment_type = 'M'
    ORDER BY datetime DESC`;

const saveCommentsVerbale = `INSERT INTO z_comments (plant, sfc, wbe, id_lev_1, id_lev_2, id_lev_3, machine_type, "user", comment, datetime, comment_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, (current_timestamp AT TIME ZONE 'UTC'), $10, $11)`;

const getSfcFromCommentsSafetyApproval = `SELECT DISTINCT sfc FROM z_comments WHERE comment_type = 'M' AND plant = $1`;

const getSafetyApprovalComments = `SELECT sfc, plant, id_lev_2, machine_type, id_lev_3, "user", comment, status, id_lev_1, wbe,
    TO_CHAR((datetime AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as datetime
    FROM z_comments 
    WHERE plant = $1 AND comment_type = 'M'`;

const startTerzoLivello = `UPDATE z_verbale_lev_3
    SET status_lev_3 = 'In Work', start_date = (current_timestamp AT TIME ZONE 'UTC'), start_user = $7
    WHERE plant = $1 AND sfc = $2  and id_lev_1 = $3
    AND id_lev_2 = $4 AND id_lev_3 = $5 AND machine_type = $6`;

const startSecondoLivello = `UPDATE z_verbale_lev_2
    SET status_lev_2 = CASE WHEN status_lev_2 = 'New' THEN 'In Work' ELSE status_lev_2 END, 
    start_lev_2 = CASE WHEN status_lev_2 = 'New' THEN (current_timestamp AT TIME ZONE 'UTC') ELSE start_lev_2 END
    WHERE plant = $1 AND sfc = $2  and id_lev_1 = $3
    AND id_lev_2 = $4 AND machine_type = $5`;

const completeTerzoLivello = `UPDATE z_verbale_lev_3
    SET status_lev_3 = 'Done', complete_date = (current_timestamp AT TIME ZONE 'UTC'), complete_user = $7
    WHERE plant = $1 AND sfc = $2 and id_lev_1 = $3
    AND id_lev_2 = $4 AND id_lev_3 = $5 AND machine_type = $6`;

const completeSecondoLivello = `UPDATE z_verbale_lev_2
    SET status_lev_2 = CASE WHEN (SELECT COUNT(*) FROM z_verbale_lev_3 
                            WHERE plant = $1 AND sfc = $2 and id_lev_1 = $3
                            AND id_lev_2 = $4  AND machine_type = $5 AND status_lev_3 != 'Done') = 0 
                        THEN 'Done' ELSE status_lev_2 END, 
    complete_lev_2 = CASE WHEN (SELECT COUNT(*) FROM z_verbale_lev_3 
                            WHERE plant = $1 AND sfc = $2 and id_lev_1 = $3
                            AND id_lev_2 = $4 AND machine_type = $5 AND status_lev_3 != 'Done') = 0 
                        THEN (current_timestamp AT TIME ZONE 'UTC') ELSE complete_lev_2 END
        WHERE plant = $1 AND sfc = $2 
        AND id_lev_2 = $4 AND machine_type = $5`;

const updateNonConformanceLevel3 = `UPDATE z_verbale_lev_3
    SET nonconformances = true
    WHERE plant = $1 AND sfc = $2  and id_lev_1 = $3
    AND id_lev_2 = $4 AND id_lev_3 = $5 AND machine_type = $6`;

const insertZVerbaleLev2 = `INSERT INTO z_verbale_lev_2 ("order", id_lev_1, lev_2, id_lev_2, machine_type, safety, time_lev_2, uom, workcenter_lev_2, status_lev_2, plant, active, priority, wbe)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'New', $10, $11, $12, $13)`;
    
const insertZVerbaleLev3 = `INSERT INTO z_verbale_lev_3 ("order", id_lev_1, id_lev_2, id_lev_3, lev_3, machine_type, plant, status_lev_3, nonconformances)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'New', false)`;

const getChildsOrders = `SELECT child_order FROM z_orders_link WHERE plant = $1 AND parent_order = $2`;

const getGroupByPriorityDefects = `with PRIO as (
	SELECT DISTINCT z_priority.priority, z_priority.description, z_priority.weight,
	count(*) as quantity, 
	z_priority.weight * count(*) AS value FROM z_priority
    INNER JOIN z_defects ON z_defects.priority = z_priority.priority 
    WHERE z_defects.plant = $1 AND z_defects.dm_order = ANY($2)
    GROUP BY z_priority.priority, z_priority.description, z_priority.weight
    ORDER BY z_priority.priority)
    select zp.priority, zp.description, zp.weight,
    case when prio.quantity is null then 0 else prio.quantity end as quantity, 
    case when prio.value is null then 0 else prio.value end as value
    from z_priority zp
    left join PRIO prio ON zp.priority = prio.priority`;

const getVotoNCTranscode = `SELECT voto FROM z_report_nc_transcode WHERE $1 BETWEEN min_value AND max_value`;

const getVerbaleLev2ByOrder = `SELECT "order", id_lev_1, lev_2, id_lev_2, machine_type, workcenter_lev_2, safety, active 
    FROM z_verbale_lev_2 
    WHERE "order" = $1 AND plant = $2
    ORDER BY id_lev_1, id_lev_2`;

const getVerbaleLev3ByOrder = `SELECT "order", id_lev_2, id_lev_3, lev_3 
    FROM z_verbale_lev_3 
    WHERE "order" = $1 AND plant = $2
    ORDER BY id_lev_2, id_lev_3`;

const updateVerbaleLev2Fields = `UPDATE z_verbale_lev_2
SET
    workcenter_lev_2 = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE workcenter_lev_2 END,
    safety = CASE WHEN $4::boolean IS NOT NULL THEN $4 ELSE safety END,
    active = CASE WHEN $5::boolean IS NOT NULL THEN $5 ELSE active END
WHERE plant = $1 AND id_lev_2 = $2`;

const duplicateVerbaleLev2ByStepId = `INSERT INTO z_verbale_lev_2 ("order", id_lev_1, lev_2, id_lev_2, machine_type, safety, time_lev_2, uom, workcenter_lev_2, status_lev_2, plant, active, priority, wbe, sfc)
    SELECT "order", $3, lev_2, CONCAT(id_lev_2, $4::text), machine_type, $5, time_lev_2, uom, $6, status_lev_2, plant, $7, priority, wbe, sfc
    FROM z_verbale_lev_2 
    WHERE "order" = $1 AND plant = $2 AND id_lev_1 = $8`;

const duplicateVerbaleLev3ByLev2Ids = `INSERT INTO z_verbale_lev_3 ("order", id_lev_1, id_lev_2, id_lev_3, lev_3, machine_type, plant, status_lev_3, nonconformances, sfc)
    SELECT "order", $3, CONCAT(id_lev_2, $4::text), CONCAT(id_lev_3, $4::text), lev_3, machine_type, plant, status_lev_3, nonconformances, sfc
    FROM z_verbale_lev_3 
    WHERE "order" = $1 AND plant = $2 AND id_lev_2 = $5`;

const duplicateMarkingRecap = `INSERT INTO z_marking_recap (plant, project, wbe_machine, operation, mes_order, confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor, remaining_labor, uom_remaining_labor, variance_labor, uom_variance, operation_description, modify)
    SELECT plant, project, wbe_machine, $3, mes_order, confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor, remaining_labor, uom_remaining_labor, variance_labor, uom_variance, $4, modify
    FROM z_marking_recap
    WHERE plant = $1 AND mes_order = $2 AND operation = $5`;

const deleteVerbaleLev2ByStepId = `DELETE FROM z_verbale_lev_2 
    WHERE "order" = $1 AND plant = $2 AND id_lev_1 = $3`;

const deleteVerbaleLev3ByStepId = `DELETE FROM z_verbale_lev_3 
    WHERE "order" = $1 AND plant = $2 AND id_lev_1 = $3`;

const deleteMarkingRecapByOperation = `DELETE FROM z_marking_recap 
    WHERE plant = $1 AND mes_order = $2 AND operation = $3`;

const updateCommentApproval = `UPDATE z_comments
    SET status = 'Approved', approval_user = $4, approval_datetime = (current_timestamp AT TIME ZONE 'UTC')
    WHERE plant = $1 AND sfc = $2 AND id_lev_2 = $3`;

const updateCommentCancel = `UPDATE z_comments
    SET status = 'Not Approved', approval_user = $4, approval_datetime = (current_timestamp AT TIME ZONE 'UTC')
    WHERE plant = $1 AND sfc = $2 AND id_lev_2 = $3`;

const updateVerbaleLev2Unblock = `UPDATE z_verbale_lev_2
    SET blocked = false
    WHERE plant = $1 AND sfc = $2 AND id_lev_2 = $3 AND machine_type = $4`;

const getVerbaleLev2ForUnblocking = `SELECT id_lev_2, safety, blocked
    FROM z_verbale_lev_2
    WHERE plant = $1 AND sfc = $2 AND machine_type = $3
    ORDER BY id_lev_2 ASC`;

const getReportWeightSections = `SELECT DISTINCT * 
    FROM z_report_weight 
    WHERE report = $1 
    ORDER BY section`;

const getReportWeightByIdAndReport = `SELECT section, weight 
    FROM z_report_weight 
    WHERE report = $1 AND id = $2 
    ORDER BY section`;

const getReportWeightWithValuesQuery = `SELECT 
    zrw.id, 
    zrw.section, 
    zrw.weight, 
    COALESCE(zwv.value, '') as value
    FROM z_report_weight zrw
    LEFT JOIN z_weight_values zwv 
        ON zrw.id = zwv.id 
        AND zrw.section = zwv.section 
        AND zwv.plant = $1 
        AND zwv.project = $2 
        AND zwv."order" = $3 
        AND zwv.report = $4
    WHERE zrw.report = $4
    ORDER BY zrw.id, zrw.section`;

const getActivitiesTestingQuery = `SELECT * 
                                    FROM z_verbale_lev_2 
                                    WHERE plant = $1 AND sfc = ANY($2) AND status_lev_2 != 'Done' AND active = true
                                    ORDER BY id_lev_1, id_lev_2`;

const updateActivitiesOwnerAndDueDateQuery = `UPDATE z_verbale_lev_2 SET owner = $1, due_date = $2 WHERE id_lev_1 = $3 AND id_lev_2 = $4 AND "order" = $5`;

const upsertWeightValueQuery = `INSERT INTO z_weight_values (id, section, plant, project, "order", report, value)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id, section, plant, project, "order", report)
    DO UPDATE SET value = EXCLUDED.value`;


const updateZverbaleLev1TableWithSfcQuery = `UPDATE z_verbale_lev_1
    SET sfc = $3
    WHERE plant = $1 AND "order" = $2`;

const updateZverbaleLev2TableWithSfcQuery = `UPDATE z_verbale_lev_2
    SET sfc = $3
    WHERE plant = $1 AND "order" = $2`;

module.exports = { getVerbaleLev2NotDoneQuery, getVerbaleLev2ByLev1, getAllMachineType, getInfoTerzoLivello, getCommentsVerbale, getCommentsVerbaleForApproval, saveCommentsVerbale, startTerzoLivello, 
    startSecondoLivello, completeTerzoLivello, completeSecondoLivello, updateNonConformanceLevel3, insertZVerbaleLev2, insertZVerbaleLev3, getChildsOrders, getGroupByPriorityDefects, getVotoNCTranscode, getVerbaleLev2ByOrder, getVerbaleLev3ByOrder, updateVerbaleLev2Fields, duplicateVerbaleLev2ByStepId, duplicateVerbaleLev3ByLev2Ids, duplicateMarkingRecap, deleteVerbaleLev2ByStepId, deleteVerbaleLev3ByStepId, deleteMarkingRecapByOperation, getSfcFromCommentsSafetyApproval, getSafetyApprovalComments, updateCommentApproval, updateCommentCancel, updateVerbaleLev2Unblock, getVerbaleLev2ForUnblocking, getReportWeightSections, getReportWeightByIdAndReport, getActivitiesTestingQuery, updateActivitiesOwnerAndDueDateQuery, getReportWeightWithValuesQuery, upsertWeightValueQuery,
    updateZverbaleLev1TableWithSfcQuery, updateZverbaleLev2TableWithSfcQuery };