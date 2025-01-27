const { Pool } = require('pg');


const POSTGRES_DB_CONNECTION = JSON.parse(process.env.POSTGRES_DB_CONNECTION);
// Configura il pool PostgreSQL usando le variabili di ambiente
const pool = new Pool({
    user: POSTGRES_DB_CONNECTION.DB_USER,
    host: POSTGRES_DB_CONNECTION.DB_HOST,
    database: POSTGRES_DB_CONNECTION.DB_NAME,
    password: POSTGRES_DB_CONNECTION.DB_PASSWORD,
    port: POSTGRES_DB_CONNECTION.DB_PORT,
    ssl: { rejectUnauthorized: false }, 
});

// Funzione per eseguire query
async function executeQuery(query) {
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Errore durante l\'esecuzione della query:', error);
        throw error;
    }
}

module.exports = {
    executeQuery,
};
