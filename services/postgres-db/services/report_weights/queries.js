const getReportWeight = `SELECT * FROM z_report_weight WHERE report = $1`;

module.exports = { getReportWeight };