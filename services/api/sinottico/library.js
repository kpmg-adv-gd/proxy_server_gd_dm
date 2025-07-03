const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZOrdersLinkMachByPlantProjectOrderTypeMachineSection, getZOrdersLinkByPlantProjectAndParentOrder, getAllMachMaterials, getMachOrderByComponentOrder } = require("../../postgres-db/services/orders_link/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function getSinotticoBomMultilivelloReportData(plant, project, machineMaterial, callFrom, order) {
    let machineOrderRow = [];
    if (callFrom === "SinotticoReport") {
        machineOrderRow = await getZOrdersLinkMachByPlantProjectOrderTypeMachineSection(plant, project, "MACH", machineMaterial);
    } else if (callFrom === "POD") {
        machineOrderRow = await getMachOrderByComponentOrder(plant, project, order);
    }

    if (machineOrderRow.length === 0) {
        throw { status: 500, message: "Machine Order Not Found on SAP DM" };
    }

    const { child_material: childMaterial, child_order: childOrder } = machineOrderRow[0];

    const orderDetail = await getOrderDetail(plant, childOrder);
    const sfc = orderDetail?.sfcs[0] || "";

    // parallelizzo getProgressStatusOrder e getChildrenOrder
    const [ children, progressStatus] = await Promise.all([
        getChildrenOrder(plant, project, childOrder, order),
        getProgressStatusOrder(plant,childOrder)
    ]);

    const hasMancantiField = orderDetail?.customValues.find(obj => obj.attribute === "MANCANTI");
    const hasMancantiValue = (hasMancantiField?.value || "").toString().toLowerCase();

    const isHighlighted = order ? order === childOrder : false;

    var progressStatusOrder=100;
    if(progressStatus.totalPlannedTime > 0){
        progressStatusOrder = Math.round((progressStatus.totalCompletedTime / progressStatus.totalPlannedTime) * 100);
    }

    return {
        Material: childMaterial || "",
        SFC: sfc,
        Order: childOrder,
        OrderType: "MACH",
        MissingParts: hasMancantiValue,
        ProgressStatus: progressStatusOrder,
        isHighlighted,
        Children: children
    };
}


async function getChildrenOrder(plant, project, parentOrder, highlightOrder) {
    const orderRow = await getZOrdersLinkByPlantProjectAndParentOrder(plant, project, parentOrder);
    if (orderRow && orderRow.length > 0) {
        // Parallelizzo la mappatura di tutti i figli
        const childrenComponents = await Promise.all(
            orderRow.map(async comp => {
                // Qui lanciamo tutte le chiamate parallelamente:
                const orderDetail = await getOrderDetail(comp.plant, comp.child_order);

                if (!orderDetail) {
                    return {
                        Material: comp.child_material || "",
                        SFC: "",
                        Order: comp.child_order,
                        OrderType: "",
                        MissingParts: "",
                        ProgressStatus: "",
                        isHighlighted:"",
                        Children: []
                    };
                }

                const sfc = orderDetail?.sfcs[0] || "";

                // Parallelizziamo ProgressStatus e children
                const [ progressStatus, children] = await Promise.all([
                    getProgressStatusOrder(plant, comp.child_order),
                    getChildrenOrder(plant, project, comp.child_order, highlightOrder)
                ]);

                const orderTypeField = orderDetail?.customValues.find(obj => obj.attribute === "ORDER_TYPE");
                const orderTypeValue = orderTypeField?.value || "";
                const hasMancantiField = orderDetail?.customValues.find(obj => obj.attribute === "MANCANTI");
                const hasMancantiValue = (hasMancantiField?.value || "").toString().toLowerCase();

                const isHighlighted = highlightOrder ? highlightOrder === comp.child_order : false;
                var progressStatusOrder=100;
                if(progressStatus.totalPlannedTime > 0){
                    progressStatusOrder = Math.round((progressStatus.totalCompletedTime / progressStatus.totalPlannedTime) * 100);
                }
                
                return {
                    Material: comp.child_material || "",
                    SFC: sfc,
                    Order: comp.child_order || "",
                    OrderType: orderTypeValue,
                    MissingParts: hasMancantiValue,
                    ProgressStatus: progressStatusOrder,
                    isHighlighted,
                    Children: children
                };
            })
        );


        return childrenComponents;

    } else {
        // Quando arrivo ai gruppi
        const orderDetail = await getOrderDetail(plant, parentOrder);
        if (!orderDetail) return [];
        const orderTypeField = orderDetail?.customValues.find(obj => obj.attribute === "ORDER_TYPE");
        const orderTypeValue = orderTypeField?.value || "";
        //Se non è un gruppo non posso ricavare i componenti. Finisci
        if (!orderTypeValue.startsWith("GRP")) return [];
        const bomComponents = await getBomComponents(plant, orderDetail?.bom?.bom, orderDetail?.bom?.type);
        const childrenComponents = bomComponents.map(comp => {
            const isMancantiField = (comp?.customValues || []).find(obj => obj.attribute === "COMPONENTE MANCANTE");
            const isMancantiValue = (isMancantiField?.value || "").toString().toLowerCase();
            return {
                Material: comp?.material?.material || "",
                SFC: "",
                Order: "",
                OrderType: "COMP",
                MissingParts: isMancantiValue,
                isHighlighted: false,
                ProgressStatus: null,
                Children: []
            };
        });
        return childrenComponents;
    }
}

