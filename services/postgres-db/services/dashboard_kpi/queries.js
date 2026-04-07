const getActualDate = `SELECT MIN(start_date) AS actual_date FROM z_pod_sfc_act_log WHERE plant = $1 AND wbe = $2 AND mach_section = $3`;

const getNcPresenzaQuery = `SELECT 
    COUNT(*) FILTER (WHERE status = 'OPEN' AND blocking = false) AS nc_open,
    COUNT(*) FILTER (WHERE status = 'CLOSED') AS nc_closed,
    COUNT(*) FILTER (WHERE status = 'OPEN' AND blocking = true) AS nc_bloccanti
    FROM z_defects
    WHERE plant = $1 AND sfc = $2 and phase = 'Assembly'`;

const getTipologiaVarianzeQuery = `SELECT 
    oc.reason_for_variance,
    COALESCE(vt.description, oc.reason_for_variance) AS description,
    COALESCE(vt.attribution, 'Non attribuita') AS attribution,
    SUM(oc.variance_labor) AS variance_labor
    FROM z_op_confirmations oc
    LEFT JOIN z_variance_type vt ON vt.cause = oc.reason_for_variance AND vt.plant = oc.plant
    WHERE oc.plant = $1 AND oc.mes_order = ANY($2) AND oc.variance_labor > 0
    GROUP BY oc.reason_for_variance, vt.description, vt.attribution
    ORDER BY variance_labor DESC`;

module.exports = { getActualDate, getNcPresenzaQuery, getTipologiaVarianzeQuery };