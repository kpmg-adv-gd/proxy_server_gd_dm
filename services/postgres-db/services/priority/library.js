const postgresdbService = require('../../connection');
const queryPriority = require("./queries");

async function getZPriorityData(){
    const data = await postgresdbService.executeQuery(queryPriority.getZPriorityDataQuery, []);
    return data;
}

module.exports = { getZPriorityData }