const { callGet } = require("../../../utility/CommonCallApi");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

module.exports.listenerSetup = (app) => {

    app.post("/api/certification/v1/certifications/check", async (req, res) => {
        try {
            const { operation, userId, plant } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!operation || !userId || !plant ) {
                return res.status(400).json({ error: "Missing required parameters: operation-userId-plant" });
            }

            var url = hostname+"/certification/v1/certifications/check";
            var params = {
                "checkCertifications": [
                   {
                      "operation": operation,
                      "userId": userId
                   }
                ],
                "plant": plant
            };
            var response = await callPost(url,params);
            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/checkUserWorkCenterCertification", async (req, res) => {
        try {
            const { plant, userId, workCenter } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !userId || !workCenter ) {
                return res.status(400).json({ error: "Missing required parameters: workCenter-userId-plant" });
            }
            var url = hostname+"/user/v1/users?plant="+plant+"&userId="+userId;

            var response = await callGet(url);
            var isUserCertificated = response?.workCenters.some(wcObj => wcObj.workCenter === workCenter);

            res.status(200).json(isUserCertificated);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


