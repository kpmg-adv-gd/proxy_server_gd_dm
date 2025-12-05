const getAdditionalOperationsQuery = `SELECT * FROM z_additional_operations where plant = $1 and project = $2`;

const getAdditionalOperationsToVerbaleQuery = `SELECT * FROM z_additional_operations where plant = $1 and project = $2 and section = $3`;

const getInfoAdditionalOperation =`SELECT * FROM z_additional_operations where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const startAdditionalOperation =`UPDATE z_additional_operations set status = 'In Work' where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const completeAdditionalOperation =`UPDATE z_additional_operations set status = 'Done' where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const updateNonConformanceAdditionalOperation =`UPDATE z_additional_operations set nonconformances = true where plant = $1 and sfc = $2 and operation = $3`;

module.exports = { getAdditionalOperationsQuery, getInfoAdditionalOperation, startAdditionalOperation, completeAdditionalOperation, updateNonConformanceAdditionalOperation, getAdditionalOperationsToVerbaleQuery };