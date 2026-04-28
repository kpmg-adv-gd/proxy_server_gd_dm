const postgresdbService = require('../../connection');
const queryVariance = require("./queries");

async function getReasonsForVariance(plant){ 
    const data = await postgresdbService.executeQuery(queryVariance.getReasonsForVarianceQuery, [plant]);
    return data;
}

module.exports = { getReasonsForVariance }