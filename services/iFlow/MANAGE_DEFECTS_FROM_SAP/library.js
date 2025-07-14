const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { receiveStatusByQNCode } = require("../../postgres-db/services/defect/library");

const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const orderCache = new Map();
const plantMappingCache = new Map();

async function manageStatusDefects(jsonDefects) {

    try {
        await receiveStatusByQNCode(jsonDefects);
    } catch (e) {
        console.error("error receiveStatusByQNCode: " + JSON.stringify(jsonDefects));
    }

}

module.exports = { manageStatusDefects }