async function getOrderDetail(plant,order){
    try{
        var url = hostname + "/order/v1/orders?order=" + order + "&plant=" + plant;
        var orderResponse = await callGet(url);
        return orderResponse;
    } catch(error){
        return "";
    }

}

async function getSfcStatus(plant,sfc){
    try{
        var url = hostname + "/sfc/v1/sfcdetail?plant="+plant+"&sfc="+sfc;
        let responseGetSfc = await callGet(url);
        return responseGetSfc?.status?.code;
    } catch(e){
        return "";
    }
}

async function getBomComponents(plant,bom,bomType){
    try{
        var url = hostname + "/bom/v1/boms?plant=" + plant + "&bom=" + bom + "&type=" + bomType;
        var bomComponentsResponse = await callGet(url);
        var bomComponents = (bomComponentsResponse && bomComponentsResponse.length > 0 ) ? bomComponentsResponse[0].components : [];
        return bomComponents;
    } catch(error){
        let errorMessage = error.message || "Error service getBomComponents";
        throw { status: 500, message: errorMessage};
    }

}

async function getFilterSinotticoBom(plant){
  try{
        // Definisci i dettagli delle richieste come oggetti che simulano `req`
        const requestsMDO = [
            { key: "Project", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'COMMESSA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "MachineSection", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'SEZIONE MACCHINA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" }
        ];
        const responseMachMaterialsQuery = await getAllMachMaterials(plant); 

        // Esegui tutte le chiamate in parallelo
        const responses = await Promise.all(
            //per ogni chiamata che devo fare (per ogni oggetto di request)
            requestsMDO.map(async (request) => {
                const mockReq = {
                    path: request.path,
                    query: request.query,
                    method: request.method
                };
                try {
                    //chiamo l'api del mdo con quella request
                    var result = await dispatch(mockReq);
                    //ritorno un oggetto con chiave della chiamta e il suo risultato
                    return { key: request.key, result };
                } catch (error) {
                    return { key: request.key, result: { error: true, message: error.message, code: error.code || 500 } }; // Errore
                }
                //}
            })
        );

        // Con reduce dall'array generato voglio ottenere un singolo json dove ogni chiave (corrispodnende ad un filtro) è un array contentente i valori suggeriti da mostrare. Nel caso una chiamata sia andata in errore resituisco l'errore per la singola chiamata
        const consolidatedData = responses.reduce((acc, { key, result }) => {
            if (result.error) {
                acc[key] = { error: true, message: result.message, code: result.code };
            } else {
                // Se la risposta è un array (solo nel caso di Materials - prima quando ricavato da api non più adesso) prendo direttamente il risultato
                acc[key] = result.data?.value || [];
            }
            return acc;
        }, {});
        // Aggiungi anche i MACH_MATERIALS alla risposta finale
        consolidatedData["MACH_MATERIALS"] = responseMachMaterialsQuery;
        // Restituisci il dato consolidato
        return consolidatedData;
    } catch(e){
        console.error("Errore in getFilterMarkingReport: "+ e);
        throw new Error("Errore in getFilterMarkingReport:"+e);
    }

}

async function getProgressStatusOrder(plant, order) {
  try {
    const buildRequest = (key, path, filter, aggregateField, alias) => ({
      key,
      path,
      query: {
        $apply: `filter(${filter})${aggregateField ? `/aggregate(${aggregateField} with sum as ${alias})` : ''}`
      },
      method: "GET"
    });

    // 1. Richiesta SFC completati
    const sfcStatusFilter = `PLANT eq '${plant}' and MFG_ORDER eq '${order}' and COMPLETED_AT ne null`;
    const sfcStatusRequest = buildRequest("SfcStepStatus", "/mdo/SFC_STEP_STATUS", sfcStatusFilter);

    const resultSfcStatus = await dispatch(sfcStatusRequest);
    const completedOps = resultSfcStatus?.data?.value ? resultSfcStatus.data.value.map(row => row.OPERATION_ACTIVITY) : [];

    // 2. Richiesta tempo pianificato totale
    const totalPlannedFilter = `PLANT eq '${plant}' and MFG_ORDER eq '${order}'`;
    const totalPlannedRequest = buildRequest("TotalPlannedTime", "/mdo/ORDER_SCHEDULE", totalPlannedFilter, "PLAN_PROCESSING_TIME", "TotalPlannedTime");

    // 3. Richiesta tempo completato
    const opFilter = completedOps.map(op => `OPERATION_ACTIVITY eq '${op}'`).join(" or ");
    const completedFilter = `${totalPlannedFilter} and (${opFilter})`;
    const completedTimeRequest = buildRequest("CompletedPlannedTime", "/mdo/ORDER_SCHEDULE", completedFilter, "PLAN_PROCESSING_TIME", "CompletedTime");

    const [totalPlannedRes, completedTimeRes] = await Promise.all([
      dispatch(totalPlannedRequest),
      dispatch(completedTimeRequest)
    ]);

    const totalPlannedTime = totalPlannedRes.data?.value?.[0]?.TotalPlannedTime || 0;
    const totalCompletedTime = completedTimeRes.data?.value?.[0]?.CompletedTime || 0;

    console.log("totalPlannedTime =", totalPlannedTime);
    console.log("totalCompletedTime =", totalCompletedTime);

    return {
      totalPlannedTime,
      totalCompletedTime
    };
  } catch (error) {
    console.error("Errore nel calcolo dello stato avanzamento ordine:", error);
    throw error;
  }
}

module.exports = { getSinotticoBomMultilivelloReportData, getFilterSinotticoBom, getProgressStatusOrder };