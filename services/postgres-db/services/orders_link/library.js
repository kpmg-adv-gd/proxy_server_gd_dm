const postgresdbService = require('../../connection');
const queryOrdersLink = require("./queries");

async function insertZOrdersLink(plant,project,parentOrder,parentMaterial,order,material,parentAssembly){
    const data = await postgresdbService.executeQuery(queryOrdersLink.insertZOrdersLinkQuery, [plant,project, parentOrder, parentMaterial, order, material, parentAssembly]);
    return data;
}


module.exports = { insertZOrdersLink }