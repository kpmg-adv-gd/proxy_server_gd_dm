const axios = require("axios");
const credentials = JSON.parse(process.env.CREDENTIALS);
let cachedToken = null;
let tokenExpiresAt = null;
// Funzione per ottenere il Bearer Token -  Aggiunta del token cachato perchè sulla discesa di 200 loipro la richiesta andava in timeout
const getBearerToken = async () => {
    const now = Date.now();
    if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
        return cachedToken;
    }

    const url = credentials.GENERATE_TOKEN_URL;
    const data = new URLSearchParams();
    data.append("grant_type", "client_credentials");
    data.append("client_id", credentials.client_id);
    data.append("client_secret", credentials.client_secret);

    try {
        const response = await axios.post(url, data, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const expiresIn = response.data.expires_in || 1800; // seconds
        tokenExpiresAt = now + expiresIn * 1000 - 10000; // safety buffer di 10 sec - buffer di sicurezza di 10 secondi, per evitare che scada proprio mentre lo usiamo
        cachedToken = response.data.access_token;
        return cachedToken;
    } catch (error) {
        console.error("Error getting bearer token:", error.response?.data || error.message);
        throw new Error("Failed to obtain Bearer token. Error"+JSON.stringify(error) +" . CLIENT_ID = " + credentials.client_id);
    }
};

module.exports = { getBearerToken }
