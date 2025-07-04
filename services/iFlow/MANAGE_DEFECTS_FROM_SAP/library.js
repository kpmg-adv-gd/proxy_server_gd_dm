const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { receiveStatusDefectQN } = require("../../postgres-db/services/defect/library");

const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const orderCache = new Map();
const plantMappingCache = new Map();

async function manageApprovalDefects(jsonDefects) {

    try {
        await receiveStatusDefectQN(jsonDefects);
    } catch (e) {
        console.error("error receiveStatusDefectQN: " + JSON.stringify(jsonDefects));
    }

}

module.exports = { manageApprovalDefects }


