const postgresdbService = require('../../connection');
const queryResponsible = require("./queries");

async function getZResponsibleData(){
    const data = await postgresdbService.executeQuery(queryResponsible.getZResponsibleDataQuery, []);
    return data;
}

module.exports = { getZResponsibleData }