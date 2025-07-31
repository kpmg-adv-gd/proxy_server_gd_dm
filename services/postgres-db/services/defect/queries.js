const insertZDefect = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, notification_type, coding_id, 
                            replaced_in_assembly, defect_note, responsible, sfc, qn_annullata, qn_approvata, "user", operation, status, plant, wbe, type_order, "group", code, dm_order, sap_code)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false, false, $17, $18, 'OPEN', $19, $20, $21, $22, $23, $24, $25)`; 

const insertZDefectNoQN = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, sfc, qn_annullata, qn_approvata, "user", operation, status, plant, wbe, type_order, "group", code, dm_order, sap_code)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13, 'OPEN', $14, $15, $16, $17, $18, $19, $20)`; 

const updateZDefect = `UPDATE z_defects SET title = $2, description = $3, priority = $4, create_qn = $5, variance = $6, blocking = $7, notification_type = $8,
                        coding_id = $9, replaced_in_assembly = $10, defect_note = $11, responsible = $12
                        WHERE id = $1`;

const selectZDefect = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description,
                    z_notification_type.description as notification_type_description, z_responsible.description as responsible_description, z_variance_type.description as variance_description
                    FROM z_defects
                    left join z_coding on z_defects.coding_id = z_coding.id
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    left join z_responsible on z_defects.responsible = z_responsible.id
                    left join z_variance_type on z_defects.variance = z_variance_type.cause
                    WHERE z_defects.id = ANY($1) and z_defects.plant = $2
                    ORDER BY z_defects.creation_date DESC`;

const selectDefectToApprove = `SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, z_responsible.description as responsible_description
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

module.exports = { insertZDefect, updateZDefect, insertZDefectNoQN, selectZDefect, selectDefectToApprove, cancelDefectQN, sendApproveDefectQN, closeDefect, checkAllDefectClose, receiveStatusDefectQN, assignQNCode, receiveStatusByQNCode, receiveQNCode, updateStatusCloseDefect, getDefectsWBE };
