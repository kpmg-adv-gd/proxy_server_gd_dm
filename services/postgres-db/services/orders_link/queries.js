const insertZOrdersLinkQuery = `INSERT INTO z_orders_link(plant,project,parent_order,parent_material,child_order,child_material,parent_assembly_flag,child_order_type,machine_section)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                                ON CONFLICT (plant,project,child_order) DO NOTHING;`;

const getZOrdersLinkByPlantProjectOrderTypeQuery = `SELECT *
                                                        FROM z_orders_link
                                                        WHERE plant = $1 AND project = $2 AND child_order_type = $3`;
const getZOrdersLinkMachByPlantProjectOrderTypeMachineSectionQuery = `SELECT *
                                                                FROM z_orders_link
                                                                WHERE plant = $1 AND project = $2 AND child_order_type = $3 AND child_material = $4 AND (parent_order IS NULL OR parent_order = '')`;

const getZOrdersLinkByPlantProjectAndParentOrderQuery = `SELECT *
                                                    FROM z_orders_link
                                                    WHERE plant = $1 AND project = $2 AND parent_order = $3`;

const getAllMachMaterialsQuery = `SELECT DISTINCT child_material
                            FROM z_orders_link
                            WHERE plant = $1 AND child_order_type=$2 AND (parent_order IS NULL OR parent_order='') `;                  

const getMachOrderByComponentOrderQuery = `WITH RECURSIVE order_hierarchy AS (
    -- Punto di partenza
    SELECT 
        o.*,
        0 AS level
    FROM z_orders_link o
    WHERE o.plant = $1 AND o.project = $2 AND o.child_order = $3

    UNION ALL

    -- Risali finché trovi parent_order
    SELECT 
        o.*,
        oh.level + 1 AS level
    FROM z_orders_link o
    JOIN order_hierarchy oh ON o.child_order = oh.parent_order
)

-- Seleziona solo l'ultima riga risalita
SELECT *
FROM order_hierarchy
WHERE child_order_type='MACH' `;

module.exports = { insertZOrdersLinkQuery, getZOrdersLinkByPlantProjectOrderTypeQuery, getZOrdersLinkMachByPlantProjectOrderTypeMachineSectionQuery, getZOrdersLinkByPlantProjectAndParentOrderQuery, getAllMachMaterialsQuery,getMachOrderByComponentOrderQuery};