const postgresdbService = require('../../connection');
const queryCoding = require("./queries");

async function getZCodingData(plant){
    const data = await postgresdbService.executeQuery(queryCoding.getZCodingDataQuery, [plant]);
    return data;
}

module.exports = { getZCodingData }