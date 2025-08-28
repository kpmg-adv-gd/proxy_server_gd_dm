const getMacroPhaseQuery = `SELECT * FROM z_macrophase where plant = $1`;

module.exports = { getMacroPhaseQuery };