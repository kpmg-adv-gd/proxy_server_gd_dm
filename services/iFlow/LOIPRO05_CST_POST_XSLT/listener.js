const bodyParser = require("body-parser");
const { DOMParser, XMLSerializer  } = require("xmldom");
const { managePostXSLTPhase } = require("./library");
const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");

module.exports.listenerSetup = (app) => {
    // Middleware per gestire XML come testo

    app.post("/iFlow/LOIPRO05_CST_POST_XSLT", bodyParser.text({ type: "application/xml" }), authMiddlewareCPI, async (req, res) => {
        try {

            // Converte una stringa XML in un oggetto DOM (Document Object Model).
            const doc = new DOMParser().parseFromString(req.body, "application/xml");

            var modifiedLOIPRO = await managePostXSLTPhase(doc);

            // Converte un oggetto DOM XML di nuovo in una stringa
            const updatedDocXmlString = new XMLSerializer().serializeToString(modifiedLOIPRO);
            // Imposta l'header per la risposta in XML
            res.setHeader("Content-Type", "application/xml");
            res.status(200).send(updatedDocXmlString);  // Restituisce l'XML modificato
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error - LOIPRO05_CST_POST_XSLT";
            console.error("Error processing XML:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });
};
