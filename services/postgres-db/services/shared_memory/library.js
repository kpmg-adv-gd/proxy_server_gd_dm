const postgresdbService = require('../../connection');
const queryModifiche = require("./queries");

async function getZSharedMemoryData(plant, key){
    const data = await postgresdbService.executeQuery(queryModifiche.getZSharedMemoryDataQuery, [plant, key]);
    return data;
}

module.exports = { getZSharedMemoryData }