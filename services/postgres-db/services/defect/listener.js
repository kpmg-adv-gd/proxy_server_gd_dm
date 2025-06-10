const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/insertDefect", async (req, res) => {
        const { idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, notificationType, coding, replaceInAssembly, defectNote, responsible, time, sfc } = req.body;
        try {
            const result = await postgresdbService.insertZDefect(idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, notificationType, coding, replaceInAssembly, defectNote, responsible, time, sfc);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/selectZDefect", async (req, res) => {
        const { listDefect } = req.body;
        try {
            const result = await postgresdbService.selectZDefect(listDefect);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });
    
    app.post("/db/selectDefectToApprove", async (req, res) => {
        try {   
            const result = await postgresdbService.selectDefectToApprove();
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/cancelDefectQN", async (req, res) => {
        const { defectId, userId } = req.body;
        try {
            const result = await postgresdbService.cancelDefectQN(defectId, userId);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/approveDefectQN", async (req, res) => {
        const { defectId, userId } = req.body;
        try {
            const result = await postgresdbService.approveDefectQN(defectId, userId);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/selectDefectForReport", async (req, res) => {
        const { sfcs, startDate, endDate } = req.body;
        try {
            // Creo la query dinamina in base ai parametri ricevuti
            let query = "SELECT * FROM z_defects WHERE 1=1";
            if (sfcs && sfcs.length > 0) {
                query += ` AND sfc IN (${sfcs.map(sfc => `'${sfc}'`).join(", ")})`;
            }
            if (startDate) {
                query += ` AND creation_date >= '${startDate}'`;
            }
            if (endDate) {
                query += ` AND creation_date <= '${endDate}'`;
            }
            const result = await postgresdbService.selectDefectForReport(query);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

};