const { getFilterMarkingReport, mangeConfirmationMarking, sendZDMConfirmations, sendZDMConfirmationsTesting, getAccessUserGroupWBS, sendStornoUnproductive } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/getFilterMarkingReport", async (req, res) => {

        try {
            const { plant } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }
            var responseFilterData = await getFilterMarkingReport(plant);
            res.status(200).json(responseFilterData);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/sendMarkingToSapAndUpdateZTable", async (req, res) => {
        try {
            const { plant,personalNumber,wbe_machine,operation,mes_order,sfc,confirmation_number,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,reason_for_variance,
                user_id,confirmation,cancellation,cancelled_confirmation,modification,workCenter,operationDescription,project, defectId } = req.body;

            var responseConfirmationMarking = await mangeConfirmationMarking(plant,personalNumber,wbe_machine,operation,mes_order,sfc,confirmation_number,marking_date,marked_labor,
                uom_marked_labor,variance_labor,uom_variance_labor,reason_for_variance,user_id,confirmation,cancellation,cancelled_confirmation,modification,
                workCenter,operationDescription,project, defectId);
            res.status(200).json(responseConfirmationMarking);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error?.message || "Internal Server Error";
            console.error("Error api sendMarkingToSapAndUpdateZTable:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/sendZDMConfirmations", async (req, res) => {
        try {
            const { plant, personalNumber, activityNumber, activityNumberId, cancellation, confirmation, confirmationCounter, confirmationNumber, date, duration, durationUom, reasonForVariance, unCancellation, unConfirmation, rowSelectedWBS, userId } = req.body;

            var response = await sendZDMConfirmations(plant, personalNumber, activityNumber, activityNumberId, cancellation, confirmation, confirmationCounter, confirmationNumber, date, duration, durationUom, reasonForVariance, unCancellation, unConfirmation, rowSelectedWBS, userId);
            res.status(200).json(response);

        } catch (error) {
            let status = error.status || 500;
            let errMessage = error?.message || "Internal Server Error";
            console.error("Error api sendZDMConfirmations:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/sendZDMConfirmationsTesting", async (req, res) => {
        try {
            const { plant, sfc, order, operation, personalNumber, activityNumber, activityNumberId, cancellation, confirmation, confirmationCounter, confirmationNumber, date, duration, durationUom, reasonForVariance, unCancellation, unConfirmation, rowSelectedWBS, userId, modification } = req.body;

            var response = await sendZDMConfirmationsTesting(plant, sfc, order, operation, personalNumber, activityNumber, activityNumberId, cancellation, confirmation, confirmationCounter, confirmationNumber, date, duration, durationUom, reasonForVariance, unCancellation, unConfirmation, rowSelectedWBS, userId, modification);
            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error?.message || "Internal Server Error";
            console.error("Error api sendZDMConfirmations:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/stornoUnproductive", async (req, res) => {
        try {
            const { plant, personalNumber, activityNumber, activityNumberId, cancellation, confirmation, confirmationCounter, confirmationNumber, date, duration, durationUom, reasonForVariance, unCancellation, unConfirmation, rowSelectedWBS, userId } = req.body;
            var response = await sendStornoUnproductive(plant, personalNumber, activityNumber, activityNumberId, cancellation, confirmation, confirmationCounter, confirmationNumber, date, duration, durationUom, reasonForVariance, unCancellation, unConfirmation, rowSelectedWBS, userId);
            res.status(200).json(response);


        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error api stornoUnproductive:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getAccessUserGroupWBS", async (req, res) => {
        try {
            const { plant } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameters: plant" });
            }
            var response = await getAccessUserGroupWBS(plant);
            return res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


