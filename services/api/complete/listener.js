const { manageCompleteSfcPhase } = require("./library");
const { logCompleteOperation } = require("../../postgres-db/services/logs_start_complete/library");

module.exports.listenerSetup = (app) => {

    app.post("/api/sfc/v1/sfcs/complete", async (req, res) => {
        try {
            const { plant, project, order, orderMaterial, operation, resource, sfc, checkModificheLastOperation,valueModifica, checkMancantiLastOperation, checkMachLastOperation, userId  } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !operation || !resource || !sfc || !project || !order || !orderMaterial ) {
                return res.status(400).json({ error: "Missing one of required parameters: plant, project, order, orderMaterial, operation, resource, sfc" });
            }

            var response = await manageCompleteSfcPhase(plant,project,order,orderMaterial,operation,resource,sfc,checkModificheLastOperation,valueModifica,checkMancantiLastOperation,checkMachLastOperation);

            await logCompleteOperation(plant, sfc, operation, userId);

            res.status(200).json(response);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            res.status(status).json(errMessage);
        }
    });

};


