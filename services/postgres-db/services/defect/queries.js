const insertZDefect = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, notification_type, coding_id, 
                            replaced_in_assembly, defect_note, responsible, sfc, qn_annullata, qn_approvata, "user", operation, status, plant, wbe, type_order, "group", code, dm_order, sap_code, cause, project, phase)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false, false, $17, $18, 'OPEN', $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`; 

const insertZDefectNoQN = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, sfc, qn_annullata, qn_approvata, "user", operation, status, plant, wbe, type_order, "group", code, dm_order, sap_code, cause, project, phase)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13, 'OPEN', $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`; 
const updateZDefect = `UPDATE z_defects SET title = $2, description = $3, priority = $4, create_qn = $5, variance = $6, blocking = $7, notification_type = $8,
                        coding_id = $9, replaced_in_assembly = $10, defect_note = $11, responsible = $12
                        WHERE id = $1`;

const selectZDefect = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description,
                    z_notification_type.description as notification_type_description, 
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description,
                    z_variance_type.description as variance_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    WHERE z_defects.id = ANY($1) and z_defects.plant = $2
                    ORDER BY z_defects.creation_date DESC`;

const selectZDefectByWBE = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description,
                    z_notification_type.description as notification_type_description, 
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description,
                    z_variance_type.description as variance_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    WHERE z_defects.wbe = $2 and z_defects.plant = $1
                    ORDER BY z_defects.creation_date DESC`;

const selectDefectToApprove = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    WHERE z_defects.create_qn = TRUE AND z_defects.qn_annullata != TRUE AND z_defects.qn_approvata != TRUE
                    AND z_defects.plant = $1
                    ORDER BY z_defects.creation_date DESC`;

const cancelDefectQN = `UPDATE z_defects SET qn_annullata = TRUE, approval_user = $2, notification_type = null, coding_id = null, replaced_in_assembly = null, responsible = null, defect_note = null, create_qn = false WHERE id = $1`;

const sendApproveDefectQN = `UPDATE z_defects SET approval_user = $2 WHERE id = $1`;
const assignQNCode = `UPDATE z_defects SET qn_code = $2 WHERE id = $1`;

const receiveStatusDefectQN = `UPDATE z_defects SET qn_link = $3, system_status = $4, user_status = $5 WHERE plant = $1 AND qn_code = $2`;
const receiveStatusByQNCode = `UPDATE z_defects SET qn_link = $3, system_status = $4, user_status = $5 WHERE plant = $1 and qn_code = $2`;
const receiveQNCode = `UPDATE z_defects SET qn_code = $2, qn_link = $3, system_status = $4, user_status = $5, qn_approvata = true WHERE id = $1`;

const closeDefect = `UPDATE z_defects SET status = 'CLOSED' WHERE id = $1`;
const updateStatusCloseDefect = `UPDATE z_defects SET system_status = $2 WHERE id = $1`;

const checkAllDefectClose = `SELECT * FROM z_defects WHERE status = 'OPEN' AND sfc = $1`;

const getDefectsWBE = `SELECT DISTINCT z_defects.wbe from z_defects WHERE z_defects.wbe IS NOT NULL AND z_defects.wbe != '' AND z_defects.plant = $1 ORDER BY z_defects.wbe`;

const getDefectsTI = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    zvl2.id_lev_1, zvl2.lev_2, zvl3.lev_3, zvl3.id_lev_3,
                    z_variance_type.description as variance_description,
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    left join z_defect_testing zdt on zdt.defect_id = z_defects.id
                    left join z_verbale_lev_2 zvl2 on zvl2.id_lev_1 = zdt.id_lev_1 and zvl2.id_lev_2 = zdt.id_lev_2 and zvl2.sfc = z_defects.sfc
                    left join z_verbale_lev_3 zvl3 on zvl3.id_lev_2 = zvl2.id_lev_2 and zvl3.sfc = z_defects.sfc and zdt.id_lev_3 = zvl3.id_lev_3
                    WHERE z_defects.plant = $1 AND z_defects.project = $2 AND mes_order is not null
                    AND ( z_defects.phase = 'Testing' OR z_defects.sent_to_testing = true )
                    ORDER BY z_defects.creation_date DESC`;

