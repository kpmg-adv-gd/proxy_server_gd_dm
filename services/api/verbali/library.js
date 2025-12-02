const { callPatch } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { ordersChildrenRecursion } = require("../../postgres-db/services/verbali/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

// Funzione per ottenere i verbali del supervisore assembly
async function getVerbaliSupervisoreAssembly(plant, project, wbs, showAll) {
    var results = [];
    try {
        const filter = `(DATA_FIELD eq 'ORDER_TYPE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'MACH')`;
        const mockReq = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter})` },
            method: "GET"
        };
        var outMock = await dispatch(mockReq);
        var orders = outMock?.data?.value.length>0 ? outMock.data.value : [];
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            var data = { order: mfg_order };
            // Recupero progetto
            var projectFilter = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqProject = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${projectFilter})` },
                method: "GET"
            };
            var outMockProject = await dispatch(mockReqProject);
            var projectData = outMockProject?.data?.value.length>0 ? outMockProject.data.value : [];
            if (projectData.length > 0) data.project = projectData[0].DATA_FIELD_VALUE;
            else continue;
            // Recupero WBS
            var wbsFilter = `(DATA_FIELD eq 'WBE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqWbs = { 
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${wbsFilter})` },
                method: "GET"
            };
            var outMockWbs = await dispatch(mockReqWbs);
            var wbsData = outMockWbs?.data?.value.length>0 ? outMockWbs.data.value : [];
            if (wbsData.length > 0) data.wbs = wbsData[0].DATA_FIELD_VALUE;
            else continue;
            // Recupero SFC - Material - Status (diverso di INVALID)
            var sfcFilter = `(MFG_ORDER eq '${mfg_order}' and STATUS ne 'INVALID' and PLANT eq '${plant}')`;
            var mockReqSfc = {
                path: "/mdo/SFC",
                query: { $apply: `filter(${sfcFilter})` },
                method: "GET"
            };
            var outMockSfc = await dispatch(mockReqSfc);
            var sfcData = outMockSfc?.data?.value.length>0 ? outMockSfc.data.value : [];
            if (sfcData.length > 0) { data.sfc = sfcData[0].SFC; data.material = sfcData[0].MATERIAL; data.status = sfcData[0].STATUS; }
            else continue;
            // Recupero Report Status
            var reportStatusFilter = `(DATA_FIELD eq 'ASSEMBLY_REPORT_STATUS' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqReportStatus = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${reportStatusFilter})` },
                method: "GET"
            };
            var outMockReportStatus = await dispatch(mockReqReportStatus);
            var reportStatusData = outMockReportStatus?.data?.value.length>0 ? outMockReportStatus.data.value : [];
            if (reportStatusData.length > 0) data.reportStatus = reportStatusData[0].DATA_FIELD_VALUE;
            else data.reportStatus = "";
            // Filtri su progetto e wbs
            if (project != "" && data.project != project) continue;
            if (wbs != "" && data.wbs != wbs) continue;
            if (!showAll && data.reportStatus === "DONE") continue;
            // Aggiungo elemento
            results.push(data);
        }
        // Una volta estratti i dati, genero la TreeTable
        return generateTreeTable(results);
    } catch (error) {
        return false
    }
}

// Funzione per ottenere i progetti per filtro su supervisore assembly
async function getProjectsVerbaliSupervisoreAssembly(plant) {
    var projects = [];
    try {
        const filter = `(DATA_FIELD eq 'ORDER_TYPE' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND DATA_FIELD_VALUE eq 'MACH')`;
        const mockReq = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${filter})` },
            method: "GET"
        };
        var outMock = await dispatch(mockReq);
        var orders = outMock?.data?.value.length>0 ? outMock.data.value : [];
        for (var i = 0; i < orders.length; i++) {
            var mfg_order = orders[i].MFG_ORDER;
            // Recupero progetto
            var projectFilter = `(DATA_FIELD eq 'COMMESSA' and PLANT eq '${plant}' AND IS_DELETED eq 'false' AND MFG_ORDER eq '${mfg_order}')`;
            var mockReqProject = {
                path: "/mdo/ORDER_CUSTOM_DATA",
                query: { $apply: `filter(${projectFilter})` },
                method: "GET"
            };
            var outMockProject = await dispatch(mockReqProject);
            var projectData = outMockProject?.data?.value.length>0 ? outMockProject.data.value : [];
            if (projectData.length > 0 && !projects.some(p => p.project === projectData[0].DATA_FIELD_VALUE)) 
                projects.push({ project: projectData[0].DATA_FIELD_VALUE });
        }
        return projects;
    } catch (error) {
        return false;
    }
}

async function updateCustomAssemblyReportStatusOrderInWork(plant,order) {
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute":"ASSEMBLY_REPORT_STATUS", "value": "IN_WORK" },
    ];
    let body={
        "plant":plant,
        "order":order,
        "customValues": customValues
    };
    await callPatch(url,body);
}

async function updateCustomAssemblyReportStatusOrderDone(plant,order,user){
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [
        { "attribute":"ASSEMBLY_REPORT_STATUS", "value": "DONE" },
        { "attribute":"ASSEMBLY_REPORT_USER", "value": user },
    ];
    let body={
        "plant":plant,
        "order":order,
        "customValues": customValues
    };
    await callPatch(url,body);
}

async function updateCustomSentTotTestingOrder(plant,order,user) {
    var ordersToCheck = await ordersChildrenRecursion(plant, order);
    let url = hostname + "/order/v1/orders/customValues";
    let customValues = [ { "attribute":"SENT_TO_TESTING", "value": true } ];
    // Salvo il campo custom per ogni ordine trovato
    for (var i = 0; i < ordersToCheck.length; i++) {
        let body={
            "plant":plant,
            "order":ordersToCheck[i],
            "customValues": customValues
        };
        await callPatch(url,body);
    }
}

// utils
function generateTreeTable(data) { 
    var tree = [];
    console.log("MARCO TREE: " + JSON.stringify(data));
    for (var i = 0; i < data.length; i++) {
        var child = {
            project_parent: data[i].project,
            wbs: data[i].wbs,
            sfc: data[i].sfc,
            material: data[i].material,
            status: data[i].status,
            reportStatus: data[i].reportStatus,
            order: data[i].order
        }
        if (!tree.some(e => e.project === data[i].project)) {
            tree.push({ project: data[i].project, Children: [child] });
        } else {
            tree.find(e => e.project === data[i].project).Children.push(child);
        }
    }
    return tree;
}



// Esporta la funzione
module.exports = { getVerbaliSupervisoreAssembly, getProjectsVerbaliSupervisoreAssembly, generateTreeTable, updateCustomAssemblyReportStatusOrderDone, updateCustomAssemblyReportStatusOrderInWork, updateCustomSentTotTestingOrder };