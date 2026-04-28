const postgresdbService = require('./library');
const { callGet } = require('../../../../utility/CommonCallApi');

const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

module.exports.listenerSetup = (app) => {

    app.post("/db/getModificheBySfc", async (req, res) => {
        const { plant, sfc, order } = req.body;

        if (!plant || !sfc || !order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant , sfc or order" });
        }

        try {
            const modificheData = await postgresdbService.getModificheData(plant, sfc);
            var hasModificheMa = modificheData.some(el => el.type=="MA");
            var modificheMA = [];
            if(!hasModificheMa){
                modificheMA = await postgresdbService.getModificheDataGroupMA(plant, order);
            } else{
                modificheMA = modificheData.filter(el => {
                                if(el.type==="MA") return el;
                            });
            }
            
            var modificheMT_MK = modificheData.filter(el => {
                if(el.type!=="MA") return el;
            });

            // aggiungo il link delle modifiche
            const linkModifiche = await postgresdbService.getLinkModifiche(plant);
            if (linkModifiche != "") {
                modificheMT_MK.forEach(modifica => {
                    if (modifica.type === "MK") { 
                        modifica.link = linkModifiche + modifica.child_material;
                    }
                });
            }

            var returnModifiche = {modificheMA:modificheMA,modificheMT_MK:modificheMT_MK};
            res.status(200).json(returnModifiche);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }) 
    
    app.post("/db/updateStatusModifica", async (req, res) => {
        const { plant, prog_eco, newStatus } = req.body;

        if (!plant || !prog_eco || !newStatus ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, process_id , prog_eco or status" });
        }

        try {
            const responseUpdate = await postgresdbService.updateStatusModifica(plant, prog_eco, newStatus);
            res.status(200).json(responseUpdate); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/updateResolutionModificaMA", async (req, res) => {
        const { plant, process_id, userId } = req.body;

        if (!plant || !process_id ) {
            return res.status(400).json({ error: "Missing required query parameter: plant or process_id" });
        }

        try {
            var resolution = "MA applicata da " + userId;
            const responseUpdate = await postgresdbService.updateResolutionModificaMA(plant, process_id, resolution);
            res.status(200).json(responseUpdate); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/getOperationModificheBySfc", async (req, res) => {
        const { plant, project, order } = req.body;

        if (!plant || !project || !order ) {
            return res.status(400).json({ error: "Missing required query parameter: plant, project or order" });
        }

        try {
            const operationModificheResponse = await postgresdbService.getOperationModificheBySfc(plant, project, order);
            res.status(200).json(operationModificheResponse); 
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }) 

    app.post("/db/getModificheToTesting", async (req, res) => {
        const { plant, project } = req.body;
        if (!plant || !project) {
            return res.status(400).json({ error: "Missing required query parameter: plant , sfc or order" });
        }
        try {
            const modificheToTesting = await postgresdbService.getModificheToTesting(plant, project);
            res.status(200).json(modificheToTesting);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/getModificaDetail", async (req, res) => {
        const { plant, process_id, material } = req.body;
        if (!plant || !process_id || !material) {
            return res.status(400).json({ error: "Missing required query parameter: plant, process_id or material" });
        }
        try {
            const modificaDetail = await postgresdbService.getModificaDetail(plant, process_id, material);
            const enrichedDetail = await Promise.all(
                modificaDetail.map(async (obj) => {
                    try {
                        const url = hostname + "/material/v2/materials?plant=" + plant + "&material=" + obj.child_material;
                        const materialData = await callGet(url);
                        const description = materialData && materialData.content && materialData.content .length > 0 ? materialData.content[0].description : null;
                        return { ...obj, child_material_description: description };
                    } catch (err) {
                        return { ...obj, child_material_description: null };
                    }
                })
            );
            res.status(200).json(enrichedDetail);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }) 
        
};

