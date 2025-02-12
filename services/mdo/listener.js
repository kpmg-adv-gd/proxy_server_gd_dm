const { dispatch } = require("./library");

module.exports.listenerSetup = (app, getBearerToken) => {
    app.get("/mdo/*", async (req, res) => {
        try {
            // Ottieni il Bearer Token prima di fare la richiesta API
            const token = await getBearerToken();

            let response = await dispatch(req, token);
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
