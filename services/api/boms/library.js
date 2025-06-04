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
                let mancanteField = comp?.customValues.find(obj => obj.attribute == "COMPONENTE MANCANTE");
                let missingParts = mancanteField?.value == "true" ? "X" : "";
                let fluxTypeField = comp?.customValues.find(obj => obj.attribute == "FLUX_TYPE");
                let fluxType = fluxTypeField?.value || "";
                return {
                    Material: comp.material.material,
                    Quantity: comp.quantity,
                    Sequence: comp.sequence,
                    MissingParts: missingParts,
                    FluxType: fluxType,
                    Children: children
                };
            })
        );
        //Ordino i figli di primo livello con i mancanti prima
        return { Material: responseBom.material, Children: materialComponents.sort((a, b) => (b.MissingParts === "X" ? 1 : 0) - (a.MissingParts === "X" ? 1 : 0)) } ;
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
                MissingParts: comp?.customValues.find(obj => obj.attribute == "COMPONENTE MANCANTE").value == "true" ? "X" : "",
                FluxType: comp?.customValues.find(obj => obj.attribute == "FLUX_TYPE")?.value || ""
            }));
        })).then(results => 
            results.flat().sort((a, b) => (b.MissingParts === "X" ? 1 : 0) - (a.MissingParts === "X" ? 1 : 0))
        ); // Appiattiamo l'array per evitare array annidati e poi mettiamo i mancanti prima

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