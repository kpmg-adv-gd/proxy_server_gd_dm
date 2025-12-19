const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { manageCoordinamento } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/MANAGE_COORDINAMENTO_FROM_SAP", authMiddlewareCPI, async (req, res) => {

        try {

            let jsonCoordinamento = req.body;

            /* Qui sviluppo la logica per gestire i coordinamenti ricevuti da SAP */
            await manageCoordinamento(jsonCoordinamento);

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
            res.status(status).send(`<ns1:invokeResponse xmlns:ns1="http://cxf.component.camel.apache.org/">
                <Result>
                    <Status>KO</Status>
                    <Message>${errMessage}</Message>
                </Result>
            </ns1:invokeResponse>`);
        }

    });
};
