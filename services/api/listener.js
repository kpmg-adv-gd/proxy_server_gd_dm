const axios = require("axios");
const { getCustomDataFromRoutingStepData } = require("./library");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app, getBearerToken) => {
    app.get("/api/materials", async (req, res) => {
        try {
            // Ottieni i query parameters dall'URL
            const { plant } = req.query;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !routing) {
                return res.status(400).json({ error: "Missing required query parameters: plant or routing" });
            }

            var url = hostname+"/material/v2/materials?plant="+plant;
            // Ottieni il Bearer Token prima di fare la richiesta API
            const token = await getBearerToken();

            // Effettua la chiamata alla API esterna con il Bearer Token
            const response = await axios.get(url, {
                headers: {
                    Authorization : `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
                },
            });
            console.log("Response Data:", response.data); // Log dei dati di risposta
            // Restituisci i dati della risposta
            res.json(response.data);
        } catch (error) {
            console.error("Error calling external API:", error.response?.data || error.message);
            res.status(500).json({ error: "Error calling external API"});
        }
    });

    app.get("/api/routingCustomData", async (req, res) => {
        try {
            // Ottieni i query parameters dall'URL
            const { plant, type, routing, stepId } = req.query;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !routing) {
                return res.status(400).json({ error: "Missing required query parameters: plant or routing" });
            }
            // Ottieni il Bearer Token prima di fare la richiesta API
            const token = await getBearerToken();
            var url = hostname+"/routing/v1/routings/routingSteps?plant="+plant+"&type="+type+"&routing="+routing;

            // Effettua la chiamata alla API esterna con il Bearer Token
            const response = await axios.get(url, {
                headers: {
                    Authorization : `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
                },
            });
            console.log("Response Data:", response.data); // Log dei dati di risposta
            const processedData = getCustomDataFromRoutingStepData(response.data, stepId);
            // Restituisci i dati della risposta
            res.json(processedData);
        } catch (error) {
            console.error("Error calling external API:", error.response?.data || error.message);
            res.status(500).json({ error: "Error calling external API"});
        }
    });

    app.get("/api/getPersonnelNumber", async (req, res) => {
        try {
            const { plant, userId } = req.query;
    
            if (!plant || !userId) {
                return res.status(400).json({ error: "Missing required query parameters: plant or userId" });
            }
    
            const token = await getBearerToken();
            var url = hostname + "/user/v1/users?plant=" + plant + "&userId=" + userId;
    
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`, 
                },
            });
    
            const personnelNumber = response.data.erpPersonnelNumber;
    
            if (!personnelNumber) {
                return res.status(404).json({ error: "Personnel number not found" });
            }
    
            res.json({ erpPersonnelNumber: personnelNumber });
        } catch (error) {
            console.error("Error calling external API:", error.response?.data || error.message);
            res.status(500).json({ error: "Error calling external API" });
        }
    });    
};
