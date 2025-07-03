const axios = require("axios");
const credentials = JSON.parse(process.env.CREDENTIALS);

let cachedToken = null;
let tokenExpiresAt = null;

let tokenPromise = null; // promessa condivisa tra le chiamate

const getBearerToken = async () => {
    const now = Date.now();

    // Se il token esiste ed è ancora valido, ritorniamolo subito
    if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
        return cachedToken;
    }

    // Se una richiesta per ottenere il token è già in corso, aspettiamo quella
    if (tokenPromise) {
        return tokenPromise;
    }

    // Altrimenti, creiamo una nuova promessa per ottenere il token
    tokenPromise = (async () => {
        const url = credentials.GENERATE_TOKEN_URL;
        const data = new URLSearchParams();
        data.append("grant_type", "client_credentials");
        data.append("client_id", credentials.client_id);
        data.append("client_secret", credentials.client_secret);

        try {
            const response = await axios.post(url, data, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            const expiresIn = response.data.expires_in || 3000; // seconds
            tokenExpiresAt = Date.now() + expiresIn * 1000 - 10000; // 10s buffer
            cachedToken = response.data.access_token;

            return cachedToken;
        } catch (error) {
            console.error("Error getting bearer token:", error.response?.data || error.message);
            throw new Error("Failed to obtain Bearer token. Error: " + JSON.stringify(error) + " . CLIENT_ID = " + credentials.client_id);
        } finally {
            // In ogni caso, azzeriamo la promessa per evitare blocchi futuri
            tokenPromise = null;
        }
    })();

    return tokenPromise;
};

module.exports = { getBearerToken };
