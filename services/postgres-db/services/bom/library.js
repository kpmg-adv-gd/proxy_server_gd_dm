const postgresdbService = require('../../connection');
const queryBom = require("./queries");

async function getZOrdersLinkByProjectParentOrderChildOrderFlagQuery(project, parentOrder, childOrder, parentAssemblyFlag){
    const data = await postgresdbService.executeQuery(queryBom.getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, [project, parentOrder, childOrder, parentAssemblyFlag]);
    return data;
}

module.exports = { getZOrdersLinkByProjectParentOrderChildOrderFlagQuery }