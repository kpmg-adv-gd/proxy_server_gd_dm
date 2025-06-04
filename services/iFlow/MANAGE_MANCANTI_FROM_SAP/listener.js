const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { manageNewMancanti } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/MANAGE_MANCANTI_FROM_SAP", authMiddlewareCPI, async (req, res) => {

        try {

            // let jsonMancanti = req.body.Body[0].invoke[0].WBSList[0];
            let jsonMancanti = req.body;
            console.log("MANAGE_MANCANTI_FROM_SAP= "+JSON.stringify(jsonMancanti));
            await manageNewMancanti(jsonMancanti);
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
            console.log("ERROR: "+JSON.stringify(error));
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
