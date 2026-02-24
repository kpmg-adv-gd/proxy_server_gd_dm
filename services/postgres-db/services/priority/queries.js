const getZPriorityDataQuery = `SELECT * FROM z_priority WHERE plant = $1 ORDER BY priority`;

module.exports = { getZPriorityDataQuery };