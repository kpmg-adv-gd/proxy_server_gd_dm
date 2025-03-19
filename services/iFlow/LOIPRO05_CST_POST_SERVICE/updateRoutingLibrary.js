const { callGet, callPut } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const xpath = require("xpath");

async function manageRouting(docXml){
    var routingNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ManufacturingOrder']", docXml);
    var routingValue = routingNode.length > 0 ? routingNode[0].textContent : null;
    var plantNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='ProductionPlant']", docXml);
    var plantValue = plantNode.length > 0 ? plantNode[0].textContent : null;
    var isMachNode = xpath.select("//*[local-name()='ManufacturingOrder']/*[local-name()='IsMach']", docXml);
    var isMachvalue = isMachNode.length > 0 ? isMachNode[0].textContent : null;
    var stepIdOpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='ManufacturingOrderOperation']", docXml);
    var macrofaseOpNodes = xpath.select("//*[local-name()='ManufacturingOrderActivityNetworkElement']/*[local-name()='OperationCustomFields']/*[local-name()='MACROFASE']", docXml);
    var responseGetRouting = await getRoutingResponse(routingValue,plantValue);
    if(isMachvalue=="MACH"){
        await doUpdateMachRouting(responseGetRouting,stepIdOpNodes,macrofaseOpNodes);
    } else{
        await doUpdateNoMachRouting(responseGetRouting,stepIdOpNodes,macrofaseOpNodes);
    }

}
async function getRoutingResponse(routing, plant) {
    return new Promise((resolve, reject) => {
        var url = hostname + "/routing/v1/routings?type=SHOP_ORDER&plant=" + encodeURIComponent(plant) + "&routing=" + encodeURIComponent(routing) + "&version=ERP001"; // URL dell'API
        
        setTimeout(() => {
            callGet(url).then(response => {
                resolve(response); // Restituisci la risposta quando la chiamata è completa
            }).catch(error => {
                console.error("Errore nella chiamata:", error);
                reject(error); // Rifiuta la Promise in caso di errore
            });
        }, 5000); // Pausa di 3 secondi
    });
}
// async function getRoutingResponse(routing,plant){

//     var url = hostname + "/routing/v1/routings?type=SHOP_ORDER&plant=" + encodeURIComponent(plant) + "&routing=" + encodeURIComponent(routing) + "&version=ERP001"; // URL dell'API
//     var response = await callGet(url);
//     console.log("url= "+url);
//     console.log("response= "+response);
//     return response;
// }

async function doUpdateMachRouting(responseGetRouting,stepIdOpNodes,macrofaseOpNodes){
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
    firstSimultaneousRoutingStep.routingStepGroup.routingStepGroupStepList = getRoutingStepsByMacrofase("MF4",stepIdOpNodes,macrofaseOpNodes);
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
    secondSimultaneousRoutingStep.routingStepGroup.routingStepGroupStepList = getRoutingStepsByMacrofase("MF5",stepIdOpNodes,macrofaseOpNodes);
    //Setto a false il campo entry per il primo routingSteps (che diventerà il terzo)
    responseGetRouting[0].routingSteps[0].entry = false;
    //Elimino in uttti i routingstep il campo nextStepList
    responseGetRouting[0].routingSteps.forEach(obj => delete obj.nextStepList);
    //Li aggiungo in routingSteps all'inizio
    responseGetRouting[0].routingSteps.unshift(secondSimultaneousRoutingStep);
    responseGetRouting[0].routingSteps.unshift(firstSimultaneousRoutingStep);

    let responseUpdateRouting = await updateRoutingSimultaneous(responseGetRouting);
    console.log("AM BODY ROUTING - "+JSON.stringify(responseGetRouting));
}

async function doUpdateNoMachRouting(responseGetRouting,stepIdOpNodes,macrofaseOpNodes){
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
    firstSimultaneousRoutingStep.routingStepGroup.routingStepGroupStepList = getRoutingStepsByMacrofase(null,stepIdOpNodes,macrofaseOpNodes);
    //Setto a false il campo entry per il primo routingSteps (che diventerà il secondo)
    responseGetRouting[0].routingSteps[0].entry = false;
    //Elimino in uttti i routingstep il campo nextStepList
    responseGetRouting[0].routingSteps.forEach(obj => delete obj.nextStepList);
    //Lo aggiungo in routingSteps all'inizio
    responseGetRouting[0].routingSteps.unshift(firstSimultaneousRoutingStep);

    let responseUpdateRouting = await updateRoutingSimultaneous(responseGetRouting);
}

function getRoutingStepsByMacrofase(macrofase,stepIdOpNodes,macrofaseOpNodes){
    var resultArray = [];
    var sequence = 0;
    //controllo la macrofase solo per i routing (gli ordini) macchina
    if(macrofase){
        stepIdOpNodes.forEach((stepNode, index) => {
            let macrofaseValue = macrofaseOpNodes[index].textContent; // Prendi il valore di macrofase corrispondente
        
            if (macrofaseValue === macrofase) {
                let stepId = stepNode.textContent; // Estrarre stepId dal nodo
                resultArray.push({
                    "routingStep": { "stepId": stepId },
                    "sequence": sequence++
                });
            }
        });
    } else { //per gli altri routing (ordini) metto tutte le operazioni nell'unico simultaneous
        stepIdOpNodes.forEach((stepNode, index) => {
            let stepId = stepNode.textContent; // Estrarre stepId dal nodo
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
    console.log("UPDATE ROUTING: "+response);
    return response;
}

module.exports = { manageRouting };




