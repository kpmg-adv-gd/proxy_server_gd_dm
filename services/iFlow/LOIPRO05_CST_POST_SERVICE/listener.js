const bodyParser = require("body-parser");
const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { DOMParser } = require("xmldom");
const { managePostServicePhase } = require("./library");


module.exports.listenerSetup = (app) => {
    // bodyParser.text({ type: "application/xml" }) Middleware per gestire XML come testo
    app.post("/iFlow/LOIPRO05_CST_POST_SERVICE", bodyParser.text({ type: "application/xml", limit: "20mb"  }), authMiddlewareCPI, async (req, res) => {

            try {
                console.log("Received XML Body:\n", req.body);

                // Converte una stringa XML in un oggetto DOM (Document Object Model).
                const doc = new DOMParser().parseFromString(req.body, "application/xml");

                console.log("QUI...");
                //await managePostServicePhase(doc);

                // Imposta l'header per la risposta in XML
                res.setHeader("Content-Type", "application/xml");
                res.status(200).send(req.body);  // Restituisce l'XML modificato
            } catch (error) {
                let status = error.status || 500;
                let errMessage = error.message || "Internal Server Error";
                console.error("Error processing XML:", errMessage);
                res.status(status).json({ error: errMessage });
            }

    });
};
