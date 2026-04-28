const getReasonsForVarianceQuery = `SELECT * FROM z_variance_type WHERE plant = $1`;

module.exports = { getReasonsForVarianceQuery };