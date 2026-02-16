const getReportWeight = `SELECT * FROM z_report_weight WHERE report = $1 order by id, section`;

module.exports = { getReportWeight };