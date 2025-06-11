const axios = require("axios");
const { dispatch } = require("../../mdo/library");
const { callGet, callPost, callGetFile } = require("../../../utility/CommonCallApi");

// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    // Recupero dei codici di non conformità 
    app.get("/api/nonconformancecode/v1/nonconformancecodes", async (req, res) => {
        try {
            const { plant, code } = req.query;
            if (!plant) {
                return res.status(400).json({ error: "Missing required query parameters: plant" });
            }

            if (code) {
                var url = hostname + "/nonconformancecode/v1/nonconformancecodes?plant=" + plant + "&code=" + code;
            } else {
                var url = hostname + "/nonconformancecode/v1/nonconformancecodes?plant=" + plant;
            }

            const codeResponse = await callGet(url);
            res.status(200).json({ codeResponse: codeResponse });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Recupero dei gruppi di non conformità
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

    // Creazione del difetto
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
                params.files = [{
                    "fileContent": files.fileContent,
                    "fileMediaType": files.fileMediaType,
                    "fileName": files.fileName
                }]
            }

            console.log("Calling external API with params:" + JSON.stringify(params));
            var response = await callPost(url, params);
            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Recupero difetti di un SFC
    app.get("/api/nonconformance/v2/nonconformances", async (req, res) => {
        try {
            const { plant, sfc, routingStepId, routing } = req.query;
            if (!plant || !sfc) {
                return res.status(400).json({ error: "Missing required query parameters: plant, sfc" });
            }

            var url = hostname + "/nonconformance/v2/nonconformances?plant=" + plant + "&sfc=" + sfc;

            if (routingStepId && routing) {
                url += "&routingStepId=" + routingStepId + "&routing=" + routing;
            }

            const defectResponse = await callGet(url);
            res.status(200).json({ defectResponse: defectResponse });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Chiusura del difetto
    app.post("/api/nonconformance/v1/close", async (req, res) => {
        try {
            const { id, plant, comments } = req.body;
            var url = hostname + "/nonconformance/v1/close";

            var params = {
                "plant": plant,
                "id": id,
                "comments": comments
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

    // Recupero difetti aperti di un SFC, in vista standard SAP_MDO_NONCONFORMANCES_V
    app.post("/api/getDefectOpenBySFCs", async (req, res) => {
        try {
            const { sfcs } = req.body;
            if (!sfcs) {
                return res.status(400).json({ error: "Missing required query parameters: sfcs" });
            }

            const sfcFilter = sfcs.map(sfc => `SFC eq '${sfc}'`).join(' or ');
            const filter = `(${sfcFilter}) and NC_STATE eq 'OPEN'`;
            const mockReq = {
                path: "/mdo/NON_CONFORMANCE",
                query: { $apply: `filter(${filter})` },
                method: "GET"
            };
            //chiamo l'api del mdo con quella request
            var result = await dispatch(mockReq);
            res.status(200).json(result);

        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Recupero WBE per lista di SFC
    app.post("/api/getWBEBySFCs", async (req, res) => {
        try {
            const { sfcs, plant } = req.body;
            if (!sfcs || !plant) {
                return res.status(400).json({ error: "Missing required query parameters: sfcs, plant" });
            }

            const sfcFilter = sfcs.map(sfc => `MFG_ORDER eq '${sfc}'`).join(' or ');
            const filter = `(${sfcFilter}) and (DATA_FIELD eq 'WBE' and PLANT eq '${plant}' AND IS_DELETED eq 'false')`;
            const mockReq = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${filter})` },
                method: "GET"
            };

            //chiamo l'api del mdo con quella request
            var result = await dispatch(mockReq);
            res.status(200).json(result);

        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Recupero lista SFC dalla WBE
    app.post("/api/getSFCbyWBE", async (req, res) => {
        try {
            const { wbe, plant } = req.body;
            if (!wbe || !plant) {
                return res.status(400).json({ error: "Missing required query parameters: wbe, plant" });
            }

            const filter = `DATA_FIELD eq 'WBE' and DATA_FIELD_VALUE eq '${wbe}' and PLANT eq '${plant}' AND IS_DELETED eq 'false'`;
            const mockReq = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${filter})` },
                method: "GET"
            };
            //chiamo l'api del mdo con quella request
            var result = await dispatch(mockReq);
            res.status(200).json(result);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    // Download file
    app.post("/api/nonconformance/v1/file/download", async (req, res) => {
        try {
            const { fileId } = req.body;
            var url = hostname + "/nonconformance/v1/file/download?fileId=" + fileId;

            var response = await callGetFile(url);
            res.status(200).send({
                fileName: fileId,
                fileContent: response.data,
                contentType: response.headers['content-type'],
            });
            console.log("File downloaded successfully:", JSON.stringify(response));
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });


};
