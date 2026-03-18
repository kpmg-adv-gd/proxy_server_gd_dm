const { authMiddlewareCPI } = require("../../../utility/authMiddlewareCPI");
const { manageUserStatusUnloadPoint } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/iFlow/MANAGE_USER_STATUS_UNLOAD_POINT", authMiddlewareCPI, async (req, res) => {

        try {
            console.log("MANAGE_USER_STATUS_UNLOAD_POINT= "+JSON.stringify(req.body))
            let jsonCustomValues = req.body;
            var result = await manageUserStatusUnloadPoint(jsonCustomValues);
            if (!result.result) throw result.message;
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
            let errMessage = error || error.message || "Internal Server Error";
            console.log("ERROR: "+JSON.stringify(errMessage));
            res.set('Content-Type', 'text/xml; charset=utf-8');
            res.status(200).send(`<ns1:invokeResponse xmlns:ns1="http://cxf.component.camel.apache.org/">
                <Result>
                    <Status>KO</Status>
                    <Message>${errMessage}</Message>
                </Result>
            </ns1:invokeResponse>`);
        }

    });
};
