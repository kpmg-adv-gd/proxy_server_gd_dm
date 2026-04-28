const { json } = require("express");
const { dispatch } = require("../../mdo/library");
const { callPatch } = require("../../../utility/CommonCallApi");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;
const plantMappingCache = new Map();

async function manageUserStatusUnloadPoint(jsonCustomValues) {
    var wbeList = jsonCustomValues.wbeList || [];
    for (var p=0; p<wbeList.length; p++) {
        var plant = await getPlantFromERPPlant(wbeList[p].plant);
        var orders = wbeList[p].orders || [];
        for (var o=0; o<orders.length; o++) {
            var mesOrder = orders[o].mesOrder;
            var userStatus = orders[o].userStatus;
            var unloadPoint = orders[o].unloadPoint;
            // Salvataggio campi custom
            if (!mesOrder || mesOrder == null || mesOrder == "") continue; // Se non c'è l'ordine MES, salto tutto
            if (userStatus) await upadateCustomValue(plant, mesOrder, "USER_STATUS", userStatus);
            if (unloadPoint) await upadateCustomValue(plant, mesOrder, "UNLOAD_POINT", unloadPoint);
        }
    }
    // Tutto ok!
    return { result: true, message: "Custom Values managed successfully" };    
}

// Utilities
async function getPlantFromERPPlant(erpPlant){
    if (plantMappingCache.has(erpPlant)) {
        return plantMappingCache.get(erpPlant);
    }

    var plantSharedMemory = await getZSharedMemoryData("ALL","MAPPING_PLANT_ERP_DM");
    var plantSharedMemoryJSON = JSON.parse(plantSharedMemory[0].value);

    Object.entries(plantSharedMemoryJSON).forEach(([key, value]) => {
        plantMappingCache.set(key, value);
    });

    return plantMappingCache.get(erpPlant) || "";
}
async function upadateCustomValue(plant, order, attribute, value){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute": attribute,
        "value": value
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    await callPatch(url,body);
}

/* Esempio di struttura dati in ingresso:
{
  "wbeList": [
     {
        "wbe": "LV_STATUS-WBE_ASSEMBLY",
        "plant": " CEDCLNT100:GD01",
        "orders": [
           {
              "mesOrder": "LV_STATUS-MES_ORDER",
              "userStatus": "LV_STATUS-USER_STATUS",
              "unloadPoint": "LV_STATUS-UNLOAD_POINT"
           },
           {
              "mesOrder": "LV_STATUS-MES_ORDER",
              "userStatus": "LV_STATUS-USER_STATUS",
              "unloadPoint": "LV_STATUS-UNLOAD_POINT"
           }
        ]
     },
     {
        "wbe": "LV_STATUS-WBE_ASSEMBLY",
        "plant": " CEDCLNT100:GD01",
        "orders": [
           {
              "mesOrder": "LV_STATUS-MES_ORDER",
              "userStatus": "LV_STATUS-USER_STATUS",
              "unloadPoint": "LV_STATUS-UNLOAD_POINT"
           }
        ]
     }
  ]
}
*/

module.exports = { manageUserStatusUnloadPoint }