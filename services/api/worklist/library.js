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
                machineSectionCondition = customValues.some(customObj => customObj.attribute === "SEZIONE MACCHINA MACCHINA" && customObj.value.toUpperCase().includes(machineSection.toUpperCase()));
            }
            if (!!parentMaterial) {
                parentMaterialCondition = customValues.some(customObj => customObj.attribute === "MATERIALE PADRE" && customObj.value.toUpperCase().includes(parentMaterial.toUpperCase()));
            }

            // Restituisci true (ritorno l'oggetto) solo se tutte le condizioni sono rispettate
            return sfcCondition && materialCondition && projectCondition && wbsCondition && machineSectionCondition && parentMaterialCondition;
        });

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

        return managedResponse;

    } catch(error){
        console.log("Internal Server Error:"+error);
        throw { status: 500, message: "Error service getWorkListDataFiltered: "+error};
    }

}

module.exports = { getWorkListDataFiltered };