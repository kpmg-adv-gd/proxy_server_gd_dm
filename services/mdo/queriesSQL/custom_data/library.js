const { executeQuery } = require('../connection');
const queries = require('./queries');

async function getProjectsVerbaliTesting(plant) {
    return await executeQuery(queries.GET_PROJECTS_VERBALI_TESTING, [plant]);
}

async function getVerbaliTileSupervisoreTestingData(plant) {
    return await executeQuery(queries.GET_VERBALI_TILE_SUPERVISORE_TESTING, [plant]);
}

async function getFilterVerbalManagementData(plant) {
    return await executeQuery(queries.GET_FILTER_VERBAL_MANAGEMENT, [plant]);
}

async function getFilterFinalCollaudoData(plant) {
    return await executeQuery(queries.GET_FILTER_FINAL_COLLAUDO, [plant]);
}

async function getFinalCollaudoDataSql(plant) {
    return await executeQuery(queries.GET_FINAL_COLLAUDO_DATA, [plant]);
}

async function getVerbalManagementTableData(plant) {
    return await executeQuery(queries.GET_VERBAL_MANAGEMENT_TABLE, [plant]);
}

// Query dinamica: il numero di SFC non è noto a compile time
async function getFilterSafetyApprovalData(plant, sfcList) {
    const placeholders = sfcList.map(() => '?').join(', ');
    const query = `
        SELECT
            sfc.SFC,
            sfc.MFG_ORDER,
            MAX(CASE WHEN cd.DATA_FIELD = 'COMMESSA' THEN cd.DATA_FIELD_VALUE END) AS PROJECT,
            MAX(CASE WHEN cd.DATA_FIELD = 'CO_PREV'  THEN cd.DATA_FIELD_VALUE END) AS CO
        FROM SAP_MDO_SFC_V sfc
        LEFT JOIN SAP_MDO_ORDER_CUSTOM_DATA_V cd
            ON cd.MFG_ORDER = sfc.MFG_ORDER
            AND cd.PLANT = sfc.PLANT
            AND cd.DATA_FIELD IN ('COMMESSA', 'CO_PREV')
            AND cd.IS_DELETED = 'false'
        WHERE sfc.PLANT = ?
          AND sfc.STATUS NOT IN ('DELETED', 'INVALID', 'HOLD')
          AND sfc.SFC IN (${placeholders})
        GROUP BY sfc.SFC, sfc.MFG_ORDER
    `;
    return await executeQuery(query, [plant, ...sfcList]);
}


async function getBomComponentQuantityTotal(plant, orderNumber, missing_material){
    return await executeQuery(queries.GET_BOM_COMPONENT_QUANTITY_TOTAL, [plant, orderNumber, missing_material]);
}

module.exports = {
    getProjectsVerbaliTesting,
    getVerbaliTileSupervisoreTestingData,
    getFilterVerbalManagementData,
    getFilterFinalCollaudoData,
    getFilterSafetyApprovalData,
    getFinalCollaudoDataSql,
    getVerbalManagementTableData,
    getBomComponentQuantityTotal
};