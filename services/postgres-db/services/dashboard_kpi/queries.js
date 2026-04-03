const getActualDate = `SELECT MIN(start_date) AS actual_date FROM z_pod_sfc_act_log WHERE plant = $1 AND wbe = $2 AND mach_section = $3`;

module.exports = { getActualDate };