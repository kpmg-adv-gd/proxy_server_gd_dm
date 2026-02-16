const postgresdbService = require('../../connection');
const queryPriority = require("./queries");

async function getMappingPhase(plant, operationMacroPhase){
    const data = await postgresdbService.executeQuery(queryPriority.getMappingPhaseQuery, [plant, operationMacroPhase]);
    return data;
}

module.exports = { getMappingPhase }