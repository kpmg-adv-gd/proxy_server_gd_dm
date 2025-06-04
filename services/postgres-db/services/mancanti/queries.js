
const updateZSpecialGroupsQuery = `UPDATE z_special_groups
                                SET elaborated = $1
                                WHERE plant=$2 and project = $3 and wbe = $4 and "order" = $5 and elaborated != $1 `;

const getZSpecialGroupsNotElbaoratedByWBSQuery = `SELECT DISTINCT zsg.*,zol.parent_order,zol.parent_material,zol.child_material  
                                                FROM z_special_groups zsg
                                                inner join z_orders_link zol on zol.child_order = zsg."order" and zol.plant = zsg.plant and zol.project  = zsg.project 
                                                WHERE zsg.project = ANY($1) and zsg.elaborated = 'false'  `;


module.exports = { updateZSpecialGroupsQuery, getZSpecialGroupsNotElbaoratedByWBSQuery };