const { callGet } = require("../../../utility/CommonCallApi");
const { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery } = require("../../postgres-db/services/bom/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getBomMultilivelloTreeTableData(order,plant){
    try{
        let responseBom = await getBom(order, plant);
        let bomComponents = await getBomComponents(plant, responseBom.bom, responseBom.bomType);
    
        // Mappiamo i componenti principali con i loro figli
        let materialComponents = await Promise.all(
                bomComponents.map(async (comp) => {
                let children = await getChildMaterials(responseBom.customValueCommessa,order,plant, comp.material.material);
                //let missingParts = (order=="4505549589_600"?"X":"");
                let missingParts = ( (comp.material.material=="2599999999" && order=="C005.02037.MKM01_0210") ?"X":"");
                return {
                    Material: comp.material.material,
                    Quantity: comp.quantity,
                    Sequence: comp.sequence,
                    MissingParts: missingParts,
                    Children: children
                };
            })
        );
        return { Material: responseBom.material, Children: materialComponents } ;
    } catch(error){
        let errorMessage = error.message || "Error service getBomMultilivelloTreeTableData";
        throw { status: 500, message: errorMessage};
    }
}
    
async function getChildMaterials(customValueCommessa,order, plant, parentMaterial) {
    try{
        let responseQuery = await getZOrdersLinkByProjectParentOrderChildOrderFlagQuery(
            customValueCommessa, order, [parentMaterial], true
        );

        if (!responseQuery || responseQuery.length === 0) {
            return []; // Nessun figlio trovato, ritorniamo un array vuoto
        }

        return await Promise.all(responseQuery.map(async row => {
            let responseBom = await getBom(row.child_order, plant);
            let bomComponents = await getBomComponents(plant, responseBom.bom, responseBom.bomType);
            // Mappiamo i componenti correttamente
            return bomComponents.map(comp => ({
                Material: comp.material.material,
                Quantity: comp.quantity,
                Sequence: comp.sequence,
                MissingParts: comp.material.material=="2599999999" && order=="C005.02037.MKM01_0210"?"X":""
            }));
        })).then(results => results.flat()); // Appiattiamo l'array per evitare array annidati

    } catch(error){
        let errorMessage = error.message || "Error service getChildMaterials";
        throw { status: 500, message: errorMessage};
    }
}


async function getBom(order,plant){
    try{
        var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
        var bomResponse = await callGet(url);
        var customCommessa = bomResponse.customValues.find(obj => obj.attribute == "COMMESSA");
        const customValueCommessa = customCommessa && customCommessa.value || "";

        return { bom: bomResponse.bom.bom, bomType: bomResponse.bom.type, material: bomResponse.material.material, customValueCommessa }
    } catch(error){
        let errorMessage = error.message || "Error service getBom";
        throw { status: 500, message: errorMessage};
    }

}

async function getBomComponents(plant,bom,bomType){
    try{
        var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom + "&type=" + bomType;
        var bomComponentsResponse = await callGet(url);
        var bomComponents = (bomComponentsResponse && bomComponentsResponse.length > 0 ) ? bomComponentsResponse[0].components : [];
        return bomComponents;
    } catch(error){
        let errorMessage = error.message || "Error service getBomComponents";
        throw { status: 500, message: errorMessage};
    }

}

module.exports = { getBomMultilivelloTreeTableData };