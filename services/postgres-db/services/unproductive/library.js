const postgresdbService = require('../../connection');
const queryMark = require("./queries");
const { getPlantFromERPPlant } = require("../../../../utility/MappingPlant");

async function selectZUnproductive(plant) {
    console.log("selectZUnproductive called with plant:", plant);
    const data = await postgresdbService.executeQuery(queryMark.selectZUnproductive, [plant]);
    console.log("Data retrieved from selectZUnproductive:", data);
    return data;
}

async function insertWBS(plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group) {
    const result = await postgresdbService.executeQuery(queryMark.insertWBS, [plant, wbe, wbe_description, wbs, wbs_description, network, network_description, activity_id, activity_id_description, confirmation_number, user_group, false]);
    return result;
}

async function receiveCoordinamento(jsonCoordinamento) {
    var result = [];
    if (jsonCoordinamento && jsonCoordinamento.coordinations && jsonCoordinamento.coordinations.length > 0) {
        for (var i=0; i < jsonCoordinamento.coordinations.length; i++) {
            var item = jsonCoordinamento.coordinations[i];
            var correctPlant = await getPlantFromERPPlant(item.plant);
            if (correctPlant != "") {
                const data = await postgresdbService.executeQuery(queryMark.insertWBS, [correctPlant, item.wbe, item.wbe_description, item.project, item.project + " - " + item.project_description, item.network, item.network_description, item.activity_id, item.activity_id_description, item.confirmation_number, item.user_group, item.coordination]);
                result.push(data);
            } else {
                console.log(`Plant mapping not found for ERP plant: ${item.plant}. Skipping entry with confirmation number: ${item.confirmation_number}`);
            }
        }
    }
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

async function getUnproductiveByConfirmationNumber(plant, confirmationNumber) {
    const data = await postgresdbService.executeQuery(queryMark.getUnproductiveByConfirmationNumber, [plant, confirmationNumber]);
    return data;
}

module.exports = { selectZUnproductive, insertWBS, deleteWBS, updateWBS, getMarcatureDayAndValue, getUnproductiveByConfirmationNumber, receiveCoordinamento };