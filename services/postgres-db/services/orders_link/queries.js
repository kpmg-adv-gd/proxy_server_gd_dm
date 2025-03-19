const insertZOrdersLinkQuery = `INSERT INTO z_orders_link(plant,project,parent_order,parent_material,child_order,child_material,parent_assembly_flag)
                                VALUES ($1, $2, $3, $4, $5, $6, $7)`;

module.exports = { insertZOrdersLinkQuery };