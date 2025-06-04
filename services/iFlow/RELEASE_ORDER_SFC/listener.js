const { manageRelease } = require("./library");


module.exports.listenerSetup = (app) => {

    app.post("/iFlow/releaseOrderAndSfc", async (req, res) => {

            try {
                
                const { plant, routing } = req.body;
                
                await manageRelease(plant,routing);
                
                res.status(200).send("sistema contatato - top"); 
            } catch (error) {
                let status = error.status || 500;
                let errMessage = error.message || "Internal Server Error";
                console.error("Error processing XML:", errMessage);
                res.status(status).json({ error: errMessage });
            }

    });
};
