const postgresdbService = require('../../connection');
const queryWC = require("./queries");

async function getInternalWorkcenters(plant){
    const data = await postgresdbService.executeQuery(queryWC.getInternalWorkcentersQuery, [plant]);
    return data;
}

module.exports = { getInternalWorkcenters }