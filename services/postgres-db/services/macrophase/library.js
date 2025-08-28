const postgresdbService = require('../../connection');
const queryMacroPhase = require("./queries");

async function getMacroPhase(plant) {
    const data = await postgresdbService.executeQuery(queryMacroPhase.queryMacroPhaseQuery, [plant]);
    return data;
}

module.exports = { getMacroPhase }