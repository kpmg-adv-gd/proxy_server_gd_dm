const getZCodingDataQuery = `SELECT * FROM z_coding where plant = $1`;

module.exports = { getZCodingDataQuery };