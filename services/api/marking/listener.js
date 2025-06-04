const { getFilterMarkingReport, mangeConfirmationMarking } = require("./library");

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

            const { plant,personalNumber,wbe_machine,operation,mes_order,sfc,confirmation_number,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,reason_for_variance,user_id,confirmation,cancellation,cancelled_confirmation,modification,workCenter,operationDescription,project } = req.body;

            var responseConfirmationMarking = await mangeConfirmationMarking(plant,personalNumber,wbe_machine,operation,mes_order,sfc,confirmation_number,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,reason_for_variance,user_id,confirmation,cancellation,cancelled_confirmation,modification,workCenter,operationDescription,project);
            res.status(200).json(responseConfirmationMarking);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error?.message || "Internal Server Error";
            console.error("Error api sendMarkingToSapAndUpdateZTable:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });
};


