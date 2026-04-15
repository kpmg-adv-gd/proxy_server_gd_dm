const logStartOperationQuery = `INSERT INTO z_pod_sfc_act_log (plant, sfc, operation_activity, start_user, start_date, "order", routing, routing_version, material, parent_material, routing_step, workcenter, project, wbe, mach_section) 
VALUES ($1, $2, $3, $4, (current_timestamp AT TIME ZONE 'UTC'), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;


const logCompleteOperationQuery = `UPDATE z_pod_sfc_act_log SET complete_user = $4, complete_date = (current_timestamp AT TIME ZONE 'UTC') WHERE plant = $1 AND sfc = $2 AND operation_activity = $3`;

const getOperationDatesQuery = `SELECT operation_activity,
    TO_CHAR((start_date::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as start_date,
    TO_CHAR((complete_date::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS') as complete_date,
    start_user, complete_user
    FROM z_pod_sfc_act_log
    WHERE plant = $1 AND "order" = $2`;

module.exports = { logStartOperationQuery, logCompleteOperationQuery, getOperationDatesQuery };