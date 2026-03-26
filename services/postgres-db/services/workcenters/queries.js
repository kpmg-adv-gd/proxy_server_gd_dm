const getInternalWorkcentersQuery = `SELECT * FROM z_internal_workcenter where plant = $1`;

module.exports = { getInternalWorkcentersQuery };