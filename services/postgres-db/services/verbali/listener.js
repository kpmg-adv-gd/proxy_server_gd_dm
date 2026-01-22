const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    // Api per ottenere righe POD Selection
    app.post("/db/getVerbaleLev2NotDone", async (req, res) => {
        const { plant, workcenter, project, customer, co } = req.body;
        try {
            const verbali = await postgresdbService.getVerbaleLev2NotDone(plant, workcenter, project, customer, co);
            res.status(200).json(verbali); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // Api per ottenere tutti machine type
    app.post("/db/getAllMachineType", async (req, res) => {
        const { plant, sfc } = req.body;
        try {
            const allMachineType = await postgresdbService.getAllMachineType(plant, sfc);
            res.status(200).json(allMachineType); 
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });  

    // Api per ottenere info su task terzo livello
    app.post("/db/getInfoTerzoLivello", async (req, res) => {
        const { plant, sfc, id_lev_1,  id_lev_2, id_lev_3, machine_type } = req.body;
        try {
            var infoTerzoLivello = await postgresdbService.getInfoTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type);
            var history = [];
            if (infoTerzoLivello.length > 0) {
                if (infoTerzoLivello[0].status_lev_3 != 'New') {
                    history.push({
                        action: "START",
                        datetime: infoTerzoLivello[0].start_date,
                        user: infoTerzoLivello[0].start_user
                    });
                }
                if (infoTerzoLivello[0].status_lev_3 == 'Done') {
                    history.push({
                        action: "COMPLETE",
                        datetime: infoTerzoLivello[0].complete_date,
                        user: infoTerzoLivello[0].complete_user
                    });
                }
            }
            var details = {
                history: history,
                comments: await postgresdbService.getCommentsVerbale(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type)
            };
            res.status(200).json(details);
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // Api per salvare commento
    app.post("/db/saveCommentsVerbale", async (req, res) => {
        const { plant, sfc, wbe, id_lev_1, id_lev_2, id_lev_3, machine_type, user, comment, comment_type, status } = req.body;
        try {
            await postgresdbService.saveCommentsVerbale(plant, sfc, wbe, id_lev_1, id_lev_2, id_lev_3, machine_type, user, comment, comment_type, status);
            res.status(200).json({ message: "Comments saved successfully" });
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // Api per ottenere stato approvazione commenti
    app.post("/db/getCommentsVerbaleForApproval", async (req, res) => {
        const { plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type } = req.body;
        try {
            const status = await postgresdbService.getCommentsVerbaleForApproval(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type);
            res.status(200).json({ status });
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // Api per fare start task terzo livello
    app.post("/db/startTerzoLivello", async (req, res) => {
        const { plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, order, operation, user } = req.body;
        try {
            var execute = await postgresdbService.startTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, order, operation, user);
            if (execute.result) {
                res.status(200).json({ message: execute.message });
            }else{
                res.status(500).json({ error: execute.message });
            }
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // Api per fare complete task terzo livello
    app.post("/db/completeTerzoLivello", async (req, res) => {
        const { plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, order, operation, user } = req.body;
        try {
            var execute = await postgresdbService.completeTerzoLivello(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type, order, operation, user);
            if (execute.result) {
                res.status(200).json({ message: execute.message });
            }else{
                res.status(500).json({ error: execute.message });
            }
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // Api per aggiornare apertura di un difetto su terzo livello
    app.post("/db/updateNonConformanceLevel3", async (req, res) => {
        const { plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type } = req.body;
        try {
            await postgresdbService.updateNonConformanceLevel3(plant, sfc, id_lev_1, id_lev_2, id_lev_3, machine_type);
            res.status(200).json({ message: "Non conformance updated successfully" });
        } catch (error) {
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    // ------------- SVILUPPO TILE SUPERIVISORE ASSEMBLY ------------------
    
    // Endepoint per ottenere la tabella custom NC
    app.post("/db/getCustomTableNC", async (req, res) => {
        try {
            const { plant, order } = req.body;
            var result = await postgresdbService.getCustomTableNC(plant, order);
            if (!result) {
                res.status(500).json({ error: "Error while executing query" });
            } else
            res.status(200).json(result);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });
    // Endepoint per ottenere la tabella custom Results
    app.post("/db/getCustomTableResults", async (req, res) => {
        try {
            const { plant, order } = req.body;
            var result = await postgresdbService.getCustomTableResults(plant, order);
            res.status(200).json(result);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json({ error: errMessage });
        }
    });


};