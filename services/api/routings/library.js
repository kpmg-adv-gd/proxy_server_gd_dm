function getCustomDataFromRoutingStepData(responseData, stepId){
    let routingSteps = responseData.routingSteps;
    let responseCustomValues  = {};

    for(let routing of routingSteps){
        if (routing.stepId==stepId){
            if(routing.routingOperation.customValues){
                for(let obj of routing.routingOperation.customValues){
                    responseCustomValues[obj.attribute] = obj.value;
                }
            }
        }
    }
    return responseCustomValues
}

// Esporta la funzione
module.exports = { getCustomDataFromRoutingStepData };