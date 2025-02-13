const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/getMarkingData", async (req, res) => {
        const { wbe_machine, mes_order, operation } = req.body;

        if (!wbe_machine || !mes_order || !operation) {
            return res.status(400).json({ error: "Missing required query parameter: wbe_machine, mes_order or operation" });
        }

        try {
            const markingData = await postgresdbService.getMarkingData(wbe_machine, mes_order, operation);
            res.status(200).json(markingData); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })  

    app.post("/db/insertOpConfirmation", async (req, res) => {
        const {
            wbe_machine,
            operation,
            mes_order,
            confirmation_number,
            marking_date,
            start_time,
            finish_time,
            marked_labor,
            uom_marked_labor,
            variance_labor,
            uom_variance_labor,
            reason_for_variance,
            user_id
        } = req.body;

        if (!operation) {
            return res.status(400).json({ error: "Missing required query parameter: operation" });
        } else if (!confirmation_number) {
            return res.status(400).json({ error: "Missing required query parameter: confirmation_number" });
        } else if (!start_time) {
            return res.status(400).json({ error: "Missing required query parameter: start_time" });
        }

        try {
            await postgresdbService.insertOpConfirmation(
                wbe_machine,
                operation,
                mes_order,
                confirmation_number,
                marking_date,
                start_time,
                finish_time,
                marked_labor,
                uom_marked_labor,
                variance_labor,
                uom_variance_labor,
                reason_for_variance,
                user_id
            );
            res.status(200).json({ success: "Insert executed correctly"}); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/updateMarkingRecap", async (req, res) => {
        const { confirmation_number } = req.body;

        if (!confirmation_number) {
            return res.status(400).json({ error: "Missing required query parameter: confirmation_number" });
        }

        try {
            await postgresdbService.mark(confirmation_number);
            res.status(200).json({ success: "Query executed correctly"}); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    })
};