const getDefectsTIOpen = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    zvl2.id_lev_1, zvl2.lev_2, zvl3.lev_3,  
                    z_variance_type.description as variance_description,
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    left join z_defect_testing zdt on zdt.defect_id = z_defects.id
                    left join z_verbale_lev_2 zvl2 on zvl2.id_lev_1 = zdt.id_lev_1 and zvl2.id_lev_2 = zdt.id_lev_2 and zvl2.sfc = z_defects.sfc
                    left join z_verbale_lev_3 zvl3 on zvl3.id_lev_2 = zvl2.id_lev_2 and zvl3.sfc = z_defects.sfc and zdt.id_lev_3 = zvl3.id_lev_3
                    WHERE z_defects.plant = $1 AND z_defects.project = $2 AND mes_order is not null AND z_defects.status = 'OPEN'
                    AND ( z_defects.phase = 'Testing' OR z_defects.sent_to_testing = true )
                    ORDER BY z_defects.creation_date DESC`;
                    

const getDefectsToVerbale = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    zvl2.id_lev_1, zvl2.lev_2, zvl3.lev_3,  
                    z_variance_type.description as variance_description,
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    left join z_defect_testing zdt on zdt.defect_id = z_defects.id
                    left join z_verbale_lev_2 zvl2 on zvl2.id_lev_1 = zdt.id_lev_1 and zvl2.id_lev_2 = zdt.id_lev_2 and zvl2.sfc = z_defects.sfc
                    left join z_verbale_lev_3 zvl3 on zvl3.id_lev_2 = zvl2.id_lev_2 and zvl3.sfc = z_defects.sfc and zdt.id_lev_3 = zvl3.id_lev_3
                    WHERE z_defects.plant = $1 AND z_defects.dm_order = ANY($2) and z_defects.status = 'OPEN'
                    ORDER BY z_defects.creation_date DESC`;

const getDefectsFromAdditionalOperationsTI = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    zvl2.id_lev_1, zvl2.lev_2, zvl3.lev_3,  
                    z_variance_type.description as variance_description,
                    COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    left join z_defect_testing zdt on zdt.defect_id = z_defects.id
                    left join z_verbale_lev_2 zvl2 on zvl2.id_lev_1 = zdt.id_lev_1 and zvl2.id_lev_2 = zdt.id_lev_2 and zvl2.sfc = z_defects.sfc
                    left join z_verbale_lev_3 zvl3 on zvl3.id_lev_2 = zvl2.id_lev_2 and zvl3.sfc = z_defects.sfc and zdt.id_lev_3 = zvl3.id_lev_3
                    WHERE z_defects.plant = $1 AND z_defects.project = $2 AND z_defects.sfc = $4 AND z_defects.operation = $3
                    AND ( z_defects.phase = 'Testing' OR z_defects.sent_to_testing = true )
                    ORDER BY z_defects.creation_date DESC`;

const getPhaseDefects = `SELECT DISTINCT phase FROM z_defects WHERE phase is not null ORDER BY phase`;
const getStatusDefects = `SELECT DISTINCT status FROM z_defects WHERE status is not null ORDER BY status`;

const insertZDefectTesting = `INSERT INTO z_defect_testing (defect_id, plant, sfc, id_lev_1, id_lev_2, id_lev_3) VALUES ($1, $2, $3, $4, $5, $6)`;

const updateDefectsToTesting = `UPDATE z_defects SET sent_to_testing = TRUE WHERE plant = $1 AND dm_order = ANY($2) AND status = 'OPEN'`;

const getDefectsTestingQuery = `SELECT * FROM z_defects WHERE mes_order = ANY($1) AND status = 'OPEN' ORDER BY "group", code`;

const updateDefectsOwnerAndDueDateQuery = `UPDATE z_defects SET owner = $1, due_date = $2 WHERE id = $3`;

const checkNonconformanceField = `select zdt2.* from z_defect_testing zdt 
                        inner join z_defect_testing zdt2 on zdt.id_lev_1 = zdt2.id_lev_1 and zdt.id_lev_2 = zdt2.id_lev_2 
                            and zdt.id_lev_3 = zdt2.id_lev_3 and zdt.sfc = zdt2.sfc 
                        inner join z_defects zd on zd.id = zdt2.defect_id and zd.status = 'OPEN'
                        where zdt.defect_id = $1 and zdt.plant = $2`;

const setNonconformanceField = `update z_verbale_lev_3 set nonconformances = false 
            where id_lev_1 = $1 and id_lev_2 = $2 and id_lev_3 = $3 and sfc = $4 and plant = $5`;

const getDatiDifetto = `SELECT id_lev_1, id_lev_2, id_lev_3, sfc FROM z_defect_testing WHERE defect_id = $1 and plant = $2`;

module.exports = { insertZDefect, updateZDefect, insertZDefectNoQN, selectZDefect, selectDefectToApprove, cancelDefectQN, getDefectsToVerbale, sendApproveDefectQN, closeDefect, checkAllDefectClose, receiveStatusDefectQN, assignQNCode, receiveStatusByQNCode, receiveQNCode, updateStatusCloseDefect, getDefectsWBE, getDefectsTI, getDefectsFromAdditionalOperationsTI, getPhaseDefects, getStatusDefects, insertZDefectTesting, updateDefectsToTesting, getDefectsTestingQuery, updateDefectsOwnerAndDueDateQuery, getDefectsTIOpen, checkNonconformanceField, setNonconformanceField, getDatiDifetto };