const insertZElectricalBoxQuery = `INSERT INTO z_electrical_box (plant,project,wbs_element,machine_section,machine_order,order_material,eb_material,quantity,uom,status,last_update)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;   
                               
const getZElectricalBoxDataQuery = `SELECT *
                                FROM z_electrical_box
                                WHERE plant = $1 AND project = $2 AND wbs_element = $3 AND machine_order = $4`;

const updateZElectricalBoxDataQuery = `UPDATE z_electrical_box
                                        SET status = $1
                                        WHERE plant = $2 AND wbs_element = $3 AND machine_order = $4`;

module.exports = { insertZElectricalBoxQuery, getZElectricalBoxDataQuery, updateZElectricalBoxDataQuery };