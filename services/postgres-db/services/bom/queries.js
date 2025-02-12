const getZOrdersLinkByProjectParentOrderChildOrderFlagQuery = `SELECT *
                                FROM z_orders_link
                                WHERE project = $1 AND parent_order = $2 AND child_material = ANY($3)  AND parent_assembly_flag = $4`;

module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery };