const { manageCertifications } = require("./library");


module.exports.listenerSetup = (app) => {

    app.post("/iFlow/updateCertification", async (req, res) => {

            try {
                const { plant } = req.body;

                let response  = await manageCertifications(plant);

                res.status(200).send("sistema contatato - top"+response); 
            } catch (error) {
                let status = error.status || 500;
                let errMessage = error.message || "Internal Server Error";
                console.error("Error processing XML:", errMessage);
                res.status(status).json({ error: errMessage });
            }

    });
};
