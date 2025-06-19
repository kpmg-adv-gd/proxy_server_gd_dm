const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { receiveApproveDefectQN } = require("../../postgres-db/services/defect/library");

const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const orderCache = new Map();
const plantMappingCache = new Map();

async function manageApprovalDefects(jsonDefects) {

    try {
        await receiveApproveDefectQN(jsonDefects);
    } catch (e) {
        console.error("error manageApprovalDefects: " + JSON.stringify(jsonDefects));
    }

}

module.exports = { manageApprovalDefects }


