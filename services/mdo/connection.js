const hana = require('@sap/hana-client');

// Configurazione della connessione SAP HANA dalle variabili d'ambiente
const HANA_DB_CONNECTION = JSON.parse(process.env.HANA_DB_CONNECTION || '{}');

/**
 * Verifica che la configurazione SAP HANA sia presente
 */
function validateHanaConfig() {
    if (!HANA_DB_CONNECTION.DB_HOST || !HANA_DB_CONNECTION.DB_PORT || 
        !HANA_DB_CONNECTION.DB_USER || !HANA_DB_CONNECTION.DB_PASSWORD) {
        throw new Error('SAP HANA connection not configured. Please set HANA_DB_CONNECTION environment variable with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
    }
}

/**
 * Esegue una query sul database SAP HANA
 * @param {string} query - Query SQL da eseguire
 * @param {Array} params - Parametri per la query (opzionali)
 * @returns {Promise<Array>} - Risultati della query
 */
async function executeQuery(query, params = []) {
    // Verifica configurazione prima di procedere
    validateHanaConfig();
    
    // Crea una nuova connessione per ogni query
    const conn = hana.createConnection();
    
    try {
        // Connessione al database
        await new Promise((resolve, reject) => {
            // SAP HANA Cloud richiede serverNode nel formato host:port
            const serverNode = `${HANA_DB_CONNECTION.DB_HOST}:${HANA_DB_CONNECTION.DB_PORT}`;
            
            conn.connect({
                serverNode: serverNode,
                uid: HANA_DB_CONNECTION.DB_USER,
                pwd: HANA_DB_CONNECTION.DB_PASSWORD,
                encrypt: true,
                sslValidateCertificate: false
            }, (err) => {
                if (err) {
                    console.error('Errore durante la connessione a SAP HANA:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        // Esecuzione della query
        const result = await new Promise((resolve, reject) => {
            if (params && params.length > 0) {
                // Query con parametri preparati
                const stmt = conn.prepare(query);
                stmt.exec(params, (err, rows) => {
                    if (err) {
                        console.error('Errore durante l\'esecuzione della query:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            } else {
                // Query semplice
                conn.exec(query, (err, rows) => {
                    if (err) {
                        console.error('Errore durante l\'esecuzione della query:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            }
        });

        return result;
    } catch (error) {
        console.error('Errore durante l\'esecuzione della query SAP HANA:', error);
        throw error;
    } finally {
        // Disconnessione
        if (conn && conn.connected) {
            conn.disconnect();
        }
    }
}

/**
 * Esegue una query con gestione automatica della connessione e retry
 * @param {string} query - Query SQL da eseguire
 * @param {Array} params - Parametri per la query (opzionali)
 * @param {number} retries - Numero di tentativi in caso di errore
 * @returns {Promise<Array>} - Risultati della query
 */
async function executeQueryWithRetry(query, params = [], retries = 3) {
    let lastError = null;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await executeQuery(query, params);
        } catch (error) {
            lastError = error;
            console.warn(`Tentativo ${i + 1}/${retries} fallito:`, error.message);
            
            // Attendi prima di riprovare (exponential backoff)
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
