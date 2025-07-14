const { getZSharedMemoryData } = require("../services/postgres-db/services/shared_memory/library");

var plantMappingCacheDM = new Map();
var plantMappingCacheERP = new Map();

async function getPlantFromERPPlant(erpPlant){
    if (plantMappingCacheDM.has(erpPlant)) {
        return plantMappingCacheDM.get(erpPlant);
    }

    var plantSharedMemory = await getZSharedMemoryData("ALL","MAPPING_PLANT_ERP_DM");
    var plantSharedMemoryJSON = JSON.parse(plantSharedMemory[0].value);

    Object.entries(plantSharedMemoryJSON).forEach(([key, value]) => {
        plantMappingCacheDM.set(key, value);
    });

    return plantMappingCacheDM.get(erpPlant) || "";

}

async function getErpPlantFromDMPlant(dmPlant){
    if (plantMappingCacheERP.has(dmPlant)) {
        return plantMappingCacheERP.get(dmPlant);
    }

    var plantSharedMemory = await getZSharedMemoryData("ALL","MAPPING_PLANT_DM_ERP");
    var plantSharedMemoryJSON = JSON.parse(plantSharedMemory[0].value);

    Object.entries(plantSharedMemoryJSON).forEach(([key, value]) => {
        plantMappingCacheERP.set(key, value);
    });

    return plantMappingCacheERP.get(dmPlant) || "";

}

module.exports = { getPlantFromERPPlant, getErpPlantFromDMPlant }