const { manageRouting } = require("./library");


module.exports.listenerSetup = (app) => {

    app.post("/iFlow/updateRoutingSimultaneous", async (req, res) => {

            try {
                
                const { plant, orderNumber, orderedQuantity, routingRef, bomRef, customValues } = req.body;
                await manageRouting(plant,orderNumber,routingRef,bomRef,customValues);

                res.status(200).send("Servizio completato con successo"); 
            } catch (error) {
                let status = error.status || 500;
                let errMessage = error.message || "Internal Server Error";
                console.error("Error processing XML:", errMessage);
                res.status(status).json({ error: errMessage });
            }

    });
};
