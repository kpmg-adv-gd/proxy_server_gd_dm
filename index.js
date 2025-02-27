const express = require("express");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

const apiServiceOrderBom = require("./services/api/boms/listener");
const apiServiceWorkInstructionFile = require("./services/api/workInstructions/listener");
const apiServiceCompleteOperation = require("./services/api/complete/listener");
const apiServiceStartOperation = require("./services/api/start/listener");
const apiServiceCertifications = require("./services/api/certifications/listener");
const apiServicePodOperations = require("./services/api/podOperations/listener");
const apiServiceWorklist = require("./services/api/worklist/listener");
const apiServicefiltersPOD = require("./services/api/filtersPOD/listener");
const apiServiceResources = require("./services/api/resources/listener");
const apiServiceShifts = require("./services/api/shifts/listener");
const apiServiceBoms = require("./services/api/boms/listener");
const apiServiceOrders = require("./services/api/orders/listener");
const apiServiceUsers = require("./services/api/users/listener");
const apiServiceMaterials = require("./services/api/materials/listener");
const apiServiceRoutings = require("./services/api/routings/listener");
const mdoService = require("./services/mdo/listener");
const markingDbService = require("./services/postgres-db/services/marking/listener");
const varianceDbService = require("./services/postgres-db/services/variance/listener");

const whitelist = JSON.parse(process.env.WHITELIST);
// Middleware per il parsing del corpo della richiesta
app.use(express.json());
// Abilita CORS per tutte le richieste
app.use(cors({
    origin: whitelist, // Puoi specificare un array di domini consentiti
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


//Mi metto in ascolto su tutti i listener
apiServiceOrderBom.listenerSetup(app);
apiServiceWorkInstructionFile.listenerSetup(app);
apiServiceCompleteOperation.listenerSetup(app);
apiServiceStartOperation.listenerSetup(app);
apiServiceCertifications.listenerSetup(app);
apiServicePodOperations.listenerSetup(app);
apiServiceWorklist.listenerSetup(app);
apiServicefiltersPOD.listenerSetup(app);
apiServiceShifts.listenerSetup(app);
apiServiceResources.listenerSetup(app);
apiServiceBoms.listenerSetup(app);
apiServiceOrders.listenerSetup(app);
apiServiceUsers.listenerSetup(app);
apiServiceRoutings.listenerSetup(app);
apiServiceMaterials.listenerSetup(app);
mdoService.listenerSetup(app);
markingDbService.listenerSetup(app);
varianceDbService.listenerSetup(app);

// Avvia il server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});