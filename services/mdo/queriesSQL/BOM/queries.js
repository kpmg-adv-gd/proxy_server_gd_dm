const HANA_DB_CONNECTION = JSON.parse(process.env.HANA_DB_CONNECTION || '{}');
const DB_SCHEMA = HANA_DB_CONNECTION.DB_SCHEMA || '';

function getFullViewName(viewName) {
    return DB_SCHEMA ? `"${DB_SCHEMA}"."${viewName}"` : `"${viewName}"`;
}

const getBomComponentQuantityTotalQuery = `
    SELECT bc.QUANTITY_TOTAL
    FROM ${getFullViewName('SAP_MDO_ORDER_V')} mdo
    INNER JOIN ${getFullViewName('SAP_MDO_BOM_COMPONENT_V')} bc
        ON mdo.BOM = bc.BOM AND mdo.PLANT = bc.PLANT
    WHERE mdo.MFG_ORDER = ?
      AND bc.IS_DELETED != 'false'
      AND bc.MATERIAL = ?
      AND mdo.PLANT = ?
`;

module.exports = { getBomComponentQuantityTotalQuery };
