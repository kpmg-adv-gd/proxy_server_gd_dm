const { getProjectsVerbaliTesting } = require('./library');

module.exports.listenerSetup = (app) => {

    // Endpoint per ottenere i progetti per filtro su supervisore testing
    app.post('/queryMDO/getProjectsVerbaliTesting', async (req, res) => {
        try {
            const { plant } = req.body;
            if (!plant) {
                return res.status(400).json({ error: 'Missing required parameter: plant' });
            }
            const projects = await getProjectsVerbaliTesting(plant);
            res.status(200).json(projects);
        } catch (error) {
            console.error('Error in getProjectsVerbaliTesting:', error);
            const status = error.status || 500;
            const errMessage = error.message || 'Internal Server Error';
            res.status(status).json({ error: errMessage });
        }
    });

};