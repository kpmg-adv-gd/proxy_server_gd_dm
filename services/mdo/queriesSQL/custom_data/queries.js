const GET_PROJECTS_VERBALI_TESTING = `
    SELECT DISTINCT proj.DATA_FIELD_VALUE AS PROJECT
    FROM SAP_MDO_ORDER_CUSTOM_DATA_V proj
    WHERE proj.DATA_FIELD = 'COMMESSA'
    AND proj.PLANT = ?
    AND proj.IS_DELETED = 'false'
    AND EXISTS (
        SELECT 1
        FROM SAP_MDO_ORDER_CUSTOM_DATA_V mach
        WHERE mach.MFG_ORDER = proj.MFG_ORDER
            AND mach.DATA_FIELD = 'ORDER_TYPE'
            AND mach.DATA_FIELD_VALUE = 'MACH'
            AND mach.PLANT = proj.PLANT
            AND mach.IS_DELETED = 'false'
    )
    AND EXISTS (
        SELECT 1
        FROM SAP_MDO_ORDER_CUSTOM_DATA_V status
        WHERE status.MFG_ORDER = proj.MFG_ORDER
            AND status.DATA_FIELD = 'ASSEMBLY_REPORT_STATUS'
            AND status.DATA_FIELD_VALUE = 'DONE'
            AND status.PLANT = proj.PLANT
            AND status.IS_DELETED = 'false'
    );
`;

const GET_VERBALI_TILE_SUPERVISORE_TESTING = `
        WITH valid_orders AS (
            SELECT DISTINCT MFG_ORDER, PLANT
            FROM SAP_MDO_ORDER_CUSTOM_DATA_V
            WHERE PLANT = ?
            AND IS_DELETED = 'false'
            AND (
                    (DATA_FIELD = 'ORDER_TYPE' AND DATA_FIELD_VALUE = 'MACH')
                OR (DATA_FIELD = 'ASSEMBLY_REPORT_STATUS' AND DATA_FIELD_VALUE = 'DONE')
            )
        )
            
        SELECT
            ord.MFG_ORDER,
            MAX(sfc.SFC)    AS SFC,
            MAX(sfc.STATUS) AS STATUS,

            MAX(CASE WHEN ord.DATA_FIELD = 'COMMESSA' THEN ord.DATA_FIELD_VALUE END) AS PROJECT,
            MAX(CASE WHEN ord.DATA_FIELD = 'WBE' THEN ord.DATA_FIELD_VALUE END) AS WBS,
            MAX(CASE WHEN ord.DATA_FIELD = 'SEZIONE MACCHINA' THEN ord.DATA_FIELD_VALUE END) AS MATERIAL,
            MAX(CASE WHEN ord.DATA_FIELD = 'ASSEMBLY_REPORT_DATE' THEN ord.DATA_FIELD_VALUE END) AS ASSEMBLY_REPORT_DATE,
            MAX(CASE WHEN ord.DATA_FIELD = 'ASSEMBLY_REPORT_USER' THEN ord.DATA_FIELD_VALUE END) AS ASSEMBLY_REPORT_USER,
            MAX(CASE WHEN ord.DATA_FIELD = 'ASSEMBLY_REPORT_WEIGHT_ID' THEN ord.DATA_FIELD_VALUE END) AS ID_REPORT_WEIGHT

        FROM SAP_MDO_ORDER_CUSTOM_DATA_V ord

        INNER JOIN valid_orders v
            ON v.MFG_ORDER = ord.MFG_ORDER
            AND v.PLANT = ord.PLANT

        INNER JOIN SAP_MDO_SFC_V sfc
            ON sfc.MFG_ORDER = ord.MFG_ORDER
            AND sfc.PLANT = ord.PLANT
            AND sfc.STATUS != 'INVALID'

        GROUP BY ord.MFG_ORDER
`;

module.exports = {
    GET_PROJECTS_VERBALI_TESTING,
    GET_VERBALI_TILE_SUPERVISORE_TESTING,
};
