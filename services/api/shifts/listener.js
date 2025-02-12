const { getShift } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/shift/getShiftDetails", async (req, res) => {
        try {
            const { plant, resource } = req.body;
            if (!plant || !resource) {
                return res.status(400).json({ error: "Missing required query parameter: plant or resource" });
            }

            const apiResponseShift = await getShift(plant, resource);
            res.status(200).json(apiResponseShift); 
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};
