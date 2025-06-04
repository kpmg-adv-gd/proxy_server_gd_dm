const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { manageNewModifiche } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/MANAGE_MODIFICHE_FROM_SAP", authMiddlewareCPI, async (req, res) => {

        try {
            
            console.log("MANAGE_MODIFICHE_FROM_SAP= "+JSON.stringify(req.body))
            let jsonModifiche = req.body;
            await manageNewModifiche(jsonModifiche);
            res.set('Content-Type', 'text/xml; charset=utf-8');
            res.status(200).send(`
            <ns1:invokeResponse xmlns:ns1="http://cxf.component.camel.apache.org/">
                <Result>
                    <Status>OK</Status>
                    <Message>Data received successfully</Message>
                </Result>
            </ns1:invokeResponse>
            `);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error || error.message || "Internal Server Error";
            console.log("ERROR: "+JSON.stringify(errMessage));
            res.set('Content-Type', 'text/xml; charset=utf-8');
            res.status(200).send(`<ns1:invokeResponse xmlns:ns1="http://cxf.component.camel.apache.org/">
                <Result>
                    <Status>KO</Status>
                    <Message>Data received successfully</Message>
                </Result>
            </ns1:invokeResponse>`);
        }

    });
};
