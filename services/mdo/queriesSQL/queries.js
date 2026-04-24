const hanaConnection = require('../connection');
const { getBomComponentQuantityTotalQuery } = require('./BOM/queries');

async function getBomComponentQuantityTotal(plant, order, material) {
    const params = [order, material, plant];
    return await hanaConnection.executeQuery(getBomComponentQuantityTotalQuery, params);
}

module.exports = {
    getBomComponentQuantityTotal
};
