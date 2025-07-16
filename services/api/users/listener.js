const { getPersonnelNumber, getUserGroup } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/getPersonnelNumber", async (req, res) => {
        try {
            const { plant, userId } = req.body;
            if (!plant || !userId) {
                return res.status(400).json({ error: "Missing required query parameter: plant or userId" });
            }
            
            const apiResponsePersonnelNumber = await getPersonnelNumber(plant, userId);
            res.status(200).json(apiResponsePersonnelNumber); 
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getUserGroup", async (req, res) => {
        try {
            const { plant, userId } = req.body;
            if (!plant || !userId) {
                return res.status(400).json({ error: "Missing required query parameter: plant or userId" });
            }

            const apiResponseUserGroup = await getUserGroup(plant, userId);
            res.status(200).json(apiResponseUserGroup);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
