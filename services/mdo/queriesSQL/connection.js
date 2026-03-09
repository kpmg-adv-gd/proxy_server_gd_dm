const hana = require('@sap/hana-client');

// Configurazione della connessione SAP HANA dalle variabili d'ambiente
const HANA_DB_CONNECTION = JSON.parse(process.env.HANA_DB_CONNECTION_MDO || '{}');

function validateHanaConfig() {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SCHEMA } = HANA_DB_CONNECTION;
    if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_SCHEMA) {
        throw new Error('SAP HANA connection not configured. Please set HANA_DB_CONNECTION_MDO with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SCHEMA');
    }
}

const QUERY_TIMEOUT_MS = parseInt(HANA_DB_CONNECTION.QUERY_TIMEOUT_MS, 10) || 30_000;

// Pool di connessioni creato una sola volta al primo utilizzo
let pool = null;

function getPool() {
    if (!pool) {
        validateHanaConfig();
        pool = hana.createPool(
            {
                serverNode: `${HANA_DB_CONNECTION.DB_HOST}:${HANA_DB_CONNECTION.DB_PORT}`,
                uid: HANA_DB_CONNECTION.DB_USER,
                pwd: HANA_DB_CONNECTION.DB_PASSWORD,
                currentSchema: HANA_DB_CONNECTION.DB_SCHEMA,
                encrypt: true,
                sslValidateCertificate: false
            },
            { min: 2, max: 10 }
        );
    }
    return pool;
}

async function executeQuery(query, params = []) {
    validateHanaConfig();

    const conn = await new Promise((resolve, reject) => {
        getPool().getConnection((err, c) => {
            if (err) reject(err);
            else resolve(c);
        });
    });

    try {
        const queryPromise = new Promise((resolve, reject) => {
            if (params && params.length > 0) {
                const stmt = conn.prepare(query);
                stmt.exec(params, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            } else {
                conn.exec(query, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            }
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`Query timeout dopo ${QUERY_TIMEOUT_MS}ms`)),
                QUERY_TIMEOUT_MS
            )
        );

        const rows = await Promise.race([queryPromise, timeoutPromise]);
        return rows;
    } catch (error) {
        console.error('Errore durante l\'esecuzione della query SAP HANA:', error);
        throw error;
    } finally {
        conn.disconnect();
    }
}

async function executeQueryWithRetry(query, params = [], retries = 3) {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await executeQuery(query, params);
        } catch (error) {
            lastError = error;
            console.warn(`Tentativo ${i + 1}/${retries} fallito:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    throw lastError;
}

module.exports = {
    executeQuery,
    executeQueryWithRetry
};
