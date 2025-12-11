const getAdditionalOperationsQuery = `SELECT * FROM z_additional_operations where plant = $1 and project = $2`;

const getAdditionalOperationsToVerbaleQuery = `SELECT * FROM z_additional_operations where plant = $1 and project = $2 and section = $3`;

const getInfoAdditionalOperation =`SELECT * FROM z_additional_operations where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const startAdditionalOperation =`UPDATE z_additional_operations set status = 'In Work' where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const completeAdditionalOperation =`UPDATE z_additional_operations set status = 'Done' where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const updateNonConformanceAdditionalOperation =`UPDATE z_additional_operations set nonconformances = true where plant = $1 and sfc = $2 and operation = $3`;

const insertZAddtionalOperationsQuery = `INSERT INTO public.z_additional_operations
(plant, project, "section", sfc, "order", material, group_code, group_description, operation, operation_description, phase, status, step_id, confirmation_number, mes_order, nonconformances)
VALUES(
$1, -- plant
$2, -- project
$3, -- section
$4, -- sfc
$5, -- order
$6, -- material
$7, -- group_code
$8, -- group_description
$9, -- operation
$10, -- operation_description
$11, -- phase
$12, -- status
$13,-- step_id
$14, -- confirmation_number
$15, -- mes_order
$16 -- nonconformances
);
`;

module.exports = { getAdditionalOperationsQuery, getInfoAdditionalOperation, startAdditionalOperation, completeAdditionalOperation, updateNonConformanceAdditionalOperation, getAdditionalOperationsToVerbaleQuery, insertZAddtionalOperationsQuery };