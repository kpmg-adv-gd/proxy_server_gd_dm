const { updateStatusModifica, getIfModificaMAIsApplied, updateResolutionModificaMA } = require("../../postgres-db/services/modifiche/library");
const { sendModificaToSAP } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/sendAndUpdateModifiche", async (req, res) => {

        try {
            const { plant, wbe, process_id, prog_eco, newStatus, material, child_material, type, objOrder, item, resolution } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }

            let response = await sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,objOrder,item,resolution);

            if(type=="MK" || type=="MT"){
                await updateStatusModifica(plant,prog_eco,newStatus);
            } else if (type=="MA"){
                await updateResolutionModificaMA(plant, wbe, process_id, child_material, resolution);
                let allModificaMaIsApplied = await getIfModificaMAIsApplied(plant, wbe, process_id);
                if(allModificaMaIsApplied.length==0){
                    await sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,objOrder,item,resolution);
                }
            }
            res.status(200).json(response);

        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


