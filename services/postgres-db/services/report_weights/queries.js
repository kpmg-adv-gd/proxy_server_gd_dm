const getReportWeight = `SELECT * FROM z_report_weight WHERE report = $1 and plant = $2 order by id, section`;

module.exports = { getReportWeight };