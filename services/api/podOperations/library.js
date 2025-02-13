function getPodOperations(responseRouting, responseSfcDetails, responseWorkCenter, body){
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
            return obj.stepId!==10 && obj.workCenter && obj.workCenter.workCenter==workcenter && !obj.routingStepGroup;
        });
        //tiro fuori a livello dell'oggeto (stepId) i campi custom
        var enrichedResponseData = filteredResponse.map(function(obj){
            let customValues = obj.routingOperation.customValues;
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
        return enrichedResponseData;

    } catch(error){
        console.log("Internal Server Error:"+error);
        throw { status: 500, message: "Error service getWorkListDataFiltered: "+error};
    }

}

module.exports = { getPodOperations };