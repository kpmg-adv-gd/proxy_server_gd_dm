const hanaConnection = require('./connection');

// Configurazione dello schema SAP HANA dalle variabili d'ambiente
const HANA_DB_CONNECTION = JSON.parse(process.env.HANA_DB_CONNECTION || '{}');
const DB_SCHEMA = HANA_DB_CONNECTION.DB_SCHEMA || '';

/**
 * Costruisce il nome completo della vista con lo schema
 * @param {string} viewName - Nome della vista
 * @returns {string} - Nome completo della vista con schema
 */
function getFullViewName(viewName) {
    return DB_SCHEMA ? `"${DB_SCHEMA}"."${viewName}"` : `"${viewName}"`;
}

/**
 * Query di esempio per le viste MDO di SAP HANA
 * Le viste MDO sono tipicamente nel formato: SAP_MDO_<NOME_VISTA>_V
 */

/**
 * Recupera gli ordini dalla vista SAP_MDO_ORDER_V
 * @param {string} plant - Plant code
 * @param {string} order - Order number (opzionale)
 * @returns {Promise<Array>} - Lista degli ordini
 */
async function getOrders(plant, order = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_ORDER_V')} WHERE "PLANT" = ?`;
    const params = [plant];
    
    if (order) {
        query += ` AND "MFG_ORDER" = ?`;
        params.push(order);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Recupera gli SFC dalla vista SAP_MDO_SFC_V
 * @param {string} plant - Plant code
 * @param {string} sfc - SFC number (opzionale)
 * @returns {Promise<Array>} - Lista degli SFC
 */
async function getSFC(plant, sfc = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_SFC_V')} WHERE "PLANT" = ?`;
    const params = [plant];
    
    if (sfc) {
        query += ` AND "SFC" = ?`;
        params.push(sfc);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Recupera i custom data degli ordini dalla vista SAP_MDO_ORDER_CUSTOM_DATA_V
 * @param {string} plant - Plant code
 * @param {string} order - Order number
 * @param {string} dataField - Data field name (opzionale)
 * @returns {Promise<Array>} - Lista dei custom data
 */
async function getOrderCustomData(plant, order, dataField = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_ORDER_CUSTOM_DATA_V')} 
                 WHERE "PLANT" = ? AND "MFG_ORDER" = ? AND "IS_DELETED" = 'false'`;
    const params = [plant, order];
    
    if (dataField) {
        query += ` AND "DATA_FIELD" = ?`;
        params.push(dataField);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Recupera i work centers dalla vista SAP_MDO_WORKCENTER_V
 * @param {string} plant - Plant code
 * @param {string} workcenter - Workcenter code (opzionale)
 * @returns {Promise<Array>} - Lista dei work centers
 */
async function getWorkcenters(plant, workcenter = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_WORKCENTER_V')} 
                 WHERE "PLANT" = ? AND "STATUS" = 'ENABLED' AND "IS_DELETED" = 'false'`;
    const params = [plant];
    
    if (workcenter) {
        query += ` AND "WORKCENTER" = ?`;
        params.push(workcenter);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Recupera i materiali dalla vista SAP_MDO_MATERIAL_V
 * @param {string} plant - Plant code
 * @param {string} material - Material number (opzionale)
 * @returns {Promise<Array>} - Lista dei materiali
 */
async function getMaterials(plant, material = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_MATERIAL_V')} WHERE "PLANT" = ?`;
    const params = [plant];
    
    if (material) {
        query += ` AND "MATERIAL" = ?`;
        params.push(material);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Recupera i routing dalla vista SAP_MDO_ROUTER_V
 * @param {string} plant - Plant code
 * @param {string} routing - Routing code (opzionale)
 * @returns {Promise<Array>} - Lista dei routing
 */
async function getRoutings(plant, routing = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_ROUTER_V')} WHERE "PLANT" = ?`;
    const params = [plant];
    
    if (routing) {
        query += ` AND "ROUTING" = ?`;
        params.push(routing);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Recupera le operazioni dalla vista SAP_MDO_OPERATION_V
 * @param {string} plant - Plant code
 * @param {string} operation - Operation code (opzionale)
 * @returns {Promise<Array>} - Lista delle operazioni
 */
async function getOperations(plant, operation = null) {
    let query = `SELECT * FROM ${getFullViewName('SAP_MDO_OPERATION_V')} WHERE "PLANT" = ?`;
    const params = [plant];
    
    if (operation) {
        query += ` AND "OPERATION" = ?`;
        params.push(operation);
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Query generica per qualsiasi vista MDO
 * @param {string} viewName - Nome della vista (es: "SAP_MDO_ORDER_V")
 * @param {Object} filters - Filtri da applicare come oggetto {campo: valore}
 * @param {Array<string>} columns - Colonne da selezionare (default: *)
 * @returns {Promise<Array>} - Risultati della query
 */
async function queryMDOView(viewName, filters = {}, columns = ['*']) {
    const columnsList = columns.join(', ');
    let query = `SELECT ${columnsList} FROM ${getFullViewName(viewName)}`;
    const params = [];
    
    if (Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters).map(key => {
            params.push(filters[key]);
            return `"${key}" = ?`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    return await hanaConnection.executeQuery(query, params);
}

/**
 * Esegue una query personalizzata
 * @param {string} query - Query SQL completa
 * @param {Array} params - Parametri per la query
 * @returns {Promise<Array>} - Risultati della query
 */
async function executeCustomQuery(query, params = []) {
    return await hanaConnection.executeQueryWithRetry(query, params);
}

module.exports = {
    getOrders,
    getSFC,
    getOrderCustomData,
    getWorkcenters,
    getMaterials,
    getRoutings,
    getOperations,
    queryMDOView,
    executeCustomQuery
};
