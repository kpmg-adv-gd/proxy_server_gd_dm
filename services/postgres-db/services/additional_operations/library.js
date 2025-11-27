const postgresdbService = require('../../connection');
const queryAdditionalOperations = require("./queries");
const { dispatch } = require("../../../mdo/library");
const { callGet, callPost } = require("../../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getAdditionalOperations(plant, order) {
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    var commessa = orderResponse.customValues.filter(item => item.attribute == "COMMESSA")[0]?.value;

    if (!commessa) return [];
    const data = await postgresdbService.executeQuery(queryAdditionalOperations.getAdditionalOperationsQuery, [plant, commessa]);
    return data;
}

async function startAdditionalOperation(plant, sfc, operation, phase) {
    try {
        var data = await postgresdbService.executeQuery(queryAdditionalOperations.getInfoAdditionalOperation, [plant, sfc, operation, phase]);
        if (data.length == 0 || data[0].status == 'In Work') {
            return { result: false, message: "Operation already started." };
        } else if (data[0].status == 'Done') {
            return { result: false, message: "Operation already done." };
        }
        // start standard operation
        var url = hostname+"/sfc/v1/sfcs/start";
        var params = {
            "plant": plant,
            "operation": operation,
            "resource": "DEFAULT",
            "sfcs": [sfc]
        };
        await callPost(url,params);
        console.log("STANDARD START FATTO")
        await postgresdbService.executeQuery(queryAdditionalOperations.startAdditionalOperation, [plant, sfc, operation, phase]);
        console.log("CUSTOM START FATTO")
        return { result: true, message: "Operation started successfully." };
    } catch (error) {
        return { result: false, message: error.message };
    }
}

async function completeAdditionalOperation(plant, sfc, operation, phase) {
    try {
        var data = await postgresdbService.executeQuery(queryAdditionalOperations.getInfoAdditionalOperation, [plant, sfc, operation, phase]);
        if (data.length == 0 || data[0].status == 'New') {
            return { result: false, message: "Operation is not started yet." };
        } else if (data[0].status == 'Done') {
            return { result: false, message: "Operation already done." };
        }
        // complete standard operation
        var url = hostname+"/sfc/v1/sfcs/complete";
        var params = {
            "plant": plant,
            "operation": operation,
            "resource": "DEFAULT",
            "sfcs": [sfc]
        };
        await callPost(url,params);
        await postgresdbService.executeQuery(queryAdditionalOperations.completeAdditionalOperation, [plant, sfc, operation, phase]);
        return { result: true, message: "Operation started successfully." };
    } catch (error) {
        return { result: false, message: error.message };
    }
}

async function updateNonConformanceAdditionalOperation(plant, sfc, operation) {
    try {
        await postgresdbService.executeQuery(queryAdditionalOperations.updateNonConformanceAdditionalOperation, [plant, sfc, operation]);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = { getAdditionalOperations, startAdditionalOperation, completeAdditionalOperation, updateNonConformanceAdditionalOperation };