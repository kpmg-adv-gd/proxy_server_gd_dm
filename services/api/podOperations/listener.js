const { getPodOperations } = require("./library");
const { callGet } = require("../../../utility/CommonCallApi");
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

};


