const insertZDefect = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, notification_type, coding, 
                            replaced_in_assembly, defect_note, responsible, sfc, qn_annullata, qn_approvata, "user", operation, status, plant, wbe, type_order, "group", code, dm_order)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false, false, $17, $18, 'OPEN', $19, $20, $21, $22, $23, $24)`; 

const insertZDefectNoQN = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, sfc, qn_annullata, qn_approvata, "user", operation, status, plant, wbe, type_order, "group", code, dm_order)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13, 'OPEN', $14, $15, $16, $17, $18, $19)`; 

const updateZDefect = `UPDATE z_defects SET title = $2, description = $3, priority = $4, create_qn = $5, variance = $6, blocking = $7, notification_type = $8,
                        coding = $9, replaced_in_assembly = $10, defect_note = $11, responsible = $12
                        WHERE id = $1`;

const selectZDefect = `SELECT z_defects.*, z_coding.coding_description, z_coding.coding_group, z_priority.description as priority_description,
                    z_notification_type.description as notification_type_description, 
                    (select STRING_agg(system_status || ' - ' || description, ',') from z_system_status where '-' || z_defects.system_status || '-' like '%-' || system_status || '-%') as system_status_description
                    FROM z_defects
                    left join z_coding on z_defects.coding = z_coding.coding
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    WHERE z_defects.id = ANY($1)
                    ORDER BY z_defects.creation_date DESC`;

const selectDefectToApprove = `SELECT z_defects.*, z_coding.coding_description, z_coding.coding_group, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    (select STRING_agg(system_status || ' - ' || description, ',') from z_system_status where '-' || z_defects.system_status || '-' like '%-' || system_status || '-%') as system_status_description 
                    FROM z_defects
                    left join z_coding on z_defects.coding = z_coding.coding
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    WHERE z_defects.create_qn = TRUE AND z_defects.qn_annullata != TRUE AND z_defects.qn_approvata != TRUE
                    ORDER BY z_defects.creation_date DESC`;

const cancelDefectQN = `UPDATE z_defects SET qn_annullata = TRUE, approval_user = $2 WHERE id = $1`;

const sendApproveDefectQN = `UPDATE z_defects SET approval_user = $2 WHERE id = $1`;
const assignQNCode = `UPDATE z_defects SET qn_code = $2 WHERE id = $1`;

const receiveStatusDefectQN = `UPDATE z_defects SET qn_link = $3, system_status = $4, user_status = $5 WHERE plant = $1 AND qn_code = $2`;
const receiveStatusByQNCode = `UPDATE z_defects SET qn_link = $3, system_status = $4, user_status = $5 WHERE plant = $1 and qn_code = $2`;
const receiveQNCode = `UPDATE z_defects SET qn_code = $2, qn_link = $3, system_status = $4, user_status = $5, qn_approvata = true WHERE id = $1`;

const closeDefect = `UPDATE z_defects SET status = 'CLOSED' WHERE id = $1`;
const checkAllDefectClose = `SELECT * FROM z_defects WHERE status = 'OPEN' AND sfc = $1`;

module.exports = { insertZDefect, updateZDefect, insertZDefectNoQN, selectZDefect, selectDefectToApprove, cancelDefectQN, sendApproveDefectQN, closeDefect, checkAllDefectClose, receiveStatusDefectQN, assignQNCode, receiveStatusByQNCode, receiveQNCode };
