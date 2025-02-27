const { dispatch } = require("../../mdo/library");
const { callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getFilterPOD(plant){

    try{
        // Definisci i dettagli delle richieste come oggetti che simulano `req`
        const requests = [
            { key: "WorkCenters", path: "/mdo/WORKCENTER", query: { $apply: "filter(PLANT eq '"+plant+"')/groupby((WORKCENTER, DESCRIPTION))"}, method: "GET" },
            { key: "WBS", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'WBE' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "Project", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'COMMESSA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "ParentMaterial", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'MATERIALE PADRE' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "MachineSection", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'SEZIONE MACCHINA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
            { key: "Materials",  path: "/mdo/SFC", query: { $apply: "filter(PLANT eq '"+plant+"')/groupby((MATERIAL))"}, method: "GET" },
        ];

        // Esegui tutte le chiamate in parallelo
        const responses = await Promise.all(
            //per ogni chiamata che devo fare (per ogni oggetto di request)
            requests.map(async (request) => {
                // if(request.key==="Materials"){
                //     var result = await callGet(request.url);
                //     // Estraggo solo l'array dei materiali
                //     const materials = result.content.map((item) => ({
                //         Material: item.material
                //     }));
                //     return { key: request.key, result: materials };
                // } else {
                    //creo una request classica per l'mdo
                    const mockReq = {
                        path: request.path,
                        query: request.query,
                        method: request.method
                    };
                    try {
                        //chiamo l'api del mdo con quella request
                        var result = await dispatch(mockReq);
                        //ritorno un oggetto con chiave della chiamta e il suo risultato
                        return { key: request.key, result }; // DAJE
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
                acc[key] = Array.isArray(result) ? result : result.data?.value || [];
            }
            return acc;
        }, {});
        // Restituisci il dato consolidato
        return consolidatedData;
    } catch(e){
        console.error("Errore in getFilterPOD: "+ e);
        throw new Error("Errore in getFilterPOD:"+e);
    }
    
}

// Esporta la funzione
module.exports = { getFilterPOD };