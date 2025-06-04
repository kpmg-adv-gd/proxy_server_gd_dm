const postgresdbService = require('../../connection');
const queryLoipro = require("./queries");

async function getWorkcenterDmByPlantGdAndWorkCenterErp(workcenter_erp, plant_gd){
    const data = await postgresdbService.executeQuery(queryLoipro.getWorkcenterDmByPlantGdAndWorkCenterErp, [plant_gd, workcenter_erp]);
    return data;
}

async function getCertificationByPlantGdAndWorkCenterErp(workcenter_erp, plant_gd){
    const data = await postgresdbService.executeQuery(queryLoipro.getCertificationByPlantGdAndWorkCenterErp, [plant_gd, workcenter_erp]);
    return data;
}

async function insertZCertification(plant_gd,operation_activty,workcenter_erp,is_assigned){
    const data = await postgresdbService.executeQuery(queryLoipro.insertZCertificationQuery, [plant_gd, operation_activty,workcenter_erp,is_assigned]);
    return data;
}

async function getZCertificationNotAssignedByPlant(plant_gd){
    const data = await postgresdbService.executeQuery(queryLoipro.getZCertificationNotAssignedByPlantQuery, [plant_gd]);
    return data;
}

async function updateZCertificationByPlantAndCert(plant_gd,cert){
    const data = await postgresdbService.executeQuery(queryLoipro.updateZCertificationByPlantAndCertQuery, [plant_gd,cert]);
    return data;
}

async function insertZSpecialGroups(plant,project,wbs,order,orderType,parentAssembly,elaborated){
    const data = await postgresdbService.executeQuery(queryLoipro.insertZSpecialGroupsQuery, [plant,project,wbs,order,orderType,parentAssembly,elaborated]);
    return data;
}

module.exports = { getWorkcenterDmByPlantGdAndWorkCenterErp, getCertificationByPlantGdAndWorkCenterErp,insertZCertification, getZCertificationNotAssignedByPlant,updateZCertificationByPlantAndCert,insertZSpecialGroups }