const { manageRelabelSfc } = require("./library");


module.exports.listenerSetup = (app) => {

    app.post("/iFlow/relableSfc", async (req, res) => {

            try {
                
                const { plant, order, sfcsJson } = req.body;
                console.log("sfcsJson= "+sfcsJson);
                let sfcs = JSON.parse(sfcsJson);
                await manageRelabelSfc(plant,order,sfcs);

                res.status(200).send("sistema contatato - top"); 
            } catch (error) {
                let status = error.status || 500;
                let errMessage = error.message || "Internal Server Error";
                console.error("Error processing XML:", errMessage);
                res.status(status).json({ error: errMessage });
            }

    });
};
