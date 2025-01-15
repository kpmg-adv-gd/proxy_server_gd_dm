const axios = require("axios");
const credentials = JSON.parse(process.env.CREDENTIALS);

async function dispatch(req,token) {
    let MDOCall = await makeMDOCall(req, token);
    return MDOCall;
};

async function makeMDOCall(req,token) {
    let response = { error: false, code: 0, message: "", data: {} };
    try {
        let mdoService = req.path.replace("/mdo", "");
        let params = "";

        for (let i of Object.keys(req["query"])) {
            if (i != "$format") {
                params += i + "=" + req["query"][i] + "&";
            }
        }
        if (params) {
            params = params.substring(0, params.length - 1);
        }

        console.log("PARAMS= "+params);
        console.log("URL = "+ credentials.DM_API_URL + "/dmci/v2/extractor" + mdoService + "?" + "$format=json" + (params ? "&" + params : "") );
        let mdoPromise = axios({
            url: credentials.DM_API_URL + "/dmci/v4/extractor" + mdoService + "?" + "$format=json" + (params ? "&" + params : ""),
            method: req["method"],
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        let mdoResult = await mdoPromise;
        response["data"] = mdoResult["data"];
        return response;
    } catch (error) {
        response["error"] = true;
        response["code"] = error["response"] ? error["response"]["status"] : 500;
        response["message"] = error["response"] ? error["response"]["statusText"] : error.message;
    } finally {
        return response;
    }
};


module.exports.listenerSetup = (app, getBearerToken) => {
    app.get("/mdo/*", async (req, res) => {
        try {
            // Ottieni il Bearer Token prima di fare la richiesta API
            const token = await getBearerToken();

            let response = await dispatch(req,token);
            if (response["error"]) {
                res.status(response["code"]).send({ message: response["message"] });
            }
            else {
                res.status(200).send(response["data"]);
            }
        }catch(e){
            console.log("Error - "+e);
        }
    });
};
