const { callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getShift(plant, resource) {
    try {
        let shiftName = await getShiftName(plant, resource);
        let shiftDetails = await getShiftDetails(plant, shiftName);
        return shiftDetails;
    } catch (error) {
        let errorMessage = error.message || "Error service getShift";
        throw { status: 500, message: errorMessage}
    }
}

async function getShiftName(plant, resource) {
    try {
        var url = hostname + "/resource/v2/resources?plant=" + plant + "&resource=" + resource;
        var shiftNameResponse = await callGet(url);
        console.log("LC - "+JSON.stringify(shiftNameResponse));

        if (shiftNameResponse.length > 0 && shiftNameResponse[0].shifts && shiftNameResponse[0].shifts.length > 0) {
            var shiftName = shiftNameResponse[0].shifts[0].shift;
            return shiftName;
        } else {
            throw { status: 500, message: "Shift is empty" };
        }

    } catch (error) {
        let errorMessage = error.message || "Error service getShiftName";
        throw { status: 500, message: errorMessage}
    }
}

async function getShiftDetails(plant, shift) {
    try {
        var url = hostname + "/shift/v1/shifts?plant=" + plant + "&shift=" + shift;
        var shiftDetailsResponse = await callGet(url);
        if(shiftDetailsResponse && shiftDetailsResponse.length>0){
            return shiftDetailsResponse[0];
        } else{
            return {};
        }
    } catch (error) {
        let errorMessage = error.message || "Error service getShiftDetails";
        throw { status: 500, message: errorMessage}
    }
}

module.exports = { getShift }