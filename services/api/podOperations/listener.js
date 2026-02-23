const { getPodOperations, getPodOperationsTI } = require("./library");
const postgresdbService = require("../../postgres-db/services/verbali/library");
const { callGet } = require("../../../utility/CommonCallApi");
const { updateCustomField } = require("../../../utility/CommonFunction");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
// Carica le credenziali da variabili d'ambiente
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

module.exports.listenerSetup = (app) => {

    app.post("/api/getPodOperations", async (req, res) => {
        try {
            const { plant, workcenter, sfc, routing, type, version, orderType } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !workcenter || !sfc || !routing || !type || !version) {
                return res.status(400).json({ error: "Missing required parameters: plant/workcenter/routing/type/version" });
            }
            var urlWorkCenter = hostname+"/workcenter/v2/workcenters?plant="+plant+"&workCenter="+workcenter;
            var urlRouting = hostname+"/routing/v1/routings?plant="+plant+"&routing="+routing+"&type="+type+"&version="+version;
            var urlSfcDetails = hostname+"/sfc/v1/sfcdetail?plant="+plant+"&workCenter="+workcenter+"&sfc="+sfc;
            
            var responseWorkCenter = await callGet(urlWorkCenter);
            var responseRouting = await callGet(urlRouting);
            var responseSfcDetails = await callGet(urlSfcDetails);
            
            var ordersGroup = await getZSharedMemoryData("ALL", "ORDERS_GROUP");
            if (ordersGroup.length > 0) ordersGroup = ordersGroup[0].value;
            var filteredData = getPodOperations(responseRouting,responseSfcDetails,responseWorkCenter,orderType,req.body,ordersGroup);
            res.status(200).json({result: filteredData});
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/getPodOperationsTI", async (req, res) => {
        try {
            const { plant, order, sfc } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !order || !sfc) {
                return res.status(400).json({ error: "Missing required parameters: plant/order/sfc" });
            }

            // Calcolo dello stato del primo livello in base ai secondi livelli
            var url = hostname+"/sfc/v1/sfcdetail?plant="+plant+"&sfc="+sfc;
            var responseSfcDetails = await callGet(url);

            var urlRouting = hostname+"/routing/v1/routings?plant="+plant+"&routing="+order+"&type=SHOP_ORDER";
            var responseRouting = await callGet(urlRouting);
            var primoLivello = getPodOperationsTI(responseRouting);
            // recupero secondo livello del primo livello
            for (var i=0; i<primoLivello.length; i++){
                var secondoLivello = await postgresdbService.getVerbaleLev2ByLev1(plant, order, sfc, primoLivello[i].id);
                var status = responseSfcDetails.steps.filter(step => step.stepId == primoLivello[i].id)[0];
                if (status.quantityInQueue == 1) { 
                    if (responseSfcDetails.status.code == "401") {
                        primoLivello[i].status = 'New';
                    }else{
                        primoLivello[i].status = 'In Queue';
                    }
                } else if (status.quantityInWork == 1) {
                    primoLivello[i].status = 'In Work';
                } else if (status.quantityDone == 1) {
                    primoLivello[i].status = 'Done';
                }
                primoLivello[i].datetime = secondoLivello.length > 0 ? secondoLivello[0].date_lev_1 : null;
                // Calcolo percentuale completamento del primo livello, facendo media ponderata sul time_lev_2
                var totalTimeDone = 0, totalTime = 0, idsAnalizzati = [];
                secondoLivello.forEach(element => {
                    if (!idsAnalizzati.includes(element.id_lev_2)) {
                        if (element.status == 'Done') {
                            totalTimeDone += element.time_lev_2;
                        }
                        totalTime += element.time_lev_2;
                        idsAnalizzati.push(element.id_lev_2);
                    }
                });
                var percent = totalTime == 0 ? 0 : ((totalTimeDone / totalTime) * 100);
                primoLivello[i].percent = Math.floor(Math.round(percent * 100) / 100);

                primoLivello[i].SecondoLivello = secondoLivello;
            }

            res.status(200).json({result: primoLivello});
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

    app.post("/api/updateCustomFieldOrder", async (req, res) => {
        try {
            const { plant, order, customField } = req.body;
            // Verifica che i parametri richiesti siano presenti
            if (!plant || !order || !customField) {
                return res.status(400).json({ error: "Missing required parameters: plant/order/customField" });
            }

            await updateCustomField(plant, order, customField);
            res.status(200).json({ result: "Custom field updated successfully" });
            
        } catch (error) {
            let status = error.status || 500;
            let errMessage = error.message || "Internal Server Error";
            console.error("Error calling external API:", errMessage);
            res.status(status).json({ error: errMessage });
        }
    });

};


