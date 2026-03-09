const { callGet, callPatch } = require("./CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getBomInfoByOrder(plant,order){
    let orderResponse = await getOrderInfoByOrder(plant,order);
    let bomResponse = await getBomInfoByBom(plant,orderResponse.bom.bom,orderResponse.bom.type);
    return bomResponse;
}

async function getOrderInfoByOrder(plant,order){
    var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
    var orderResponse = await callGet(url);
    return orderResponse;
}

async function getBomInfoByBom(plant,bom,bomType){
    var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom + "&type=" + bomType;
    var bomResponse = await callGet(url);
    return bomResponse;
}

async function getMaterial(plant,material){
    var url = hostname + "/material/v1/materials?plant=" + plant + "&material=" + material;
    var materialResponse = await callGet(url);
    return materialResponse;
}

// Funzione generica per aggiornare uno o più campi custom di un ordine
async function updateCustomField(plant, order, customFieldsUpdate) {
    try {
        // Verifica se customFieldsUpdate è un array, altrimenti lo trasforma in array
        const fieldsArray = Array.isArray(customFieldsUpdate) ? customFieldsUpdate : [customFieldsUpdate];
        
        // Trasforma l'array di {customField, customValue} nel formato richiesto dall'API
        const customValues = fieldsArray.map(field => ({
            "attribute": field.customField,
            "value": field.customValue
        }));
        
        const url = hostname + "/order/v1/orders/customValues";
        const body = {
            "plant": plant,
            "order": order,
            "customValues": customValues
        };
        await callPatch(url, body);
        return true;
    } catch (error) {
        console.error("Error in updateCustomField:", error.message);
        throw error;
    }
}

// Converte una stringa "DD/MM/YYYY HH:MM:SS" (ora locale Europe/Rome) in un oggetto Date UTC
// Gestisce correttamente sia l'ora solare (CET, UTC+1) che quella legale (CEST, UTC+2)
function italianDateStrToUTC(str) {
    const [datePart, timePart] = str.split(' ');
    const [dd, mm, yyyy] = datePart.split('/');
    const [hh, mi, ss]   = timePart.split(':');
    // Costruiamo un Date UTC trattando i valori memorizzati come se fossero UTC (approssimazione)
    const approx = new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +ss));
    // Ricaviamo che ora mostra l'Italia per quel candidato UTC, così otteniamo l'offset reale
    const italianHour = +(new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/Rome', hour: 'numeric', hour12: false
    }).format(approx));
    // offset Italy-UTC in ore (1 in inverno, 2 in estate)
    const italyUTCOffsetH = italianHour - +hh;
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh - italyUTCOffsetH, +mi, +ss));
}

module.exports = { getBomInfoByOrder, getOrderInfoByOrder, getBomInfoByBom, getMaterial, updateCustomField, italianDateStrToUTC }