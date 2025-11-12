const { callGet } = require("../../../utility/CommonCallApi");
const { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery } = require("../../postgres-db/services/bom/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getBomMultilivelloTreeTableData(order, plant) {
    try {
        let responseBom = await getBom(order, plant);
        let bomComponents = await getBomComponents(plant, responseBom.bom, responseBom.bomType);

        let materialComponents = await Promise.all(
            bomComponents.map(async (comp) => {
                let children = await getChildMaterials(responseBom.customValueCommessa, order, plant, comp.material.material);
                
                let materialDescription = comp?.customValues?.find(obj => obj.attribute === "DESCRIZIONE COMPONENTE")?.value || "";
                let mancanteField = comp?.customValues?.find(obj => obj.attribute === "COMPONENTE MANCANTE");
                let missingParts = mancanteField?.value === "true" ? "X" : "";
                let fluxType = comp?.customValues?.find(obj => obj.attribute === "FLUX_TYPE")?.value || "";

                return {
                    Material: comp.material.material,
                    MaterialDescription: materialDescription,
                    Quantity: comp.quantity,
                    Sequence: comp.sequence,
                    MissingParts: missingParts,
                    FluxType: fluxType,
                    Children: children
                };
            })
        );

        // Ordino i figli di primo livello con i mancanti prima
        return {
            Material: responseBom.material,
            MaterialDescription: responseBom.materialDescription,
            Children: materialComponents.sort((a, b) =>
                (b.MissingParts === "X" ? 1 : 0) - (a.MissingParts === "X" ? 1 : 0)
            )
        };
    } catch (error) {
        throw { status: 500, message: error.message || "Error service getBomMultilivelloTreeTableData" };
    }
}

async function getChildMaterials(customValueCommessa, order, plant, parentMaterial) {
    try {
        let responseQuery = await getZOrdersLinkByProjectParentOrderChildOrderFlagQuery(
            customValueCommessa, order, [parentMaterial], true
        );

        if (!responseQuery || responseQuery.length === 0) {
            return [];
        }

        return await Promise.all(responseQuery.map(async row => {
            let responseBom = await getBom(row.child_order, plant);
            let bomComponents = await getBomComponents(plant, responseBom.bom, responseBom.bomType);

            return bomComponents.map(comp => {
                let descr = comp?.customValues?.find(obj => obj.attribute === "DESCRIZIONE COMPONENTE")?.value || "";
                let mancanteField = comp?.customValues?.find(obj => obj.attribute === "COMPONENTE MANCANTE");
                let missingParts = mancanteField?.value === "true" ? "X" : "";
                let fluxType = comp?.customValues?.find(obj => obj.attribute === "FLUX_TYPE")?.value || "";

                return {
                    Material: comp.material.material,
                    MaterialDescription: descr,
                    Quantity: comp.quantity,
                    Sequence: comp.sequence,
                    MissingParts: missingParts,
                    FluxType: fluxType
                };
            });
        })).then(results =>
            results.flat().sort((a, b) =>
                (b.MissingParts === "X" ? 1 : 0) - (a.MissingParts === "X" ? 1 : 0)
            )
        );

    } catch (error) {
        throw { status: 500, message: error.message || "Error service getChildMaterials" };
    }
}

async function getBom(order, plant) {
    try {
        const url = `${hostname}/order/v1/orders?order=${order}&plant=${plant}`;
        const bomResponse = await callGet(url);

        const customCommessa = bomResponse?.customValues?.find(obj => obj.attribute === "COMMESSA");
        const orderTypeObj = bomResponse?.customValues?.find(obj => obj.attribute === "ORDER_TYPE");
        const orderType = orderTypeObj?.value || "";
        const materialDescription = orderType !== "AGGR" ? (bomResponse?.material?.description || "") : "";

        const customValueCommessa = customCommessa?.value || "";

        return {
            bom: bomResponse?.bom?.bom || "",
            bomType: bomResponse?.bom?.type || "",
            material: bomResponse?.material?.material || "",
            materialDescription,
            customValueCommessa
        };
    } catch (error) {
        throw { status: 500, message: error.message || "Error service getBom" };
    }
}

async function getBomComponents(plant, bom, bomType) {
    try {
        const url = `${hostname}/bom/v1/boms?plant=${plant}&bom=${bom}&type=${bomType}`;
        const bomComponentsResponse = await callGet(url);
        const bomComponents = (bomComponentsResponse && bomComponentsResponse.length > 0)
            ? bomComponentsResponse[0].components
            : [];
        return bomComponents;
    } catch (error) {
        throw { status: 500, message: error.message || "Error service getBomComponents" };
    }
}

module.exports = { getBomMultilivelloTreeTableData };
