const { callGet, callGetFile } = require("../../../utility/CommonCallApi");
const { filteredWorkInstructionsTI } = require("./library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
module.exports.listenerSetup = (app) => {

    app.post("/api/workinstruction/v1/attachedworkinstructions", async (req, res) => {
        try {
            const { plant, sfc, operation } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !sfc || !operation ) {
                return res.status(400).json({ error: "Missing required parameters: plant-sfc-operation" });
            }

            var url = hostname+"/workinstruction/v1/attachedworkinstructions?plant="+plant+"&sfc="+sfc+"&operationactivity="+operation;

            var response = await callGet(url);
            res.status(200).json({result: response});
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/workinstruction/v1/attachedworkinstructionsTI", async (req, res) => {
        try {
            const { plant, sfc, operation, idLev3 } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !sfc || !operation ) {
                return res.status(400).json({ error: "Missing required parameters: plant-sfc-operation" });
            }

            var url = hostname+"/workinstruction/v1/attachedworkinstructions?plant="+plant+"&sfc="+sfc+"&operationactivity="+operation;

            var response = await callGet(url);
            var dataFiltered = await filteredWorkInstructionsTI(plant, response, idLev3);
            res.status(200).json({result: dataFiltered});
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });

    app.post('/api/workinstruction/v1/workinstructions/file', async (req, res) => {
        try {
            const { fileName, externalFileUrl } = req.body; // Prendere il fileExternalUrl dalla query string
        
            if (!externalFileUrl) {
                return res.status(400).json({ error: 'externalFileUrl mancante' });
            }
    
            // Costruire l'URL completo per l'API esterna (esempio)
            const url = hostname+"/workinstruction/v1/workinstructions/file?externalFileUrl="+externalFileUrl;
            const response = await callGetFile(url);

            //.send permette di specificare il content type di risposta (quindi anche blob, oggetti ecc..), .json fa tutto da solo per ritornare un json
            res.status(200).send({
                fileName: fileName,
                fileContent: response.data,
                contentType: response.headers['content-type'],
            });
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Errore nel recupero del file.";
            res.status(status).json({ error: errMessage });
        }
    });

}