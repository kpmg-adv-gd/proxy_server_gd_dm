const postgresdbService = require('./connection');
const queryLibrary = require('./library');


module.exports.listenerSetup = (app) => {
    app.get("/db/getReasonsForVariance", async (req, res) => {
        // const { query } = req.body;

        // if (!query) {
        //     return res.status(400).json({ error: 'La query è obbligatoria nel corpo della richiesta.' });
        // }

        try {
            const data = await postgresdbService.executeQuery(queryLibrary.getReasonsForVarianceQuery);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
        }

        // let queryResult = postgresdbService.executeQuery(queryLibrary.queryTest);
        // let response = res.status(response["code"]).send({ message: queryResult });
    });

    app.get("/db/getMarkingData", async (req, res) => {
        try {
            const data = await postgresdbService.executeQuery(queryLibrary.getMarkingDataQuery);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
        }
    })
};
