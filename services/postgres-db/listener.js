const postgresdbService = require('./connection');
const queryLibrary = require('./library');


module.exports.listenerSetup = (app) => {

    // Endpoint per eseguire query
    app.post('/postgresDB/query', async (req, res) => {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'La query è obbligatoria nel corpo della richiesta.' });
        }

        try {
            const data = await postgresdbService.executeQuery(query);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
        }
    });
    
    app.get("/db/getReasonsForVariance", async (req, res) => {
        try {
            const data = await postgresdbService.executeQuery(queryLibrary.getReasonsForVarianceQuery);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
        }
    });

    app.get("/db/getMarkingData", async (req, res) => {
        const { wbe_machine, mes_order, operation } = req.query;

        if (!wbe_machine || !mes_order || !operation) {
            return res.status(400).json({ error: "I parametri 'wbe_machine', 'mes_order' e 'operation' sono obbligatori." });
        }

        try {
            const data = await postgresdbService.executeQuery(queryLibrary.getMarkingDataQuery, [wbe_machine, mes_order, operation]);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
        }
    }),

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
                return res.status(400).json({ error: "Il parametro operation è obbligatorio" });
            } else if (!confirmation_number) {
                return res.status(400).json({ error: "Il parametro confirmation_number è obbligatorio" });
            } else if (!start_time) {
                return res.status(400).json({ error: "Il parametro start_time è obbligatorio" });
            }

            try {
                await postgresdbService.executeQuery(queryLibrary.insertOpConfirmation, [
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
                ]);
                res.status(200).json({ message: "Dati inseriti con successo!" });
            } catch (error) {
                console.error("Errore durante l'inserimento:", error);
                res.status(500).json({ error: "Errore durante l'inserimento dei dati." });
            }
        }),

        app.get("/db/getZOrdersLinkByProjectParentOrderChildOrderFlag", async (req, res) => {
            const { project, parentOrder, childOrder, parentAssemblyFlag } = req.query;

            if (!project) {
                return res.status(400).json({ error: "Il parametro project è obbligatorio" });
            } else if (!parentOrder) {
                return res.status(400).json({ error: "Il parametro parentOrder è obbligatorio" });
            } else if (!childOrder) {
                return res.status(400).json({ error: "Il parametro childOrder è obbligatorio" });
            } else if (!!!parentAssemblyFlag) {
                return res.status(400).json({ error: "Il parametro parentAssemblyFlag è obbligatorio" });
            }

            try {
                const data = await postgresdbService.executeQuery(queryLibrary.getZOrdersLinkByProjectParentOrderChildOrderFlagQuery, [project, parentOrder, childOrder, parentAssemblyFlag]);
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
            }
        });

        app.post("/db/updateMarkingRecap", async (req, res) => {
            try {
                const { confirmation_number } = req.body;
        
                if (!confirmation_number) {
                    return res.status(400).json({ error: "Missing required parameter: confirmation_number" });
                }
        
                const sumResult = await postgresdbService.executeQuery(queryLibrary.calculateLabor, [confirmation_number]);
                if (!sumResult || sumResult.length === 0) {
                    return res.status(404).json({ error: "No data found for confirmation_number" });
                }
        
                const { marked_labor, variance_labor } = sumResult[0];
        
                const plannedLaborResult = await postgresdbService.executeQuery(queryLibrary.getPlannedLabor, [confirmation_number]);
                if (!plannedLaborResult || plannedLaborResult.length === 0) {
                    return res.status(404).json({ error: "No planned labor data found for confirmation_number" });
                }
        
                const planned_labor = plannedLaborResult[0].planned_labor;
        
                const remaining_labor = planned_labor - marked_labor;
        
                await postgresdbService.executeQuery(queryLibrary.updateMarkingRecap, [marked_labor, variance_labor, remaining_labor, confirmation_number]);
        
                res.json({ success: true, message: "Marking recap updated successfully" });
        
            } catch (error) {
                console.error("Error updating marking recap:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        });
        
};

