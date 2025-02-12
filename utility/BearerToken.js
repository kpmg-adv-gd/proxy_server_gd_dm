const axios = require("axios");
const credentials = JSON.parse(process.env.CREDENTIALS);
// Funzione per ottenere il Bearer Token
const getBearerToken = async () => {
    const url = credentials.GENERATE_TOKEN_URL;
    const data = new URLSearchParams();
    data.append("grant_type", "client_credentials");
    data.append("client_id", credentials.client_id);
    data.append("client_secret", credentials.client_secret);

    try {
        const response = await axios.post(url, data, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data.access_token; // Restituisce il token
    } catch (error) {
        console.error("Error getting bearer token: " + error + "CLIENT_ID = "+ credentials.client_id);
        throw new Error("Failed to obtain Bearer token");
    }
};

// Esporta la funzione
module.exports = { getBearerToken };