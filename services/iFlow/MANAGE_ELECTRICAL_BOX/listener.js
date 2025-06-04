const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { manageElectricalBoxes } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/MANAGE_ELECTRICAL_BOX", authMiddlewareCPI, async (req, res) => {

        try {
            
            console.log("MANAGE_ELECTRICAL_BOX= "+JSON.stringify(req.body))
            let jsonElectricalBox = req.body;
            await manageElectricalBoxes(jsonElectricalBox.ELECTRICAL_BOX_LIST[0] || []);
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
