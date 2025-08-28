const postgresdbService = require('../../connection');
const queryVariance = require("./queries");

async function getMacroPhase(plant) {
    const data = await postgresdbService.executeQuery(queryVariance.getMacroPhaseQuery(plant));
    return data;
}

module.exports = { getMacroPhase }