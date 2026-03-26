const { json } = require("express");
const { dispatch } = require("../../mdo/library");
const { callPatch } = require("../../../utility/CommonCallApi");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const plantMappingCache = new Map();

async function manageReceiveConfirmationNumber(jsonResponse) {
    for (let k = 0; k < jsonResponse.Orders.length; k++) {
        var operations = jsonResponse.Orders[k].operations;
        // Step 1. chiamo api sfcdetails
        var urlSfcDetail = hostname + "/sfc/v1/sfcdetail?plant=" + plant + "&sfc=" + jsonResponse.Orders[k].sfc;
        var responseGetSfc = await callGet(urlSfcDetail);
        var routing = responseGetSfc.routing.routing;
        var routingVersion = responseGetSfc.routing.version;
        var typeRouting = responseGetSfc.routing.type == "SHOPORDER_SPECIFIC" ? "SHOP_ORDER" : responseGetSfc.routing.type;
        // Step 2. chiamo api get routing - salvo il JSON a cui dovrò modificare i campi custom
        var urlRouting = hostname + "/routing/v1/routings?plant=" + plant + "&routing=" + routing + "&type=" + typeRouting + "&version=" + routingVersion;
        var responseRouting = await callGet(urlRouting);
        // Step 3. Nel JSON recuperato, va aggiornato il campo custom ‘CONFIRMATION NUMBER’ per tutte le operazioni dell’SFC recuperate prima dello STEP 1
        var routingData = responseRouting.routing;
        var steps = routingData.routingSteps;
        for (let n = 0; n < operations.length; n++) {
            var currentOperation = operations[n];
            for (let m = 0; m < steps.length; m++) {
                if (steps[m].routingOperation.operationActivity.operationActivity == currentOperation.operation) {
                    var customValues = steps[m].routingOperation.customValues;
                    var confirmationNumberIndex = customValues.findIndex(obj => obj.attribute == "CONFIRMATION_NUMBER");
                    if (confirmationNumberIndex != -1) {
                        customValues[confirmationNumberIndex].value = currentOperation.confirmationNumber;
                    } else {
                        customValues.push({ attribute: "CONFIRMATION_NUMBER", value: currentOperation.confirmationNumber });
                    }
                }
            }
        }
        // Step 4. aggiorno routing
        var urlUpdateRouting = hostname + "/routing/v1/routings";
        await callPut(urlUpdateRouting, responseRouting);
    }
    // Tutto ok!
    return { result: true, message: "Custom Values managed successfully" };
}

module.exports = { manageReceiveConfirmationNumber }