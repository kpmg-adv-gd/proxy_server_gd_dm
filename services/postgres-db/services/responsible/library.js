const postgresdbService = require('../../connection');
const queryResponsible = require("./queries");

async function getZResponsibleData(plant) {
    const data = await postgresdbService.executeQuery(queryResponsible.getZResponsibleDataQuery, [plant]);
    return data;
}

module.exports = { getZResponsibleData }