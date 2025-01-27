const express = require("express");
//const xsenv = require("@sap/xsenv");
const axios = require("axios");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Carica le variabili di ambiente di XSUAA
// xsenv.loadEnv();
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const whitelist = JSON.parse(process.env.WHITELIST);

// Ottieni le credenziali di XSUAA
// const xsuaaCredentials = xsenv.getServices({ xsuaa: { label: "xsuaa" } }).xsuaa;

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

// Middleware per il parsing del corpo della richiesta
app.use(express.json());

// Abilita CORS per tutte le richieste
app.use(cors({
    origin: whitelist, // Puoi specificare un array di domini consentiti
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const apiService = require("./services/api/listener");
const mdoService = require("./services/mdo/listener");
const postgresdbService = require('./services/postgres-db/listener');
apiService.listenerSetup(app, getBearerToken);
mdoService.listenerSetup(app, getBearerToken);
postgresdbService.listenerSetup(app);



// Endpoint per eseguire query
app.post('/postgresDB/query', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'La query è obbligatoria nel corpo della richiesta.' });
    }

    try {
        const data = await postgresdbService.executeQuery(query);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
    }
});


app.get('/', function (req, res) {
    res.send('Hello World!');
  });
// Avvia il server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
