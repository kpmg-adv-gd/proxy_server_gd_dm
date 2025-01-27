const getReasonsForVarianceQuery = "SELECT * FROM z_tipologia_varianza";

const getMarkingDataQuery = "SELECT confirmation_number , planned_labor , marked_labor , remaining_labor FROM z_marcature";

module.exports = {getReasonsForVarianceQuery, getMarkingDataQuery};