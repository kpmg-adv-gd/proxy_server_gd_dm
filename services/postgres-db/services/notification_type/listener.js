const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getZNotificationTypeData", async (req, res) => {
        const { } = req.body;
        try {
            const notificationTypeData = await postgresdbService.getZNotificationTypeData();
            res.status(200).json(notificationTypeData); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

};

