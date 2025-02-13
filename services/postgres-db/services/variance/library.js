const postgresdbService = require('../../connection');
const queryVariance = require("./queries");

async function getReasonForVariance() {
    const data = await postgresdbService.executeQuery(queryVariance.getReasonsForVarianceQuery);
    return data;
}

module.exports = { getReasonForVariance }