const insertZOrdersLinkQuery = `INSERT INTO z_orders_link(plant,project,parent_order,parent_material,child_order,child_material,parent_assembly_flag,child_order_type,machine_section)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

const getZOrdersLinkMachByPlantProjectOrderTypeMachineSectionQuery = `SELECT *
                                                                FROM z_orders_link
                                                                WHERE plant = $1 AND project = $2 AND child_order_type = $3 AND child_material = $4 AND (parent_order IS NULL OR parent_order = '')`;

const getZOrdersLinkByPlantProjectAndParentOrderQuery = `SELECT *
                                                    FROM z_orders_link
                                                    WHERE plant = $1 AND project = $2 AND parent_order = $3`;

const getAllMachMaterialsQuery = `SELECT DISTINCT child_material
                            FROM z_orders_link
                            WHERE plant = $1 AND child_order_type=$2 AND (parent_order IS NULL OR parent_order='') `;                  

module.exports = { insertZOrdersLinkQuery, getZOrdersLinkMachByPlantProjectOrderTypeMachineSectionQuery, getZOrdersLinkByPlantProjectAndParentOrderQuery, getAllMachMaterialsQuery};