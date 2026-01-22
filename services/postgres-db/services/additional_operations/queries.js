const getAdditionalOperationsQuery = `SELECT z.*,
(select case when count(*) > 0 then true else false end from z_defects where operation = z.operation and dm_order = z.order and sfc = z.sfc and status = 'OPEN') as nonconformances
FROM z_additional_operations z where plant = $1 and project = $2 order by "order", operation, phase`;

const getAdditionalOperationsToVerbaleQuery = `SELECT z.* FROM z_additional_operations z where plant = $1 and project = $2 and section = $3`;

const checkDefectCompleteOperation = `SELECT * FROM z_additional_operations where plant = $1 and "order" = $2 and status != 'Done' AND operation != $3`;

const getInfoAdditionalOperation =`SELECT * FROM z_additional_operations where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const startAdditionalOperation =`UPDATE z_additional_operations set status = 'In Work' where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const completeAdditionalOperation =`UPDATE z_additional_operations set status = 'Done' where plant = $1 and sfc = $2 and operation = $3 and phase = $4`;

const insertZAddtionalOperationsQuery = `INSERT INTO public.z_additional_operations
(plant, project, "section", sfc, "order", material, group_code, group_description, operation, operation_description, phase, status, step_id, mes_order, workcenter)
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
$14, -- mes_order
$15 -- work_center
);
`;

module.exports = { getAdditionalOperationsQuery, getInfoAdditionalOperation, startAdditionalOperation, completeAdditionalOperation, checkDefectCompleteOperation, getAdditionalOperationsToVerbaleQuery, insertZAddtionalOperationsQuery };