const postgresdbService = require('../../connection');
const queryLoipro = require("./queries");

async function updateZSpecialGroups(plant,project,wbe,order,isElaborated){
    const data = await postgresdbService.executeQuery(queryLoipro.updateZSpecialGroupsQuery, [isElaborated,plant, project, wbe, order]);
    return data;
}

async function getZSpecialGroupsNotElbaoratedByWBS(pojectsArray){
    console.log("AM PROJECTS= "+JSON.stringify(pojectsArray));
    const data = await postgresdbService.executeQuery(queryLoipro.getZSpecialGroupsNotElbaoratedByWBSQuery, [pojectsArray]);
    return data;
}

module.exports = { updateZSpecialGroups, getZSpecialGroupsNotElbaoratedByWBS }