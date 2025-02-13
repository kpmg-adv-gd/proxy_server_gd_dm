const { callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getPersonnelNumber(plant, userId) {
    try {
        var url = hostname + "/user/v1/users?plant=" + plant + "&userId=" + userId;
        const response = await callGet(url);
        const personnelNumber = response.erpPersonnelNumber;

        return personnelNumber;
           
    } catch (error) {
        let errorMessage = error.message || "Error service getPersonnelNumber";
        throw { status: 500, message: errorMessage}
    }
}

module.exports = { getPersonnelNumber }