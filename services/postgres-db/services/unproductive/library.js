const postgresdbService = require('../../connection');
const queryMark = require("./queries");

async function selectZUnproductive(plant) {
    console.log("selectZUnproductive called with plant:", plant);
    const data = await postgresdbService.executeQuery(queryMark.selectZUnproductive, [plant]);
    console.log("Data retrieved from selectZUnproductive:", data);
    return data;
}

async function insertWBS(plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group) {
    const result = await postgresdbService.executeQuery(queryMark.insertWBS, [plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group]);
    return result;
}

async function deleteWBS(plant, confirmationNumberList) {
    const confirmationNumbers = confirmationNumberList.map(item => item.confirmation_number);
    const result = await postgresdbService.executeQuery(queryMark.deleteWBS, [plant, confirmationNumbers]);
    return result;
}

async function updateWBS(plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group) {
    const result = await postgresdbService.executeQuery(queryMark.updateWBS, [plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group]);
    return result;
}

async function getMarcatureDayAndValue(plant, erpPersonnelNumber) {
    const data = await postgresdbService.executeQuery(queryMark.getMarcatureDayAndValue, [plant, erpPersonnelNumber]);
    return data;
}

module.exports = { selectZUnproductive, insertWBS, deleteWBS, updateWBS, getMarcatureDayAndValue };