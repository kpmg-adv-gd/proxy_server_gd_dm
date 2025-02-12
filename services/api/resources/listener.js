const axios = require("axios");
const { callGet } = require("../../../utility/CommonCallApi");

// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    app.get("/api/resource/v2/resources", async (req, res) => {
        try {
            const { plant, resource } = req.query;
            if (!plant || !resource) {
                return res.status(400).json({ error: "Missing required query parameters: plant or resource" });
            }
    
            var url = hostname + "/resource/v2/resources?plant=" + plant + "&resource=" + resource;
    
            const response = await callGet(url);
            const resourceData = response[0];
    
            if (!Array.isArray(resourceData.shifts) || resourceData.shifts.length === 0) {
                return res.status(404).json({ error: "Shift not found" });
            }
            const shiftName = resourceData.shifts[0].shift;
    
            res.status(200).json({ shift: shiftName });
    
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });
    

};
