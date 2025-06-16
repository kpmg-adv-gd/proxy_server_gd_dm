const insertZDefect = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, notification_type, coding, 
                            replaced_in_assembly, defect_note, responsible, time, sfc, qn_annullata, qn_approvata, "user", operation)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, false, false, $18, $19)`; 

const insertZDefectNoQN = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, sfc, qn_annullata, qn_approvata, "user", operation)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13)`; 

const selectZDefect = `SELECT z_defects.*, z_coding.coding_description, z_coding.coding_group, z_priority.description as priority_description,
                    z_notification_type.description as notification_type_description, 
                    (select STRING_agg(description, ', ') from z_system_status where '-' || z_defects.system_status || '-' like '%-' || system_status || '-%') as system_status_description
                    FROM z_defects
                    left join z_coding on z_defects.coding = z_coding.coding
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    WHERE z_defects.id = ANY($1)
                    ORDER BY z_defects.creation_date DESC`;

const selectDefectToApprove = `SELECT z_defects.*, z_coding.coding_description, z_coding.coding_group, z_priority.description as priority_description, 
                    z_notification_type.description as notification_type_description, 
                    (select STRING_agg(description, ', ') from z_system_status where '-' || z_defects.system_status || '-' like '%-' || system_status || '-%') as system_status_description 
                    FROM z_defects
                    left join z_coding on z_defects.coding = z_coding.coding
                    left join z_priority on z_defects.priority = z_priority.priority
                    left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type
                    WHERE z_defects.create_qn = TRUE AND z_defects.qn_annullata != TRUE AND z_defects.qn_approvata != TRUE
                    ORDER BY z_defects.creation_date DESC`;

const cancelDefectQN = `UPDATE z_defects SET qn_annullata = TRUE, approval_user = $2 WHERE id = $1`;
const approveDefectQN = `UPDATE z_defects SET qn_approvata = TRUE, approval_user = $2 WHERE id = $1`;

module.exports = { insertZDefect, insertZDefectNoQN, selectZDefect, selectDefectToApprove, cancelDefectQN, approveDefectQN };