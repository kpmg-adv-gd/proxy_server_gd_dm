const postgresdbService = require('../../connection');
const queryLog = require("./queries");

async function logStartOperation(plant, sfc, operation, user, order, routing, routingVersion, material, parentMaterial, stepId, workCenter, project, wbe, machineSection){
    const data = await postgresdbService.executeQuery(queryLog.logStartOperationQuery, [plant, sfc, operation, user, order, routing, routingVersion, material, parentMaterial, stepId, workCenter, project, wbe, machineSection]);
    return data;
}

async function logCompleteOperation(plant, sfc, operation, user){
    const data = await postgresdbService.executeQuery(queryLog.logCompleteOperationQuery, [plant, sfc, operation, user]);
    return data;
}

module.exports = { logStartOperation, logCompleteOperation }