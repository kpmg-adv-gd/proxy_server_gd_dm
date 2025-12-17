const getVerbaleLev2NotDoneQuery = `SELECT DISTINCT "order", plant, sfc, workcenter_lev_2 FROM z_verbale_lev_2 WHERE plant = $1 AND workcenter_lev_2 = $2 AND status_lev_2 != 'Done' and sfc is not null`;

const getVerbaleLev2ByLev1 = `SELECT l2.sfc, l2.id_lev_2, l2.lev_2, l2.machine_type as machine_type_2, l2.safety, 
    l2.status_lev_2 as status, l2.time_lev_2, l2.workcenter_lev_2, l2.wbe, 
    l3.id_lev_3, l3.lev_3, l3.status_lev_3, l3.machine_type as machine_type_3, l3.status_lev_3, l3.nonconformances
    FROM z_verbale_lev_2 l2 
    INNER JOIN z_verbale_lev_3 l3 ON l2.id_lev_2 = l3.id_lev_2 AND l2.sfc = l3.sfc
    WHERE l2.plant = $1 AND l2."order" = $2 AND l2.sfc = $3
    AND l2.id_lev_1 = $4 AND l3.id_lev_1 = $4 AND l2.active = true 
    ORDER BY l3.id_lev_2, l3.id_lev_3`;

const getAllMachineType = `SELECT DISTINCT wbe, machine_type FROM z_verbale_lev_2 WHERE plant = $1 and id_lev_1 = $2 ORDER BY wbe, machine_type`;

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
    WHERE plant = $1 AND sfc = $2 
    AND id_lev_2 = $3
    AND id_lev_3 = $4
    AND machine_type = $5 AND comment_type = 'C'
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

const saveCommentsVerbale = `INSERT INTO z_comments (plant, sfc, id_lev_2, id_lev_3, machine_type, "user", comment, datetime, comment_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, (current_timestamp AT TIME ZONE 'UTC'), $8, 'Waiting')`;

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


module.exports = { getVerbaleLev2NotDoneQuery, getVerbaleLev2ByLev1, getAllMachineType, getInfoTerzoLivello, getCommentsVerbale, getCommentsVerbaleForApproval, saveCommentsVerbale, startTerzoLivello, 
    startSecondoLivello, completeTerzoLivello, completeSecondoLivello, updateNonConformanceLevel3, insertZVerbaleLev2, insertZVerbaleLev3, getChildsOrders, getGroupByPriorityDefects, getVotoNCTranscode };