const { dispatch } = require("./library");

module.exports.listenerSetup = (app) => {
    app.get("/mdo/*", async (req, res) => {
        try {
            let response = await dispatch(req);
            if (response["error"]) {
                res.status(response["code"]).send({ message: response["message"] });
            }
            else {
                res.status(200).send(response["data"]);
            }
        } catch (e) {
            console.log("Error - " + e);
        }
    });
};
