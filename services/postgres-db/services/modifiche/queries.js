
const insertZModificheQuery = `INSERT INTO z_modify (prog_eco, process_id, plant, wbe, "type", sfc, "order", material,child_order, child_material, qty, flux_type, status, send_to_sap,timestamp_sent,last_update) 
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16); `;

const getModificheDataQuery = `SELECT *
                                FROM z_modify
                                WHERE plant = $1 AND sfc = $2 AND "order" = $3
                                ORDER BY prog_eco ASC;`;

const updateStatusModificaQuery = `UPDATE z_modify
                                    SET status = $3,
                                    last_update = $4
                                    WHERE plant=$1 AND prog_eco=$2`;

const updateResolutionModificaMAQuery = `UPDATE z_modify
                                            SET resolution = $3,
                                            last_update = $4
                                            WHERE plant=$1 AND process_id=$2`;

const getOperationModificheBySfcQuery = `SELECT plant, project, wbe_machine, operation, mes_order, confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor, remaining_labor, uom_remaining_labor, variance_labor, uom_variance, operation_description AS description, modify
                                        FROM z_marking_recap
                                        WHERE plant=$1 AND project=$2 AND mes_order=$3 AND modify=true`;

const getModificheToDoQuery = `SELECT zm.status
                                FROM z_modify zm
                                WHERE zm.status='0' AND zm.plant=$1 AND zm.sfc=$2 AND zm."order"=$3`;

const updateZModifyByOrderQuery = `UPDATE z_modify
                                    SET sfc = $2,
                                    "order" = $3,
                                    last_update = $6
                                    WHERE plant = $1 AND sfc=$4 AND "order"=$5`;

module.exports = { insertZModificheQuery, getModificheDataQuery, updateStatusModificaQuery, updateResolutionModificaMAQuery, getOperationModificheBySfcQuery, getModificheToDoQuery, updateZModifyByOrderQuery };