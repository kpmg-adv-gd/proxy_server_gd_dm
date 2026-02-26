const getZOrdersLinkByProjectParentOrderChildOrderFlagQuery = `SELECT *
                                FROM z_orders_link
                                WHERE project = $1 AND parent_order = $2 AND child_material = ANY($3)  AND parent_assembly_flag = $4`;

const getZOrdersLinkByPlantProjectParentOrderChildMaterialQuery = `SELECT *
                                    FROM z_orders_link
                                    WHERE plant = $1 AND project = $2 AND parent_order = $3 AND child_material = $4`;

const getZOrdersLinkByPlantProjectChildOrderChildMaterialQuery = `SELECT *
                                FROM z_orders_link
                                WHERE plant = $1 AND project = $2 AND child_order = $3 AND child_material = $4`;

const getZOrderLinkChildOrdersMultipleMaterialQuery = `SELECT *
                                FROM z_orders_link
                                WHERE plant = $1 AND parent_order = $2 AND child_material = $3 AND child_order != $4`;

const getMaterialsTIQuery = `SELECT DISTINCT child_material as material FROM z_orders_link
                            WHERE plant = $1 AND project = $2 AND child_order_type IN ('GRPF', 'ZMGF', 'ZPA1', 'ZPA2', 'ZPF1', 'ZPF2')`;

const getMaterialsTIFakeQuery = `SELECT DISTINCT material FROM z_dummy_material WHERE plant = $1`;

const getOrderByMaterialQuery = `SELECT DISTINCT child_order FROM z_orders_link
                                WHERE plant = $1 AND child_material = $2 and project = $3`;

module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, getZOrdersLinkByPlantProjectParentOrderChildMaterialQuery, getZOrdersLinkByPlantProjectChildOrderChildMaterialQuery, getZOrderLinkChildOrdersMultipleMaterialQuery, getMaterialsTIQuery, getMaterialsTIFakeQuery, getOrderByMaterialQuery };