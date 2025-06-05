const postgresdbService = require('../../connection');
const queryCoding = require("./queries");

async function getZCodingData(){
    const data = await postgresdbService.executeQuery(queryCoding.getZCodingDataQuery, []);
    return data;
}

module.exports = { getZCodingData }