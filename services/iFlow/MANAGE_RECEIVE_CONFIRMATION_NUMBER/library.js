const { getPlantFromERPPlant } = require("../../../utility/MappingPlant");
const { callGet, callPut } = require("../../../utility/CommonCallApi");
const { insertZMarkingRecap } = require("../../postgres-db/services/marking/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageReceiveConfirmationNumber(jsonResponse) {
    var plant = await getPlantFromERPPlant(jsonResponse.plant);
    for (let k = 0; k < jsonResponse.orders.length; k++) {
        var operations = jsonResponse.orders[k].operations;
        // Step 1. chiamo api sfcdetails
        var urlSfcDetail = hostname + "/sfc/v1/sfcdetail?plant=" + plant + "&sfc=" + jsonResponse.orders[k].sfc;
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
                        customValues[confirmationNumberIndex].value = currentOperation.confirmation_number;
                    } else {
                        customValues.push({ attribute: "CONFIRMATION_NUMBER", value: currentOperation.confirmation_number });
                    }
                }
            }
            // Scrivo in z_marking_recap per ogni operazione
            try {
                await insertZMarkingRecap(plant, jsonResponse.orders[k].project, jsonResponse.orders[k].wbe, currentOperation.operation, jsonResponse.orders[k].order, currentOperation.confirmation_number, currentOperation.duration, 
                    currentOperation.uom_duration, 0, currentOperation.uom_duration, currentOperation.duration, currentOperation.uom_duration, 0, currentOperation.uom_duration, currentOperation.operation_description, false)
            } catch (error) {
                console.log("Errore inserimento Z_MARKING_RECAP: " + error);
            }
        }
        // Step 4. aggiorno routing
        try {
            var urlUpdateRouting = hostname + "/routing/v1/routings";
            await callPut(urlUpdateRouting, responseRouting);
        } catch (error) {
            console.log("Errore aggiornamento routing: " + error);
        }
    }
    // Tutto ok!
    return { result: true, message: "Custom Values managed successfully" };
}

module.exports = { manageReceiveConfirmationNumber }