const postgresdbService = require('../../connection');
const queryReportWeights = require("./queries");

async function getReportWeight(report) {
    const data = await postgresdbService.executeQuery(queryReportWeights.getReportWeight);
    return data;
}

module.exports = { getReportWeight }