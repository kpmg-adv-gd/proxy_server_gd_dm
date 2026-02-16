function getPodOperations(responseRouting, responseSfcDetails, responseWorkCenter, orderType, body){
    try{
        const { workcenter, routing, version } = body;
        if ( responseRouting.length>0 && responseRouting[0].routingSteps && responseSfcDetails.steps && responseWorkCenter.length>0 ){
            responseRoutingSteps=responseRouting[0].routingSteps;
            responseSfcDetailsSteps=responseSfcDetails.steps;
            responseWorkCenter=responseWorkCenter[0];
        } else {
            return [];
        }
        var resource = (responseWorkCenter?.members?.length > 0 && responseWorkCenter.members[0]?.resource?.resource) || "DEFAULT";

        //Inserisco i dettagli delle quantity dell'operaione in responseRouting
        responseRoutingSteps.forEach(stepRouting => {
            const matchingStep = responseSfcDetailsSteps.find(objSfc => ( objSfc.stepId === stepRouting.stepId && objSfc.stepRouting.routing === routing && objSfc.stepRouting.version === version ));
            if (matchingStep) {
                stepRouting.QUANTITY = {
                    "quantityDone": matchingStep.quantityDone,
                    "quantityScrapped" : matchingStep.quantityScrapped,
                    "quantityRejected" : matchingStep.quantityRejected,
                    "quantityInQueue" : matchingStep.quantityInQueue,
                    "quantityInWork" : matchingStep.quantityInWork,
                    "quantityCompletePending" : matchingStep.quantityCompletePending,
                    "stepDone" : matchingStep.stepDone
                }
            }
            stepRouting.RESOURCE=resource;
        });
        //escludo lo stepId 10 se c'è e le operazione in un altro workcenter
        var filteredResponse = responseRoutingSteps.filter(function(obj) {
            return !obj.routingStepGroup;
        });
        //tiro fuori a livello dell'oggeto (stepId) i campi custom
        var enrichedResponseData = filteredResponse.map(function(obj){
            let customValues = obj?.routingOperation?.customValues || [];
            for (let customObj of customValues) {
                // Controlla se customObj ha 'attribute' e 'value' per aggiungere tutti i campi custom agli oggetti che ritorniamo
                if (customObj.attribute && customObj.value) {
                    let attribute = customObj.attribute.replace(/\s+/g, '');
                    obj[attribute] = customObj.value;
                }
            }
            obj.sfcStatus= responseSfcDetails?.status?.code || "";
            return obj; // Restituisci l'oggetto modificato
        })

        //Nel caso degli ordini macchina ordino per Macrofase le operazioni
        if(orderType=="MACH"){
            enrichedResponseData.sort((objA, objB) => {
                let customValuesA = objA?.routingOperation?.customValues;
                let customValuesB = objB?.routingOperation?.customValues;
                let macrofaseAField = customValuesA.find(obj => obj.attribute == "MF");
                let macrofaseBField = customValuesB.find(obj => obj.attribute == "MF");
                let macrofaseA = macrofaseAField?.value || "MF0";
                let macrofaseB = macrofaseBField?.value || "MF0";
                return macrofaseA.localeCompare(macrofaseB);
            });
        }
        return enrichedResponseData;

    } catch(error){
        console.log("Internal Server Error:"+error);
        throw { status: 500, message: "Error service getPodOperations: "+error};
    }

}

function getPodOperationsTI(responseRouting){
    try{
        var operations = [];
        if (responseRouting.length==0 || !responseRouting[0].routingOperationGroups){
            return operations;
        }
        responseRouting[0].routingOperationGroups.forEach(group => {
            group.routingOperationGroupSteps.forEach(operation => {
                operations.push({
                    id: operation.routingStep.stepId,
                    operation: operation.routingStep.routingOperation.operationActivity.operationActivity,
                    description: operation.routingStep.description,
                });
            });
        });
        // Ordino le operazioni per id
        operations.sort((a, b) => a.id - b.id);
        return operations;

    } catch(error){
        console.log("Internal Server Error:"+error);
        throw { status: 500, message: "Error service getPodOperationsTI: "+error};
    }
}


module.exports = { getPodOperations, getPodOperationsTI };