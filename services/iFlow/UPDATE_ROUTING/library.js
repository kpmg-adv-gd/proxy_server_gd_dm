const { callGet, callPut } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function manageRouting(plantValue,order,routingRef,bomRef,customValues){ 

    //RouterBO:GD03,DM0000000295,H,ERP001
    var responseGetRouting = await getRoutingResponse(order,plantValue);
    let phaseField= customValues.find(obj => obj.attribute == "PHASE");
    let phaseValue = phaseField ? phaseField.value : "";
    //NEl testing dobbiamo skippare l'aggiornamento del routing
    if(phaseValue=="TESTING"){
        return;
    }
    let orderTypeField= customValues.find(obj => obj.attribute == "ORDER_TYPE");
    let orderTypeValue = orderTypeField.value || "";

    let routingSteps = [];
    if(responseGetRouting && responseGetRouting.length>0){
        routingSteps = responseGetRouting[0].routingSteps;
    }

    if(orderTypeValue=="MACH"){
        // await doUpdateMachRouting(responseGetRouting,routingSteps); //per gli ordini macchina creavamo il routing con 2 simultaneous all'interno
        await doUpdateNoMachRouting(responseGetRouting,routingSteps);
    } else{
        await doUpdateNoMachRouting(responseGetRouting,routingSteps);
    }

}

async function getRoutingResponse(routing,plant){

    var url = hostname + "/routing/v1/routings?type=SHOP_ORDER&plant=" + encodeURIComponent(plant) + "&routing=" + encodeURIComponent(routing) + "&version=ERP001"; // URL dell'API
    var response = await callGet(url);
    return response;
}

async function doUpdateMachRouting(responseGetRouting,routingSteps){
    //Il campo entryRoutingStepId deve essere 10
    responseGetRouting[0].entryRoutingStepId="0010";
    // Aggiungo i 2 routing step identificativi del simultanoues
    var firstSimultaneousRoutingStep = {
        "stepId": "0010",
        "sequence": 10,
        "description": "Piazzamento in Macchina",
        "entry": true,
        "routingStepGroup": {
          "routingStep": {
            "stepId": "0010"
          },
          "routingStepGroupType": "SIMULTANEOUS_ORDER_GROUP",
          "routingStepGroupStepList": []
        },
        "lastReportingStep": false,
        "rework": false,
        "queueDecisionType": "COMPLETING_OPERATOR",
        "nextStepList": [
          "0020"
        ],
        "routingStepComponentList": []
    };
    firstSimultaneousRoutingStep.routingStepGroup.routingStepGroupStepList = getRoutingStepsByMacrofase("MF4",routingSteps);
    var secondSimultaneousRoutingStep = {
        "stepId": "0020",
        "sequence": 20,
        "description": "Chiusura Macchina",
        "entry": false,
        "routingStepGroup": {
          "routingStep": {
            "stepId": "0020"
          },
          "routingStepGroupType": "SIMULTANEOUS_ORDER_GROUP",
          "routingStepGroupStepList": []
        },
        "lastReportingStep": true,
        "rework": false,
        "queueDecisionType": "COMPLETING_OPERATOR",
        "routingStepComponentList": []
    };
    secondSimultaneousRoutingStep.routingStepGroup.routingStepGroupStepList = getRoutingStepsByMacrofase("MF5",routingSteps);
    //Setto a false il campo entry per il primo routingSteps (che diventerà il terzo)
    responseGetRouting[0].routingSteps[0].entry = false;
    //Elimino in uttti i routingstep il campo nextStepList
    responseGetRouting[0].routingSteps.forEach(obj => delete obj.nextStepList);
    //Li aggiungo in routingSteps all'inizio
    responseGetRouting[0].routingSteps.unshift(secondSimultaneousRoutingStep);
    responseGetRouting[0].routingSteps.unshift(firstSimultaneousRoutingStep);

    delete responseGetRouting[0].routingOperationGroups;

    let responseUpdateRouting = await updateRoutingSimultaneous(responseGetRouting);
    console.log("AM BODY ROUTING - "+JSON.stringify(responseGetRouting));
}

async function doUpdateNoMachRouting(responseGetRouting,routingSteps){
    //Il campo entryRoutingStepId deve essere 10
    responseGetRouting[0].entryRoutingStepId="0010";
    // Aggiungo i 2 routing step identificativi del simultanoues
    var firstSimultaneousRoutingStep = {
        "stepId": "0010",
        "sequence": 10,
        "description": "Simultaneous Group",
        "entry": true,
        "routingStepGroup": {
          "routingStep": {
            "stepId": "0010"
          },
          "routingStepGroupType": "SIMULTANEOUS_ORDER_GROUP",
          "routingStepGroupStepList": []
        },
        "lastReportingStep": false,
        "rework": false,
        "queueDecisionType": "COMPLETING_OPERATOR",
        "routingStepComponentList": []
    };
    firstSimultaneousRoutingStep.routingStepGroup.routingStepGroupStepList = getRoutingStepsByMacrofase(null,routingSteps);
    //Setto a false il campo entry per il primo routingSteps (che diventerà il secondo)
    responseGetRouting[0].routingSteps[0].entry = false;
    //Elimino in uttti i routingstep il campo nextStepList
    responseGetRouting[0].routingSteps.forEach(obj => delete obj.nextStepList);
    //Lo aggiungo in routingSteps all'inizio
    responseGetRouting[0].routingSteps.unshift(firstSimultaneousRoutingStep);

    delete responseGetRouting[0].routingOperationGroups;
    
    console.log("Body updateRoutingSimultaneous= "+JSON.stringify(responseGetRouting[0]));
    let responseUpdateRouting = await updateRoutingSimultaneous(responseGetRouting);
}

function getRoutingStepsByMacrofase(macrofase,routingSteps){
    var resultArray = [];
    var sequence = 0;
    //controllo la macrofase solo per i routing (gli ordini) macchina
    if(macrofase){
        routingSteps.forEach( (step) => {
            let macrofaseField = step?.routingOperation?.customValues?.find(obj => obj.attribute == "MF"); // Prendi il valore di macrofase corrispondente
            let macrofaseValue = macrofaseField.value || "";
            if (macrofase === macrofaseValue) {
                let stepId = step.stepId; // Estrarre stepId dal nodo
                resultArray.push({
                    "routingStep": { "stepId": stepId },
                    "sequence": sequence++
                });
            }
        });
    } else { //per gli altri routing (ordini) metto tutte le operazioni nell'unico simultaneous
        routingSteps.forEach( (step) => {
            let stepId = step.stepId; // Estrarre stepId dal nodo
            resultArray.push({
                "routingStep": { "stepId": stepId },
                "sequence": sequence++
            });
        });
    }
    return resultArray;
}

async function updateRoutingSimultaneous(bodyUpdateRouting){
    let url = hostname + "/routing/v1/routings";
    let response = await callPut(url,bodyUpdateRouting);
    return response;
}

async function updateRoutingForReleaseUtility(plant, routing) {
    var responseGetRouting = await getRoutingResponse(routing, plant);
    let routingSteps = [];
    if (responseGetRouting && responseGetRouting.length > 0) {
        routingSteps = responseGetRouting[0].routingSteps;
    }
    console.log("UPDATE ROUTING FOR RELEASE - Routing: " + routing + " - Plant: " + plant);
    console.log("Routing stampa: " + JSON.stringify(responseGetRouting));
    await doUpdateNoMachRouting(responseGetRouting, routingSteps);
}

module.exports = { manageRouting, updateRoutingForReleaseUtility };