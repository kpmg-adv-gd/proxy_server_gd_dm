const postgresdbService = require('../../connection');
const queryReportWeights = require("./queries");

async function getReportWeight(report, plant) {
    const data = await postgresdbService.executeQuery(queryReportWeights.getReportWeight, [report, plant]);
    return data;
}

module.exports = { getReportWeight }