const { getPlantFromERPPlant } = require("../../../utility/MappingPlant");
const { callGet, callPut } = require("../../../utility/CommonCallApi");
const { insertZMarkingRecap } = require("../../postgres-db/services/marking/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageReceiveConfirmationNumber(jsonResponse) {
    var plant = await getPlantFromERPPlant(jsonResponse.plant);
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
        var steps = responseRouting[0].routingSteps;
        for (let n = 0; n < operations.length; n++) {
            var currentOperation = operations[n];
            for (let m = 0; m < steps.length; m++) {
                if (steps[m].routingOperation && steps[m].routingOperation.operationActivity.operationActivity == currentOperation.operation) {
                    var customValues = steps[m].routingOperation.customValues;
                    var confirmationNumberIndex = customValues.findIndex(obj => obj.attribute == "CONFIRMATION_NUMBER");
                    if (confirmationNumberIndex != -1) {
                        customValues[confirmationNumberIndex].value = currentOperation.confirmationNumber;
                    } else {
                        customValues.push({ attribute: "CONFIRMATION_NUMBER", value: currentOperation.confirmationNumber });
                    }
                }
            }
            // Scrivo in z_marking_recap per ogni operazione
            await insertZMarkingRecap(plant, jsonResponse.Orders[k].project, jsonResponse.Orders[k].wbe, currentOperation.operation, jsonResponse.Orders[k].order, currentOperation.confirmationNumber, currentOperation.duration, 
                currentOperation.uomDuration, 0, currentOperation.uomDuration, currentOperation.duration, currentOperation.uomDuration, 0, currentOperation.uomDuration, currentOperation.operationDescription, false)
        }
        // Step 4. aggiorno routing
        var urlUpdateRouting = hostname + "/routing/v1/routings";
        await callPut(urlUpdateRouting, responseRouting);
    }
    // Tutto ok!
    return { result: true, message: "Custom Values managed successfully" };
}

module.exports = { manageReceiveConfirmationNumber }