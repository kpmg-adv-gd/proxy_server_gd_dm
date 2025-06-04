const getWorkcenterDmByPlantGdAndWorkCenterErp = `SELECT workcenter_dm
                                FROM z_map_workcenter
                                WHERE plant_gd = $1 AND workcenter_erp = $2`;

const getCertificationByPlantGdAndWorkCenterErp = `SELECT certification_dm
                                FROM z_map_workcenter
                                WHERE plant_gd = $1 AND workcenter_erp = $2`;

const insertZCertificationQuery = `INSERT INTO z_certification(plant_gd,operation_activity,workcenter_erp,is_assigned)
                                VALUES ($1,$2,$3,$4)
                                ON CONFLICT (plant_gd, operation_activity, workcenter_erp) DO NOTHING;`;

const getZCertificationNotAssignedByPlantQuery = `SELECT *
                                FROM z_certification zc 
                                inner join z_map_workcenter zmw on zc.plant_gd = zmw.plant_gd  and zc.workcenter_erp = zmw.workcenter_erp
                                WHERE zc.plant_gd = $1 and zc.is_assigned=false`;

const updateZCertificationByPlantAndCertQuery = `UPDATE z_certification AS zcu
                                        SET is_assigned=true
                                        FROM (
                                            SELECT zc.*
                                            FROM z_certification zc 
                                            inner join z_map_workcenter zmw on zc.plant_gd = zmw.plant_gd  and zc.workcenter_erp = zmw.workcenter_erp
                                            WHERE zc.plant_gd = $1 and zmw.certification_dm = $2 and zc.is_assigned=false
                                        ) AS zcq
                                        WHERE zcq.plant_gd = zcu.plant_gd and zcq.workcenter_erp = zcu.workcenter_erp and zcq.operation_activity= zcu.operation_activity`;

const insertZSpecialGroupsQuery = `INSERT INTO z_special_groups(plant,project,wbe,"order",order_type,is_parent_assembly,elaborated)
                                VALUES ($1,$2,$3,$4,$5,$6,$7)
                                ON CONFLICT (plant,project,"order") DO NOTHING;`;

module.exports = { getWorkcenterDmByPlantGdAndWorkCenterErp, getCertificationByPlantGdAndWorkCenterErp, insertZCertificationQuery,getZCertificationNotAssignedByPlantQuery,updateZCertificationByPlantAndCertQuery, insertZSpecialGroupsQuery };