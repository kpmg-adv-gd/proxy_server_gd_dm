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


module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, getZOrdersLinkByPlantProjectParentOrderChildMaterialQuery, getZOrdersLinkByPlantProjectChildOrderChildMaterialQuery, getZOrderLinkChildOrdersMultipleMaterialQuery };