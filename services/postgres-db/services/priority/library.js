const postgresdbService = require('../../connection');
const queryPriority = require("./queries");

async function getZPriorityData(plant) {
    const data = await postgresdbService.executeQuery(queryPriority.getZPriorityDataQuery, [plant]);
    return data;
}

module.exports = { getZPriorityData }