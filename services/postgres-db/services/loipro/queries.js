const getWorkcenterDmByPlantGdAndWorkCenterErp = `SELECT workcenter_dm
                                FROM z_map_workcenter
                                WHERE plant_gd = $1 AND workcenter_erp = $2`;

const getCertificationByPlantGdAndWorkCenterErp = `SELECT certification_dm
                                FROM z_map_workcenter
                                WHERE plant_gd = $1 AND workcenter_erp = $2`;

module.exports = { getWorkcenterDmByPlantGdAndWorkCenterErp, getCertificationByPlantGdAndWorkCenterErp };