const { orderTypeMapping } = require("../../../utility/models");

function getWorkListDataFiltered(response,body){
    const { workcenter, sfc, material, project, wbs, machineSection, parentMaterial } = body;

    try{
        if(response.length == 0) return response;
        var filteredResponse = response.filter(function(obj) {
            let sfcCondition = true; 
            let materialCondition = true;
            let projectCondition = true;
            let wbsCondition = true;
            let machineSectionCondition = true;
            let parentMaterialCondition = true;

            // Se ha campo custom del Testing (PHASE = "Testing"), escludo l'elemento
            if (obj.customValues.some(customObj => customObj.attribute === "PHASE" && customObj.value === "Testing")) {
                return false;
            }

            let customValues = obj.customValues;
            if (!!sfc) {
                sfcCondition = obj.sfc.toUpperCase().includes(sfc.toUpperCase());
            }
            if (!!material) {
                materialCondition = obj.material.material.toUpperCase().includes(material.toUpperCase());
            }
            if (!!project) {
                projectCondition = customValues.some(customObj => customObj.attribute === "COMMESSA" && customObj.value.toUpperCase().includes(project.toUpperCase()));
            }
            if (!!wbs) {
                wbsCondition = customValues.some(customObj => customObj.attribute === "WBE" && customObj.value.toUpperCase().includes(wbs.toUpperCase()));
            }
            if (!!machineSection) {
                machineSectionCondition = customValues.some(customObj => customObj.attribute === "SEZIONE MACCHINA" && customObj.value.toUpperCase().includes(machineSection.toUpperCase()));
            }
            if (!!parentMaterial) {
                parentMaterialCondition = customValues.some(customObj => customObj.attribute === "MATERIALE PADRE" && customObj.value.toUpperCase().includes(parentMaterial.toUpperCase()));
            }

            // Restituisci true (ritorno l'oggetto) solo se tutte le condizioni sono rispettate
            return sfcCondition && materialCondition && projectCondition && wbsCondition && machineSectionCondition && parentMaterialCondition;
        });
        //Arricchisco tutti gli ordini (sfc) con i campi custom per gestirli da front-end
        var managedResponse = filteredResponse.map(function(obj) {
            //aggiungo il workcenter
            obj.WORKCENTER= workcenter;
            for (let customObj of obj.customValues) {
                // Controlla se customObj ha 'attribute' e 'value' per aggiungere tutti i campi custom agli oggetti che ritorniamo
                if (customObj && customObj?.attribute && customObj?.value) {
                    let attribute = customObj.attribute.replace(/\s+/g, '');
                    obj[attribute] = customObj.value;
                    //Per il tooltip sull'order type front-end
                    if(attribute=="ORDER_TYPE"){
                        obj["ORDER_TYPE_DESC"]= orderTypeMapping[customObj.value] || "";
                    }
                }
            }
            return obj; // Restituisci l'oggetto modificato
        });

        //Resituisco solo gli ordini di assembly non inviati al testing
        var filteredResponse = managedResponse.filter(function(obj) {
            return obj["PHASE"] !== "TESTING" && obj["SENT_TO_TESTING"] !== "true" && obj["MACHINE_ASSEMBLY_COMPLETED"] !== "true";
        });

        return filteredResponse;

    } catch(error){
        console.log("Internal Server Error:"+error);
        throw { status: 500, message: "Error service getWorkListDataFiltered: "+error};
    }

}

function getWorklistPODInstallation(response, filters) {
    const { project, workcenter, customer, endUser, co, co3 } = filters;

    try {
        if (response.length === 0) return response;

        const hasFilters = !!project || !!workcenter || !!customer || !!endUser || !!co || !!co3;

        // 1) Se sono presenti filtri, filtro la lista degli SFC in base ai campi customValues
        const filteredResponse = response.filter(function (obj) {
            if (!hasFilters) return true;

            const customValues = obj.customValues || [];
            let projectCondition  = true;
            let customerCondition = true;
            let endUserCondition  = true;
            let coCondition       = true;
            let co3Condition      = true;

            if (!!project)  projectCondition  = customValues.some(cv => cv.attribute === "COMMESSA"  && cv.value.toUpperCase().includes(project.toUpperCase()));
            if (!!customer) customerCondition = customValues.some(cv => cv.attribute === "CUSTOMER"  && cv.value.toUpperCase().includes(customer.toUpperCase()));
            if (!!endUser)  endUserCondition  = customValues.some(cv => cv.attribute === "END_USER"  && cv.value.toUpperCase().includes(endUser.toUpperCase()));
            if (!!co)       coCondition       = customValues.some(cv => cv.attribute === "CO_PREV"   && cv.value.toUpperCase().includes(co.toUpperCase()));
            if (!!co3)      co3Condition      = customValues.some(cv => cv.attribute === "CO3"       && cv.value.toUpperCase().includes(co3.toUpperCase()));

            return projectCondition && customerCondition && endUserCondition && coCondition && co3Condition;
        });

        // 2) Per ogni SFC, mappo i campi rilevanti verso i field attesi dal front-end
        const managedResponse = filteredResponse.map(function (obj) {
            const customValues = obj.customValues || [];
            const findValue = function (attr) {
                const found = customValues.find(cv => cv.attribute === attr);
                return found ? found.value : "";
            };
            return {
                sfc:      obj.sfc,
                status:   obj.status,
                project:  findValue("COMMESSA"),
                workcenter: workcenter,
                customer: findValue("CUSTOMER"),
                co:       findValue("CO_PREV"),
                co3:      findValue("CO3"),
                endUser:  findValue("END_USER"),
            };
        });

        return managedResponse;
    } catch (error) {
        console.log("Internal Server Error: " + error);
        throw { status: 500, message: "Error service getWorklistPODInstallation: " + error };
    }
}

module.exports = { getWorkListDataFiltered, getWorklistPODInstallation };