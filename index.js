const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 3000;

const iFlowManageElectricalBoxFromSAPService = require("./services/iFlow/MANAGE_ELECTRICAL_BOX/listener");
const iFlowOperationsMarkingMAFromSAPService = require("./services/iFlow/OPERATIONS_MA_MARKING_FROM_SAP/listener");
const iFlowManageModificheFromSAPService = require("./services/iFlow/MANAGE_MODIFICHE_FROM_SAP/listener");
const iFlowManageMancantiFromSAPService = require("./services/iFlow/MANAGE_MANCANTI_FROM_SAP/listener");
const iFlowManageDefectsFromSAPService = require("./services/iFlow/MANAGE_DEFECTS_FROM_SAP/listener");
const iFlowPopulateZTablesService = require("./services/iFlow/POPULATE_Z_TABLES/listener");
const iFlowUpdateCertificationService = require("./services/iFlow/UPDATE_CERTIFICATION/listener");
const iFlowRelabelSfcService = require("./services/iFlow/RELABEL_SFC/listener");
const iFlowReleaseOrderSfcService = require("./services/iFlow/RELEASE_ORDER_SFC/listener");
const iFlowUpdateRoutingService = require("./services/iFlow/UPDATE_ROUTING/listener");
const iFlowServiceLOIPROPostService = require("./services/iFlow/LOIPRO05_CST_POST_SERVICE/listener");
const iFlowServiceLOIPROPostXSLT = require("./services/iFlow/LOIPRO05_CST_POST_XSLT/listener");
const apiServiceFilterMarkingReport = require("./services/api/marking/listener");
const apiServiceOrderBom = require("./services/api/boms/listener");
const apiServiceWorkInstructionFile = require("./services/api/workInstructions/listener");
const apiServiceCompleteOperation = require("./services/api/complete/listener");
const apiServiceStartOperation = require("./services/api/start/listener");
const apiServiceCertifications = require("./services/api/certifications/listener");
const apiServicePodOperations = require("./services/api/podOperations/listener");
const apiServiceWorklist = require("./services/api/worklist/listener");
const apiServicefiltersPOD = require("./services/api/filtersPOD/listener");
const apiServiceResources = require("./services/api/resources/listener");
const apiServiceBoms = require("./services/api/boms/listener");
const apiServiceOrders = require("./services/api/orders/listener");
const apiServiceUsers = require("./services/api/users/listener");
const apiServiceMaterials = require("./services/api/materials/listener");
const apiServiceRoutings = require("./services/api/routings/listener");
const apiServiceDefects = require("./services/api/defects/listener");
const mdoService = require("./services/mdo/listener");
const sharedMemoryDbService = require("./services/postgres-db/services/shared_memory/listener");
const electricalBoxDbService = require("./services/postgres-db/services/electrical_box/listener");
const modificheDbService = require("./services/postgres-db/services/modifiche/listener");
const markingDbService = require("./services/postgres-db/services/marking/listener");
const varianceDbService = require("./services/postgres-db/services/variance/listener");
const priorityDbService = require("./services/postgres-db/services/priority/listener");
const codingDbService = require("./services/postgres-db/services/coding/listener");
const responsibleDbService = require("./services/postgres-db/services/responsible/listener");
const notificationTypeDbService = require("./services/postgres-db/services/notification_type/listener");
const defectDbService = require("./services/postgres-db/services/defect/listener");
const unproductiveDbService = require("./services/postgres-db/services/unproductive/listener");


const app = express();

const whitelist = JSON.parse(process.env.WHITELIST);
// Middleware per il parsing del corpo della richiesta (Impostare un limite di 50 MB per il corpo della richiesta)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Abilita CORS per tutte le richieste
app.use(cors({
    origin: '*', // Puoi specificare un array di domini consentiti
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));



//Mi metto in ascolto su tutti i listener
iFlowManageElectricalBoxFromSAPService.listenerSetup(app);
iFlowOperationsMarkingMAFromSAPService.listenerSetup(app);
iFlowManageModificheFromSAPService.listenerSetup(app);
iFlowPopulateZTablesService.listenerSetup(app);
iFlowManageMancantiFromSAPService.listenerSetup(app);
iFlowManageDefectsFromSAPService.listenerSetup(app);
iFlowUpdateCertificationService.listenerSetup(app);
iFlowRelabelSfcService.listenerSetup(app);
iFlowReleaseOrderSfcService.listenerSetup(app);
iFlowUpdateRoutingService.listenerSetup(app);
apiServiceFilterMarkingReport.listenerSetup(app);
iFlowServiceLOIPROPostService.listenerSetup(app);
iFlowServiceLOIPROPostXSLT.listenerSetup(app);
apiServiceOrderBom.listenerSetup(app);
apiServiceWorkInstructionFile.listenerSetup(app);
apiServiceCompleteOperation.listenerSetup(app);
apiServiceStartOperation.listenerSetup(app);
apiServiceCertifications.listenerSetup(app);
apiServicePodOperations.listenerSetup(app);
apiServiceWorklist.listenerSetup(app);
apiServicefiltersPOD.listenerSetup(app);
apiServiceResources.listenerSetup(app);
apiServiceBoms.listenerSetup(app);
apiServiceOrders.listenerSetup(app);
apiServiceUsers.listenerSetup(app);
apiServiceRoutings.listenerSetup(app);
apiServiceMaterials.listenerSetup(app);
apiServiceDefects.listenerSetup(app);
mdoService.listenerSetup(app);
sharedMemoryDbService.listenerSetup(app);
electricalBoxDbService.listenerSetup(app);
modificheDbService.listenerSetup(app);
markingDbService.listenerSetup(app);
varianceDbService.listenerSetup(app);
priorityDbService.listenerSetup(app);
priorityDbService.listenerSetup(app);
priorityDbService.listenerSetup(app);
priorityDbService.listenerSetup(app);
codingDbService.listenerSetup(app);
responsibleDbService.listenerSetup(app);
notificationTypeDbService.listenerSetup(app);
defectDbService.listenerSetup(app);
unproductiveDbService.listenerSetup(app);

// Avvia il server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
