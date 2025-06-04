const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { manageOpModificheMA } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/OPERATIONS_MA_MARKING_FROM_SAP", authMiddlewareCPI, async (req, res) => {

        try {
            
            console.log("OPERATIONS_MA_MARKING_FROM_SAP= "+JSON.stringify(req.body))
            let jsonOperationsModificheMA = req.body;
            await manageOpModificheMA(jsonOperationsModificheMA.OPERATION_LIST[0] || []);
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
