const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZOrdersLinkMachByPlantProjectOrderTypeMachineSection, getZOrdersLinkByPlantProjectAndParentOrder, getAllMachMaterials } = require("../../postgres-db/services/orders_link/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;


async function getSinotticoBomMultilivelloReportData(plant,project,machineMaterial){
    let machineOrderRow = await getZOrdersLinkMachByPlantProjectOrderTypeMachineSection(plant,project,"MACH",machineMaterial);
        if(machineOrderRow && machineOrderRow.length > 0){
            var childMaterial = machineOrderRow[0].child_material;
            var childOrder = machineOrderRow[0].child_order;
        }
    let orderDetail = await getOrderDetail(plant,childOrder);
    let sfc = orderDetail?.sfcs[0] || "";
    let sfcStatus = await getSfcStatus(plant,sfc);
    let hasMancantiField =  orderDetail?.customValues.find(obj => obj.attribute=="MANCANTI");
    let hasMancantiValue = (hasMancantiField?.value || "").toString().toLowerCase();

    return {
        Material: childMaterial || "",
        SFC: sfc,
        Order: childOrder,
        OrderType: "MACH",
        MissingParts: hasMancantiValue,
        SfcStatus: sfcStatus,
        Children: await getChildrenOrder(plant,project,childOrder)
    };
}

async function getChildrenOrder(plant,project,parentOrder){
    let orderRow = await getZOrdersLinkByPlantProjectAndParentOrder(plant,project,parentOrder);
    var childrenComponents = [];
    if(orderRow && orderRow.length > 0){
        childrenComponents = await Promise.all(
                orderRow.map(async (comp) => {
                    let orderDetail = await getOrderDetail(comp.plant,comp.child_order);

                    if(!orderDetail){
                        return {
                            Material: comp.child_material || "",
                            SFC: "",
                            Order: comp.child_order,
                            OrderType: "",
                            MissingParts: "",
                            SfcStatus: "",
                            Children: []
                        };   
                    } 

                    let sfc = orderDetail?.sfcs[0] || "";

                    let sfcStatus = await getSfcStatus(plant,sfc);
                    let orderTypeField = orderDetail?.customValues.find(obj => obj.attribute == "ORDER_TYPE");
                    let orderTypeValue = orderTypeField?.value || "";
                    let hasMancantiField =  orderDetail?.customValues.find(obj => obj.attribute=="MANCANTI");
                    let hasMancantiValue = (hasMancantiField?.value || "").toString().toLowerCase();

                    return {
                        Material: comp.child_material || "",
                        SFC: sfc,
                        Order: comp.child_order || "",
                        OrderType: orderTypeValue,
                        MissingParts: hasMancantiValue,
                        SfcStatus: sfcStatus,
                        Children: await getChildrenOrder(plant,project,comp.child_order)
                    };
            })
        );
        
    }
    return childrenComponents;

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
    const completedOps = resultSfcStatus.data?.value.map(row => row.OPERATION_ACTIVITY) || [];

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