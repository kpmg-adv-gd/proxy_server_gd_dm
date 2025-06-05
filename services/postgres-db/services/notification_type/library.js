const postgresdbService = require('../../connection');
const queryNotificationType = require("./queries");

async function getZNotificationTypeData(){
    const data = await postgresdbService.executeQuery(queryNotificationType.getZNotificationTypeDataQuery, []);
    return data;
}

module.exports = { getZNotificationTypeData }