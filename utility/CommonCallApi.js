const axios = require("axios");
const { getBearerToken } = require("./BearerToken");

async function callGet(url){
    try {
        // Ottieni il Bearer Token prima di fare la richiesta API
        const token = await getBearerToken();
        // Effettua la chiamata alla API del DM
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
            },
        });
        console.log("response= "+JSON.stringify(response.data[0]));
        return response.data;
    } catch(error){
        // Recupera il messaggio di errore dalla risposta, se disponibile
        const errorMessage =
            error.response?.data?.message || // Messaggio specifico dal server (se presente)
            error.response?.data ||         // Intero oggetto di risposta (se non c'è un 'message')
            error.message ||                // Messaggio di errore generico di Axios
            "Errore sconosciuto";
    
        const errorStatus = error.response?.status || error.status || 500;
    
        console.error("Errore dettagliato:", {
            status: errorStatus,
            message: errorMessage,
            originalError: error,
        });
    
        // Lancia l'errore al chiamante
        throw { status: errorStatus, message: errorMessage };
    }
};

async function callPost(url, data) {
    try {
        // Ottieni il Bearer Token prima di fare la richiesta API
        const token = await getBearerToken();

        // Effettua la chiamata POST alla API del DM
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch(error){

        // Recupera il messaggio di errore dalla risposta, se disponibile
        const errorMessage =
            error.response?.data?.message || // Messaggio specifico dal server (se presente)
            error.response?.data ||         // Intero oggetto di risposta (se non c'è un 'message')
            error.message ||                // Messaggio di errore generico di Axios
            "Errore sconosciuto";
    
        const errorStatus = error.response?.status || error.status || 500;
    
        // console.error("Errore dettagliato:", {
        //     status: errorStatus,
        //     message: errorMessage,
        //     originalError: error,
        // });
    
        // Lancia l'errore al chiamante
        throw { status: errorStatus, message: errorMessage };
    }
}

async function callPut(url, data) {
    try {
        // Ottieni il Bearer Token prima di fare la richiesta API
        const token = await getBearerToken();

        // Effettua la chiamata POST alla API del DM
        const response = await axios.put(url, data, {
            headers: {
                Authorization: `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch(error){

        // Recupera il messaggio di errore dalla risposta, se disponibile
        const errorMessage =
            error.response?.data?.message || // Messaggio specifico dal server (se presente)
            error.response?.data ||         // Intero oggetto di risposta (se non c'è un 'message')
            error.message ||                // Messaggio di errore generico di Axios
            "Errore sconosciuto";
    
        const errorStatus = error.response?.status || error.status || 500;
    
        console.error("Errore dettagliato:", {
            status: errorStatus,
            message: errorMessage,
            originalError: error,
        });
    
        // Lancia l'errore al chiamante
        throw { status: errorStatus, message: errorMessage };
    }
}

async function callPatch(url, data) {
    try {
        // Ottieni il Bearer Token prima di fare la richiesta API
        const token = await getBearerToken();

        // Effettua la chiamata PATCH alla API del DM
        const response = await axios.patch(url, data, {
            headers: {
                Authorization: `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch(error){

        // Recupera il messaggio di errore dalla risposta, se disponibile
        const errorMessage =
            error.response?.data?.message || // Messaggio specifico dal server (se presente)
            error.response?.data ||         // Intero oggetto di risposta (se non c'è un 'message')
            error.message ||                // Messaggio di errore generico di Axios
            "Errore sconosciuto";
    
        const errorStatus = error.response?.status || error.status || 500;
    
        console.error("Errore dettagliato:", {
            status: errorStatus,
            message: errorMessage,
            originalError: error,
        });
    
        // Lancia l'errore al chiamante
        throw { status: errorStatus, message: errorMessage };
    }
};

async function callGetFile(url){
    try {
        // Ottieni il Bearer Token prima di fare la richiesta API
        const token = await getBearerToken();
        // Effettua la chiamata alla API del DM
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`, // Aggiungi il Bearer Token nell'intestazione
            },
            responseType: 'arraybuffer'
        });
        // responseType: 'arraybuffer' genera una risposta (response.data) composta da {"type":"Buffer","data":[]} in cui all'interno di data c'è il file in byte
        return response;

    } catch(error){
        // Recupera il messaggio di errore dalla risposta, se disponibile
        const errorMessage =
            error.response?.data?.message || // Messaggio specifico dal server (se presente)
            error.response?.data ||         // Intero oggetto di risposta (se non c'è un 'message')
            error.message ||                // Messaggio di errore generico di Axios
            "Errore nel recupero del file";
    
        const errorStatus = error.response?.status || error.status || 500;
        // Lancia l'errore al chiamante
        throw { status: errorStatus, message: errorMessage };
    }
};

// Esporta la funzione
module.exports = { callGet, callPost, callPut, callPatch, callGetFile };