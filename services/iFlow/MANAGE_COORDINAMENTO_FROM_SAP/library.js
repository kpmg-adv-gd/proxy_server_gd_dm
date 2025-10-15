const { callGet, callPatch } = require("../../../utility/CommonCallApi");
const { receiveCoordinamento } = require("../../postgres-db/services/unproductive/library");

const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

const orderCache = new Map();
const plantMappingCache = new Map();

async function manageCoordinamento(jsonCoordinamento) {

    try {
        // todo sviluppare la logica per gestire i coordinamenti, non appena abbiamo json esempio inviato da SAP
        await receiveCoordinamento(jsonCoordinamento);
    } catch (e) {
        console.error("error receiveCoordinamento: " + JSON.stringify(jsonCoordinamento));
    }

}

module.exports = { manageCoordinamento }


