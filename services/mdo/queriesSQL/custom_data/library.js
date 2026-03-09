const { executeQuery } = require('../connection');
const queries = require('./queries');

async function getProjectsVerbaliTesting(plant) {
    const rows = await executeQuery(queries.GET_PROJECTS_VERBALI_TESTING, [plant]);
    return rows;
}

async function getVerbaliTileSupervisoreTestingData(plant) {
    const rows = await executeQuery(queries.GET_VERBALI_TILE_SUPERVISORE_TESTING, [plant]);
    return rows;
}

module.exports = { getProjectsVerbaliTesting, getVerbaliTileSupervisoreTestingData };
