const logStartOperationQuery = `INSERT INTO z_pod_sfc_act_log (plant, sfc, operation_activity, start_user, start_date, "order", routing, routing_version, material, parent_material, routing_step, workcenter, project, wbe, mach_section) 
VALUES ($1, $2, $3, $4, (current_timestamp AT TIME ZONE 'UTC'), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;


const logCompleteOperationQuery = `UPDATE z_pod_sfc_act_log SET complete_user = $4, complete_date = (current_timestamp AT TIME ZONE 'UTC') WHERE plant = $1 AND sfc = $2 AND operation_activity = $3`;

module.exports = { logStartOperationQuery, logCompleteOperationQuery };