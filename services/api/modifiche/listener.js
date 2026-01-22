const { updateStatusModifica, updateStatusModificaMA, getAllModificaMA } = require("../../postgres-db/services/modifiche/library");
const { getOrderInfoByOrder } = require("../../../utility/CommonFunction");
const { sendModificaToSAP, getModificheTestingData } = require("./library");

module.exports.listenerSetup = (app) => {

    app.post("/api/sendAndUpdateModifiche", async (req, res) => {

        try {
            const { plant, wbe, process_id, prog_eco, newStatus, material, child_material, type, order, resolution, note } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant) {
                return res.status(400).json({ error: "Missing required parameter: plant" });
            }
            var response = "";

            if(type=="MK" || type=="MT"){

                await updateStatusModifica(plant,prog_eco,newStatus,note);

                var infoOrder = await getOrderInfoByOrder(plant,order);
                var objOrder = "";
                var item = "";
                let orderTypeField = infoOrder?.customValues.find(obj => obj.attribute == "ORDER_TYPE");
                let orderType = orderTypeField?.value || "";
                if(orderType=="ZPA1" || orderType=="ZPA2" || orderType=="ZPF1" || orderType=="ZPF2"){
                    objOrder=order;
                } else if(orderType=="GRPF"){
                    let purchaseOrderField = infoOrder?.customValues.find(obj => obj.attribute == "PURCHASE_ORDER");
                    let purchaseOrderValue = purchaseOrderField?.value || "";
                    let purchaseOrderPositionField = infoOrder?.customValues.find(obj => obj.attribute == "PURCHASE_ORDER_POSITION");
                    let purchaseOrderPositionValue = purchaseOrderPositionField?.value || "";
                    objOrder = purchaseOrderValue;
                    item = purchaseOrderPositionValue;
                }
                response = await sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,objOrder,item,resolution,"","");
                
            } else if (type=="MA"){

                await updateStatusModificaMA(plant, wbe, process_id, child_material, newStatus, resolution, note);

                if(newStatus=="1"){
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const year = now.getFullYear();
                    const dateNowFormatted = `${day}/${month}/${year}`;
                    let allModificheMA = await getAllModificaMA(plant, wbe, process_id);
                    let allModificheApplied = allModificheMA.filter(el => el.status == "1");
                    if(allModificheMA.length == 1 && allModificheApplied.length == 1){ //Ho solo una MA => invio apertura e chiusura a SAP
                        response = await sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,"","",resolution,dateNowFormatted,dateNowFormatted); 
                    } else if(allModificheMA.length==allModificheApplied.length){ //Tutte le modifiche corrispondenti alla modifica MA di quel processs id sono state applicate => invio a sap la chiusura
                        response = await sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,"","",resolution,"",dateNowFormatted);
                    } else if(allModificheApplied.length == 1){ //E' stata applicata la prima modifica => invio inizio moficihe a SAP
                        response = await sendModificaToSAP(plant,wbe,process_id,prog_eco,newStatus,material,child_material,type,"","","",dateNowFormatted,"");
                    }
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

    // Endpoint per recuperare modifiche Testing in formato tree table
    app.post("/api/getModificheTesting", async (req, res) => {
        try {
            const { plant, project } = req.body;
            if (!plant || !project) {
                return res.status(400).json({ error: "Missing required parameters: plant, project" });
            }

            const result = await getModificheTestingData(plant, project);
            
            if (result === false) {
                return res.status(500).json({ error: "Error retrieving modifiche testing data" });
            }

            res.status(200).json(result);
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error in getModificheTesting:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


