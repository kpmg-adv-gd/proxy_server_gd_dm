const axios = require("axios");
const { getBearerToken } = require("../../utility/BearerToken");
const credentials = JSON.parse(process.env.CREDENTIALS);

async function dispatch(req) {
    let token = await getBearerToken();
    let MDOCall = await makeMDOCall(req, token);
    return MDOCall;
};

async function makeMDOCall(req, token) {
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

        console.log("PARAMS= " + params);
        console.log("URL = " + credentials.DM_API_URL + "/dmci/v2/extractor" + mdoService + "?" + "$format=json" + (params ? "&" + params : ""));
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

// Esporta la funzione
module.exports = { dispatch };