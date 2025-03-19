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

module.exports = { getWorkcenterDmByPlantGdAndWorkCenterErp, getCertificationByPlantGdAndWorkCenterErp }