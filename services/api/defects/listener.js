const axios = require("axios");
const { callGet, callPost } = require("../../../utility/CommonCallApi");

// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    app.get("/api/nonconformancecode/v1/nonconformancecodes", async (req, res) => {
        try {
            const { plant } = req.query;
            if (!plant) {
                return res.status(400).json({ error: "Missing required query parameters: plant" });
            }

            var url = hostname + "/nonconformancecode/v1/nonconformancecodes?plant=" + plant;
            const codeResponse = await callGet(url);
            res.status(200).json({ codeResponse: codeResponse });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.get("/api/nonconformancegroup/v1/nonconformancegroups", async (req, res) => {
        try {
            const { plant } = req.query;
            if (!plant) {
                return res.status(400).json({ error: "Missing required query parameters: plant" });
            }

            var url = hostname + "/nonconformancegroup/v1/nonconformancegroups?plant=" + plant;
            const groupResponse = await callGet(url);
            res.status(200).json({ groupResponse: groupResponse });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/nonconformance/v1/log", async (req, res) => {
        try {
            const { code, plant, sfc, workcenter, quantity, routingStepId, startSfcRequired, 
                allowNotAssembledComponents, files } = req.body;
            var url = hostname + "/nonconformance/v1/log";

            var params = {
                "plant": plant,
                "code": code,
                "sfcs": [
                    sfc
                ],
                "workCenter": workcenter,
                "quantity": quantity,
                "routingStepId": routingStepId,
                "startSfcRequired": startSfcRequired,
                "allowNotAssembledComponents": allowNotAssembledComponents
            }
            if (files != undefined) {
                params.files = {
                    "fileContent": files.fileContent,
                    "fileMediaType": files.fileMediaType,
                    "fileName": files.fileName
                }
            }

            var response = await callPost(url, params);
            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
