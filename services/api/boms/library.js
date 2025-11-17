const { callGet } = require("../../../utility/CommonCallApi");
const { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery } = require("../../postgres-db/services/bom/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

// Cache per ridurre chiamate duplicate
const bomCache = new Map();
const bomComponentsCache = new Map();

// --------------------
// UTILITY
// --------------------
function extractComponentFields(comp) {
    const descr = comp?.customValues?.find(o => o.attribute === "DESCRIZIONE COMPONENTE")?.value || "";
    const missingParts = comp?.customValues?.some(o => o.attribute === "COMPONENTE MANCANTE" && o.value === "true") ? "X" : "";
    const fluxType = comp?.customValues?.find(o => o.attribute === "FLUX_TYPE")?.value || "";

    return { descr, missingParts, fluxType };
}

function sortMissingFirst(a, b) {
    return (b.MissingParts === "X") - (a.MissingParts === "X");
}

// --------------------
// SERVICES OTTIMIZZATI
// --------------------
async function getBom(order, plant) {
    const cacheKey = `${order}_${plant}`;
    if (bomCache.has(cacheKey)) return bomCache.get(cacheKey);

    try {
        const url = `${hostname}/order/v1/orders?order=${order}&plant=${plant}`;
        const bomResponse = await callGet(url);

        const customValueCommessa = bomResponse?.customValues?.find(o => o.attribute === "COMMESSA")?.value || "";
        const orderType = bomResponse?.customValues?.find(o => o.attribute === "ORDER_TYPE")?.value || "";
        const parentAssembly = bomResponse?.customValues?.find(o => o.attribute === "PARENT_ASSEMBLY")?.value || "";
        const materialDescription = orderType !== "AGGR" ? (bomResponse?.material?.description || "") : "";

        const result = {
            bom: bomResponse?.bom?.bom || "",
            bomType: bomResponse?.bom?.type || "",
            material: bomResponse?.material?.material || "",
            parentAssembly,
            materialDescription,
            customValueCommessa
        };

        bomCache.set(cacheKey, result);
        return result;
    } catch (error) {
        throw { status: 500, message: error.message || "Error service getBom" };
    }
}

async function getBomComponents(plant, bom, bomType) {
    const cacheKey = `${plant}_${bom}_${bomType}`;
    if (bomComponentsCache.has(cacheKey)) return bomComponentsCache.get(cacheKey);

    try {
        const url = `${hostname}/bom/v1/boms?plant=${plant}&bom=${bom}&type=${bomType}`;
        const response = await callGet(url);
        const list = response?.[0]?.components || [];

        bomComponentsCache.set(cacheKey, list);
        return list;
    } catch (error) {
        throw { status: 500, message: error.message || "Error service getBomComponents" };
    }
}

// --------------------
// CHILD MATERIALS
// --------------------
async function getChildMaterials(customValueCommessa, order, plant, parentMaterial) {
    try {
        const rows = await getZOrdersLinkByProjectParentOrderChildOrderFlagQuery(
            customValueCommessa, order, [parentMaterial], true
        );

        if (!rows?.length) return [];

        const children = await Promise.all(rows.map(async row => {
            const bomInfo = await getBom(row.child_order, plant);
            const comps = await getBomComponents(plant, bomInfo.bom, bomInfo.bomType);

            const mapped = comps.map(comp => {
                const { descr, missingParts, fluxType } = extractComponentFields(comp);

                return {
                    Material: comp.material.material,
                    MaterialDescription: descr,
                    Quantity: comp.quantity,
                    Sequence: comp.sequence,
                    MissingParts: missingParts,
                    FluxType: fluxType
                };
            });

            // se ha nipoti
            if (bomInfo.parentAssembly === "true" || bomInfo.parentAssembly === "X") {
                await Promise.all(
                    mapped.map(async m => {
                        m.Children = await getChildMaterials(
                            bomInfo.customValueCommessa,
                            row.child_order,
                            plant,
                            m.Material
                        );
                    })
                );
            }

            return mapped;
        }));

        return children.flat().sort(sortMissingFirst);

    } catch (error) {
        throw { status: 500, message: error.message || "Error service getChildMaterials" };
    }
}

// --------------------
// FUNZIONE PRINCIPALE
// --------------------
async function getBomMultilivelloTreeTableData(order, plant) {
    try {
        //SVUOTO CACHE AD OGNI CHIAMATA
        bomCache.clear();
        bomComponentsCache.clear();

        const bomInfo = await getBom(order, plant);
        const comps = await getBomComponents(plant, bomInfo.bom, bomInfo.bomType);

        const firstLevelChildren = await Promise.all(
            comps.map(async comp => {
                const { descr, missingParts, fluxType } = extractComponentFields(comp);

                const children = await getChildMaterials(
                    bomInfo.customValueCommessa,
                    order,
                    plant,
                    comp.material.material
                );

                return {
                    Material: comp.material.material,
                    MaterialDescription: descr,
                    Quantity: comp.quantity,
                    Sequence: comp.sequence,
                    MissingParts: missingParts,
                    FluxType: fluxType,
                    Children: children
                };
            })
        );

        return {
            Material: bomInfo.material,
            MaterialDescription: bomInfo.materialDescription,
            Children: firstLevelChildren.sort(sortMissingFirst)
        };

    } catch (error) {
        throw { status: 500, message: error.message || "Error service getBomMultilivelloTreeTableData" };
    }
}


module.exports = { getBomMultilivelloTreeTableData };
