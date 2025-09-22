const getZResponsibleDataQuery = `SELECT * FROM z_responsible where plant = $1`;

module.exports = { getZResponsibleDataQuery };