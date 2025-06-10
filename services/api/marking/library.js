const { dispatch } = require("../../mdo/library");
const { callGet, callPost } = require("../../../utility/CommonCallApi");
const { insertOpConfirmation, updateZMarkingRecap, updateCancelFlagOpConfirmation } = require("../../postgres-db/services/marking/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getFilterMarkingReport(plant){

    try{
        // Definisci i dettagli delle richieste come oggetti che simulano `req`
        const requests = [
            { key: "WBS", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'WBE' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "Project", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'COMMESSA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "UserId", path: "/mdo/USER_CERTIFICATION_ASSIGNMENT", query: { $apply: "filter(PLANT eq '"+plant+"')/groupby((USER_ID))"}, method: "GET" },
        ];

        // Esegui tutte le chiamate in parallelo
        const responses = await Promise.all(
            //per ogni chiamata che devo fare (per ogni oggetto di request)
            requests.map(async (request) => {
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
        // Restituisci il dato consolidato
        return consolidatedData;
    } catch(e){
        console.error("Errore in getFilterMarkingReport: "+ e);
        throw new Error("Errore in getFilterMarkingReport:"+e);
    }
    
}

async function mangeConfirmationMarking(plant,personalNumber,wbe_machine,operation,mes_order,sfc,confirmation_number,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,reason_for_variance,user_id,confirmation,cancellation,cancelled_confirmation,modification,workCenter,opDescription,project, defectId){
    let responseSAPMarkingService = await sendMarkingToSap(plant,personalNumber,confirmation_number,reason_for_variance,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,confirmation,cancellation,cancelled_confirmation);
    if(responseSAPMarkingService && responseSAPMarkingService?.OUTPUT?.confirmation_counter == 0 ){
        let errorMessage = "Errore in responseSAPMarkingService";
        throw { status: 500, message: errorMessage};
    }
    let confirmation_counter = responseSAPMarkingService?.OUTPUT?.confirmation_counter || 0;
    await insertOpConfirmation(plant,wbe_machine,operation,mes_order,sfc,confirmation_number,confirmation_counter,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,reason_for_variance,user_id,personalNumber,false,cancelled_confirmation,modification,workCenter,opDescription,project, defectId); 
    await updateZMarkingRecap(confirmation_number,cancelled_confirmation,marked_labor, variance_labor);
    if(cancellation=="X"){
        await updateCancelFlagOpConfirmation(confirmation_number,cancelled_confirmation,user_id);
    }
    return "ok";
}

async function sendMarkingToSap(plant,personalNumber,confirmation_number,reason_for_variance,marking_date,marked_labor,uom_marked_labor,variance_labor,uom_variance_labor,confirmation,cancellation,cancelled_confirmation){
    var date = marking_date.replace(/\//g, ".");
    var duration=(marked_labor+variance_labor).toString();
    var UoM = uom_marked_labor;
    var body = {};
    var pathMarkingProductionProcess = await getZSharedMemoryData(plant,"MARCATURA_SAP_PRODUCTION_PROCESS");
    if(pathMarkingProductionProcess.length>0) pathMarkingProductionProcess = pathMarkingProductionProcess[0].value;
    var url = hostname + pathMarkingProductionProcess;
    console.log("URL SAP: "+url);
    if(cancellation=="X"){
        body = {
            "confirmationNumber":confirmation_number,
            "confirmationCounter":cancelled_confirmation,
            "confirmation":confirmation,
            "cancellation":cancellation
        };
    } else {
        body = {
            "personalNumber":personalNumber,
            "confirmationNumber":confirmation_number,
            "confirmationCounter":"",
            "reasonForVariance":reason_for_variance,
            "date":date,
            "duration":duration,
            "durationUom":UoM,
            "confirmation":confirmation,
            "cancellation":cancellation
        };
    }


    console.log("SAP body:"+JSON.stringify(body));
    let response = await callPost(url,body);
    console.log("RESPONSE SAP: "+JSON.stringify(response));

    return response;
}

// Esporta la funzione
module.exports = { getFilterMarkingReport,mangeConfirmationMarking };