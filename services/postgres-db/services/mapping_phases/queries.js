const getMappingPhaseQuery = `SELECT * FROM z_mapping_phase where plant = $1 and operation_macrophase = $2`;

module.exports = { getMappingPhaseQuery };