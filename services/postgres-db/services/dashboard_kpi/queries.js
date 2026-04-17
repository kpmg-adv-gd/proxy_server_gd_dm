const getActualDate = `SELECT MIN(start_date) AS actual_date FROM z_pod_sfc_act_log WHERE plant = $1 AND wbe = $2 AND mach_section = $3`;

const getNcPresenzaQuery = `SELECT 
    COUNT(*) FILTER (WHERE status = 'OPEN' AND blocking = false) AS nc_open,
    COUNT(*) FILTER (WHERE status = 'CLOSED') AS nc_closed,
    COUNT(*) FILTER (WHERE status = 'OPEN' AND blocking = true) AS nc_bloccanti
    FROM z_defects
    WHERE plant = $1 AND dm_order = ANY($2)`;

const getOrdersConNcQuery = `SELECT DISTINCT dm_order 
    FROM z_defects 
    WHERE plant = $1 AND dm_order = ANY($2) and status = 'OPEN'`;

const getTipologiaVarianzeQuery = `SELECT 
    oc.reason_for_variance,
    COALESCE(vt.description, oc.reason_for_variance) AS description,
    COALESCE(vt.attribution, 'Non attribuita') AS attribution,
    SUM(oc.variance_labor) AS variance_labor
    FROM z_op_confirmations oc
    LEFT JOIN z_variance_type vt ON vt.cause = oc.reason_for_variance AND vt.plant = oc.plant
    WHERE oc.plant = $1 AND oc.mes_order = ANY($2) AND oc.variance_labor > 0 AND oc.reason_for_variance IS NOT NULL
    AND oc.cancellation_flag = false AND oc.cancelled_confirmation IS NULL
    GROUP BY oc.reason_for_variance, vt.description, vt.attribution
    ORDER BY variance_labor DESC`;

const getOrdersHierarchyQuery = `SELECT parent_order, child_order FROM z_orders_link WHERE plant = $1 AND parent_order = ANY($2)`;

const getMarkingRecapForDashboardQuery = `SELECT mes_order, operation, SUM(COALESCE(marked_labor, 0)) as marked_labor, SUM(COALESCE(variance_labor, 0)) as variance_labor FROM z_marking_recap WHERE plant = $1 AND wbe_machine = $2 AND mes_order = ANY($3) GROUP BY mes_order, operation`;

const getMancantiForDashboardQuery = `SELECT "order", missing_component, component_description, missing_quantity, receipt_expected_date, first_conf_date, mrp_date, date_from_workshop, cover_element FROM z_report_mancanti WHERE plant = $1 AND project = $2 AND "order" = ANY($3) AND active = true`;

module.exports = { getActualDate, getNcPresenzaQuery, getOrdersConNcQuery, getOrdersHierarchyQuery, getTipologiaVarianzeQuery, getMarkingRecapForDashboardQuery, getMancantiForDashboardQuery };