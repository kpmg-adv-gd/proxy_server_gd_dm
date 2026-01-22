
const insertZModificheQuery = `INSERT INTO z_modify (prog_eco, process_id, plant, wbe, "type", sfc, "order", material,child_order, child_material, qty, flux_type, status, send_to_sap,timestamp_sent,last_update,co2, wbe_machine, machine_section, project, phase) 
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, $21); `;

const getModificheDataQuery = `SELECT *
                                FROM z_modify
                                WHERE plant = $1 AND sfc = $2
                                ORDER BY prog_eco ASC;`;

const getModificheDataGroupMAQuery = `SELECT *
                                FROM z_modify
                                WHERE plant = $1 AND child_order = $2
                                ORDER BY prog_eco ASC;`;

const updateStatusModificaQuery = `UPDATE z_modify
                                    SET status = $3,
                                    note = $4,
                                    last_update = $5
                                    WHERE plant=$1 AND prog_eco=$2`;

const updateZModifyCO2ByOrderQuery = `insert into z_modify (
                                        prog_eco,
                                        process_id ,
                                        plant,
                                        wbe,
                                        "type",
                                        sfc,
                                        "order",
                                        material,
                                        child_order,
                                        child_material,
                                        qty,
                                        flux_type,
                                        status,
                                        send_to_sap,
                                        timestamp_sent,
                                        last_update,
                                        resolution,
                                        note,
                                        co2,
                                        wbe_machine,
                                        machine_section,
                                        project, phase, sent_to_testing, sent_to_installation
                                    )
                                    select
                                        prog_eco
                                        process_id ,
                                        plant,
                                        wbe,
                                        "type",
                                        $2,
                                        "order",
                                        material,
                                        child_order,
                                        child_material,
                                        qty,
                                        flux_type,
                                        status,
                                        send_to_sap,
                                        timestamp_sent,
                                        $4,
                                        resolution,
                                        note,
                                        co2,
                                        wbe_machine,
                                        machine_section,
                                        project, phase, sent_to_testing, sent_to_installation
                                    from z_modify
                                    where plant = $1 and sfc=$3 and co2=true `;

const updateStatusModificaMAQuery = `UPDATE z_modify
                                            SET status = $5, 
                                            resolution = $6,
                                            note = $7,
                                            last_update = $8
                                            WHERE plant=$1 AND wbe=$2 AND process_id=$3 AND child_material=$4 `;

const getAllModificaMAQuery = `SELECT *
                                        FROM z_modify
                                        WHERE plant=$1 AND wbe=$2 AND process_id=$3;`
                                        
const getOperationModificheBySfcQuery = `SELECT plant, project, wbe_machine, operation, mes_order, confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor, remaining_labor, uom_remaining_labor, variance_labor, uom_variance, operation_description AS description, modify
                                        FROM z_marking_recap
                                        WHERE plant=$1 AND project=$2 AND mes_order=$3 AND modify=true`;

const getModificheToDoQuery = `SELECT zm.status
                                FROM z_modify zm
                                WHERE zm.status='0' AND zm.plant=$1 AND zm.sfc=$2`;

const updateZModifyByOrderQuery = `UPDATE z_modify
                                    SET sfc = $2,
                                    last_update = $4
                                    WHERE plant = $1 AND sfc=$3 `;

const getModificheToTestingQuery = `SELECT * FROM z_modify zm WHERE plant = $1 AND project = $2 AND ( (sent_to_testing = true AND sent_to_installation = false) OR (phase = 'Testing' AND sent_to_installation = false) ) ORDER BY prog_eco ASC;`;                             

const getModificheToVerbaleTestingQuery = `SELECT * FROM z_modify zm WHERE plant = $1 AND wbe_machine = $2 AND machine_section = $3 AND project = $4 and status != '1' ORDER BY prog_eco ASC;`;

const getModificheToDataCollections = `SELECT * FROM z_modify zm WHERE plant = $1 AND project = $2 AND wbe_machine = $3 AND machine_section = $4 AND status != '1' AND "type" = $5`;

const updateModificheToTestingQuery = `UPDATE z_modify
                                        SET sent_to_testing = true
                                        WHERE plant = $1 AND wbe_machine = $2 AND machine_section = $3 AND project = $4 and status != '1'`;

const getModificheTestingByOrdersQuery = `SELECT * FROM z_modify WHERE plant = $1 AND project = $2 AND status != '1' ORDER BY prog_eco, process_id`;

module.exports = { insertZModificheQuery, getModificheDataQuery, getModificheDataGroupMAQuery, getAllModificaMAQuery, updateStatusModificaQuery, updateZModifyCO2ByOrderQuery, updateStatusModificaMAQuery, getOperationModificheBySfcQuery, getModificheToDoQuery, updateZModifyByOrderQuery, getModificheToTestingQuery, getModificheToVerbaleTestingQuery, getModificheToDataCollections, updateModificheToTestingQuery, getModificheTestingByOrdersQuery };