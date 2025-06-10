const insertZDefect = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, notification_type, coding, 
                            replaced_in_assembly, defect_note, responsible, time, sfc, creation_date)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)`; 

const insertZDefectNoQN = `INSERT INTO z_defects (id, material, mes_order, assembly, title, description, priority, variance, blocking, create_qn, sfc, creation_date)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`; 

const selectZDefect = `SELECT * FROM z_defects WHERE id = ANY($1)`;

const selectDefectToApprove = `SELECT * FROM z_defects WHERE create_qn = TRUE AND qn_annullata != TRUE AND qn_approvata != TRUE`;

const cancelDefectQN = `UPDATE z_defects SET qn_annullata = TRUE, approval_user = $2 WHERE id = $1`;
const approveDefectQN = `UPDATE z_defects SET qn_approvata = TRUE, approval_user = $2 WHERE id = $1`;

module.exports = { insertZDefect, insertZDefectNoQN, selectZDefect, selectDefectToApprove, cancelDefectQN, approveDefectQN };