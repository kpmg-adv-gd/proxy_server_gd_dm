const getZSharedMemoryDataQuery = `SELECT *
                                FROM z_shared_memory
                                WHERE (plant = $1 OR plant IS NULL) AND key = $2`;

module.exports = { getZSharedMemoryDataQuery };