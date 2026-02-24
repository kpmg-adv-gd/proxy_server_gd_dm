const { callGet } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getZSharedMemoryData } = require("../../postgres-db/services/shared_memory/library");
const { getReportWeight } = require("../../postgres-db/services/report_weights/library");
const { getReportWeightSectionsData, getReportWeightData, getReportWeightWithValues } = require("../../postgres-db/services/verbali/library");
const { getAnalisiOreVarianza } = require("../../postgres-db/services/marking/library");
const { autoCompileFieldsDataCollectionDispatcher, autoCompileFieldsDataCollectionTestingdDispatcher  } = require("../dataCollections/autoCompileDataCollections");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

// Elaborazione delle data collections per il supervisore assembly
async function elaborateDataCollectionsSupervisoreAssembly(plant, selected, resource, datacollections, refresh) {
    var results = [];
    try {
        for (var i = 0; i < datacollections.length; i++) {
            var dc = datacollections[i].group, data = { group: dc.group, version: dc.version, operation: datacollections[i].operation, description: dc.description, parameters: [], voteSection: null };
            for (var j = 0; j < dc.parameters.length; j++) {
                var param = dc.parameters[j];
                var dataParameter = { parameterName: param.parameterName, description: param.description };
                // Estraggo dataType
                if (param.dcParameterType == "TEXT" && (!param.unitOfMeasure || param.unitOfMeasure == "")) dataParameter.dataType = "TEXT";
                else if (param.dcParameterType == "TEXT" && param.unitOfMeasure && param.unitOfMeasure == "TAG") dataParameter.dataType = "DATA";
                else if (param.dcParameterType == "NUMBER") dataParameter.dataType = "NUMBER";
                else if (param.dcParameterType == "BOOLEAN") dataParameter.dataType = "BOOLEAN";
                else if (param.dcParameterType == "DATA_FIELD_LIST") {
                    dataParameter.dataType = "LIST";
                    // Recupero menu a tendina dalla shared memory
                    var sharedResult = await getZSharedMemoryData(plant, param.listTypeDataField);
                    var listValues = [];
                    if (sharedResult.length > 0) {
                        try {
                            listValues = JSON.parse(sharedResult[0].value);
                        } catch (error) {
                            console.log("Error parsing list values from shared memory: " + error.message);
                            listValues = [];
                        }
                    } else { 
                        listValues = [];
                    }
                    listValues.unshift({ key: "", value: "" });
                    dataParameter.listValues = listValues;
                }
                // Estraggo valore più recente per la data collection
                var dataCollectionFilter = `(PLANT eq '${plant}' and SFC eq '${selected.sfc}' AND RESOURCE eq '${resource}' and DC_GROUP eq '${dc.group}' and DC_PARAMETER_NAME eq '${param.parameterName}' and IS_DELETED eq 'false')`;
                var mockReqDC = {
                    path: "/mdo/DATA_COLLECTION",
                    query: { $apply: `filter(${dataCollectionFilter})` },
                    method: "GET"
                };
                var outMock = await dispatch(mockReqDC);
                var dcData = (outMock?.data?.value && outMock.data.value.length > 0) ? outMock.data.value : [];
                if (dcData.length > 0) {
                    dcData.sort((a, b) => new Date(b.REPORTED_AT) - new Date(a.REPORTED_AT));
                    var value = dcData[0].DC_PARAMETER_VALUE;
                    dataParameter.reported_at = dcData[0].REPORTED_AT;
                    dataParameter.comment = dcData[0].COMMENT;
                } else {
                    var value = "";
                    dataParameter.reported_at = "";
                    dataParameter.comment = "";
                }
                if (dataParameter.dataType == "TEXT") dataParameter.valueText = value;
                else if (dataParameter.dataType == "DATA") dataParameter.valueData = value;
                else if (dataParameter.dataType == "NUMBER") dataParameter.valueNumber = value;
                else if (dataParameter.dataType == "BOOLEAN") dataParameter.valueBoolean = value;
                else if (dataParameter.dataType == "LIST") dataParameter.valueList = value;
                data.parameters.push(dataParameter);
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomNC = await getZSharedMemoryData(plant, "CUSTOM_TABLE_NC");
            if (sharedResultCustomNC.length > 0) {
                try {
                    sharedResultCustomNC = JSON.parse(sharedResultCustomNC[0].value);
                    if (sharedResultCustomNC.some(item => item.group === dc.group)) data.viewCustomTableNC = true;
                    else data.viewCustomTableNC = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_NC from shared memory: " + error.message);
                    data.viewCustomTableNC = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_RESULTS");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableResults = true;
                    else data.viewCustomTableResults = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_RESULTS from shared memory: " + error.message);
                    data.viewCustomTableResults = false;
                }
            }
            // Aggiungo informazione sulla viisbilità del voto sezione
            var sections = await getReportWeight("Assembly", plant);
            if (sections.find(item => item.section === data.group)) {
                var sharedVoti = await getZSharedMemoryData(plant, "DC_VOTO_SEZIONE");
                if (sharedVoti.length > 0) {
                    try {
                        var votiSezione = JSON.parse(sharedVoti[0].value);
                        if (votiSezione.some(item => item.section === dc.group)) 
                            moveDcVotoSezione(data, votiSezione.filter(item => item.section === dc.group)[0].value);
                    } catch (error) { }
                }
            }
            results.push(data);
        }
        // Ordinare le data collection in base al nome del gruppo
        if (selected.reportStatus != "DONE") {
            results = await autoCompileFieldsDataCollection(plant, results, selected, refresh);
        }
        results.sort((a, b) => a.group.localeCompare(b.group));
        return results;
    } catch (error) {
        console.log("Error in elaborateDataCollectionsSupervisoreAssembly: " + error.message);
        return false;
    }
}

async function elaborateDataCollectionstTesting(plant, selected, resource, datacollections, refresh) {
    var results = [];
    try {
        for (var i = 0; i < datacollections.length; i++) {
            var dc = datacollections[i].group, data = { group: dc.group, version: dc.version, operation: datacollections[i].operation, description: dc.description, parameters: [], voteSection: null };
            for (var j = 0; j < dc.parameters.length; j++) {
                var param = dc.parameters[j];
                var dataParameter = { parameterName: param.parameterName, description: param.description };
                // Estraggo dataType
                if (param.dcParameterType == "TEXT" && (!param.unitOfMeasure || param.unitOfMeasure == "")) dataParameter.dataType = "TEXT";
                else if (param.dcParameterType == "TEXT" && param.unitOfMeasure && param.unitOfMeasure == "TAG") dataParameter.dataType = "DATA";
                else if (param.dcParameterType == "NUMBER") dataParameter.dataType = "NUMBER";
                else if (param.dcParameterType == "BOOLEAN") dataParameter.dataType = "BOOLEAN";
                else if (param.dcParameterType == "DATA_FIELD_LIST") {
                    dataParameter.dataType = "LIST";
                    // Recupero menu a tendina dalla shared memory
                    var sharedResult = await getZSharedMemoryData(plant, param.listTypeDataField);
                    var listValues = [];
                    if (sharedResult.length > 0) {
                        try {
                            listValues = JSON.parse(sharedResult[0].value);
                        } catch (error) {
                            console.log("Error parsing list values from shared memory: " + error.message);
                            listValues = [];
                        }
                    } else { 
                        listValues = [];
                    }
                    listValues.unshift({ key: "", value: "" });
                    dataParameter.listValues = listValues;
                }
                // Estraggo valore più recente per la data collection
                var dataCollectionFilter = `(PLANT eq '${plant}' and SFC eq '${selected.sfc}' AND RESOURCE eq '${resource}' and DC_GROUP eq '${dc.group}' and DC_PARAMETER_NAME eq '${param.parameterName}' and IS_DELETED eq 'false')`;
                var mockReqDC = {
                    path: "/mdo/DATA_COLLECTION",
                    query: { $apply: `filter(${dataCollectionFilter})` },
                    method: "GET"
                };
                var outMock = await dispatch(mockReqDC);
                var dcData = (outMock?.data?.value && outMock.data.value.length > 0) ? outMock.data.value : [];
                if (dcData.length > 0) {
                    dcData.sort((a, b) => new Date(b.REPORTED_AT) - new Date(a.REPORTED_AT));
                    var value = dcData[0].DC_PARAMETER_VALUE;
                    dataParameter.reported_at = dcData[0].REPORTED_AT;
                    dataParameter.comment = dcData[0].COMMENT;
                } else {
                    var value = "";
                    dataParameter.reported_at = "";
                    dataParameter.comment = "";
                }
                if (dataParameter.dataType == "TEXT") dataParameter.valueText = value;
                else if (dataParameter.dataType == "DATA") dataParameter.valueData = value;
                else if (dataParameter.dataType == "NUMBER") dataParameter.valueNumber = value;
                else if (dataParameter.dataType == "BOOLEAN") dataParameter.valueBoolean = value;
                else if (dataParameter.dataType == "LIST") dataParameter.valueList = value;
                data.parameters.push(dataParameter);
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomNC = await getZSharedMemoryData(plant, "CUSTOM_TABLE_WEIGHTS");
            if (sharedResultCustomNC.length > 0) {
                try {
                    sharedResultCustomNC = JSON.parse(sharedResultCustomNC[0].value);
                    if (sharedResultCustomNC.some(item => item.group === dc.group)) data.viewCustomTableWeights = true;
                    else data.viewCustomTableWeights = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_WEIGHTS from shared memory: " + error.message);
                    data.viewCustomTableWeights = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomNC = await getZSharedMemoryData(plant, "CUSTOM_TABLE_NC");
            if (sharedResultCustomNC.length > 0) {
                try {
                    sharedResultCustomNC = JSON.parse(sharedResultCustomNC[0].value);
                    if (sharedResultCustomNC.some(item => item.group === dc.group)) data.viewCustomTableNC = true;
                    else data.viewCustomTableNC = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_NC from shared memory: " + error.message);
                    data.viewCustomTableNC = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_ORE_COLLAUDO");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableOreCollaudo = true;
                    else data.viewCustomTableOreCollaudo = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_ORE_COLLAUDO from shared memory: " + error.message);
                    data.viewCustomTableOreCollaudo = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_VARIANZA_COLLAUDO");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableVarianzaCollaudo = true;
                    else data.viewCustomTableVarianzaCollaudo = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_VARIANZA_COLLAUDO from shared memory: " + error.message);
                    data.viewCustomTableVarianzaCollaudo = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_MODIFICHE");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableModifiche = true;
                    else data.viewCustomTableModifiche  = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_MODIFICHE from shared memory: " + error.message);
                    data.viewCustomTableModifiche = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_ACTIVITIES");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableActivities = true;
                    else data.viewCustomTableActivities = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_ACTIVITIES from shared memory: " + error.message);
                    data.viewCustomTableActivities = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_MANCANTI");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableMancanti = true;
                    else data.viewCustomTableMancanti = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_MANCANTI from shared memory: " + error.message);
                    data.viewCustomTableMancanti = false;
                }
            }
            // Aggiungo informazione sulla visibilità delle tabelle custom
            var sharedResultCustomResults = await getZSharedMemoryData(plant, "CUSTOM_TABLE_FINAL_COLLAUDO");
            if (sharedResultCustomResults.length > 0) {
                try {
                    sharedResultCustomResults = JSON.parse(sharedResultCustomResults[0].value);
                    if (sharedResultCustomResults.some(item => item.group === dc.group)) data.viewCustomTableFinalCollaudo = true;
                    else data.viewCustomTableFinalCollaudo = false;
                } catch (error) {
                    console.log("Error parsing CUSTOM_TABLE_FINAL_COLLAUDO from shared memory: " + error.message);
                    data.viewCustomTableFinalCollaudo = false;
                }
            }
            results.push(data);
        }
        
        // Ordinare le data collection in base al nome del gruppo
        results = await autoCompileFieldsDataCollectionTesting(plant, results, selected, refresh);
        results.sort((a, b) => {
            // Estraggo il numero iniziale dalla stringa (se presente)
            const aMatch = a.group.match(/^(\d+)/);
            const bMatch = b.group.match(/^(\d+)/);
            
            const aNum = aMatch ? parseInt(aMatch[1], 10) : null;
            const bNum = bMatch ? parseInt(bMatch[1], 10) : null;
            
            // Se entrambi iniziano con un numero, confronto numerico
            if (aNum !== null && bNum !== null) {
                if (aNum !== bNum) return aNum - bNum;
                // Se i numeri sono uguali, ordine alfabetico sul resto
                return a.group.localeCompare(b.group);
            }
            
            // Se solo a inizia con numero, a viene prima
            if (aNum !== null && bNum === null) return -1;
            // Se solo b inizia con numero, b viene prima
            if (aNum === null && bNum !== null) return 1;
            
            // Altrimenti ordine alfabetico normale
            return a.group.localeCompare(b.group);
        });
        return results;
    } catch (error) {
        console.log("Error in elaborateDataCollectionsSupervisoreAssembly: " + error.message);
        return false;
    }
}

// Recupero i report weight delle data collections
async function getReportWeightDataCollections(plant, sfc, resource, listSection) {
    var sharedResult = await getZSharedMemoryData(plant, "DC_VOTO_SEZIONE");
    if (sharedResult.length > 0) {
        try {
            var votiSezione = JSON.parse(sharedResult[0].value);
        } catch (error) {
            console.log("Error parsing DC_VOTO_SEZIONE from shared memory: " + error.message);
            votiSezione = [];
        }
    } else {
        votiSezione = [];
    }
    for (var i = 0; i < listSection.length; i++) {
        if (votiSezione.some(item => item.section === listSection[i].section)) {
            listSection[i].dcVotoSezione = votiSezione.find(item => item.section === listSection[i].section).value;
        } else {
            listSection[i].dcVotoSezione = "";
            listSection[i].vote = "NA";
            continue;
        }
        // Calcolo voto in base al dcVotoSezione - entro in MDO_DATA_COLLECTION con plant, sfc, resource, section e dcVotoSezione
        if (listSection[i].dcVotoSezione != "") {
            var dataCollectionFilter = `(PLANT eq '${plant}' and SFC eq '${sfc}' AND RESOURCE eq '${resource}' and DC_GROUP eq '${listSection[i].section}' and DC_PARAMETER_NAME eq '${listSection[i].dcVotoSezione}' and IS_DELETED eq 'false')`;
            var mockReqDC = {
                path: "/mdo/DATA_COLLECTION",
                query: { $apply: `filter(${dataCollectionFilter})` },
                method: "GET"
            };
            var outMock = await dispatch(mockReqDC);
            var dcData = (outMock?.data?.value && outMock.data.value.length > 0) ? outMock.data.value : [];
        } else var dcData = [];
        if (dcData.length > 0) {
            dcData.sort((a, b) => new Date(b.REPORTED_AT) - new Date(a.REPORTED_AT));
            listSection[i].vote = dcData[0].DC_PARAMETER_VALUE;
        } else {
            listSection[i].vote = "NA";
        }
    }
    // Aggiung una ultima riga con media ponderata dei voti sul peso (considero solo quelli numerici)
    var media = { section: "RISULTATO DELL'ISPEZIONE MACCHINA", dcVotoSezione: ""};
    var totalWeight = 0;
    var totalScore = 0;
    for (var j = 0; j < listSection.length; j++) {
        var weight = parseFloat(listSection[j].weight);
        var score = parseFloat(listSection[j].vote);
        if (!isNaN(weight)) {
            totalWeight += weight;
            if (!isNaN(score)) {
                totalScore += weight * score;
            }
        }
    }
    if (totalWeight > 0) {
        media.weight = parseFloat(totalWeight.toFixed(2));
        media.vote = parseFloat((totalScore / totalWeight).toFixed(2));
    } else {
        media.weight = "NA";
        media.vote = "NA";
    }
    listSection.push(media);
    listSection.forEach(element => {
        if (!isNaN(element.weight)) element.weight = element.weight + "%";
    });
    return listSection;
}

// Parto dei parametri nel formato con cui li restituisco nell'elaborazione nella funzione elaborateDataCollectionsSupervisoreAssembly
async function generateJsonParameters(parameters) {
    var result = [];
    for (var i = 0; i < parameters.length; i++) {
        var param = parameters[i];
        var value = "";
        // Estraggo il valore in base al dataType
        if (param.dataType == "TEXT" && param.valueText) value = param.valueText;
        else if (param.dataType == "DATA" && param.valueData) value = param.valueData;
        else if (param.dataType == "NUMBER" && param.valueNumber) value = param.valueNumber;
        else if (param.dataType == "BOOLEAN" && param.valueBoolean) value = param.valueBoolean;
        else if (param.dataType == "LIST" && param.valueList) value = param.valueList;
        result.push({
            name: param.parameterName || "",
            value: value == "" ? null : value,
            comment: param.comment || ""
        });
    }
    return result;
}

// Funzione per l'auto compilazione di campi specifici delle data collections estratte
async function autoCompileFieldsDataCollection(plant, data, selected, refresh) {
    var sharedParametri = await getZSharedMemoryData(plant, "PARAMETRI_AUTO");
    if (sharedParametri.length > 0) {
        try {
            var parametriAuto = JSON.parse(sharedParametri[0].value);
            data = await autoCompileFieldsDataCollectionDispatcher(plant, data, parametriAuto, selected, refresh);
        } catch (error) { 
            console.log("Error parsing PARAMETRI_AUTO from shared memory: " + error.message);
        }
    }
    return data;
}

// Funzione per l'auto compilazione di campi specifici delle data collections estratte
async function autoCompileFieldsDataCollectionTesting(plant, data, selected, refresh) {
    var sharedParametri = await getZSharedMemoryData(plant, "PARAMETRI_AUTO_TESTING");
    if (sharedParametri.length > 0) {
        try {
            var parametriAuto = JSON.parse(sharedParametri[0].value);
            data = await autoCompileFieldsDataCollectionTestingdDispatcher(plant, data, parametriAuto, selected, refresh);
        } catch (error) { 
            console.log("Error parsing PARAMETRI_AUTO from shared memory: " + error.message);
        }
    }
    return data;
}

// Toglo il parametro dalla lista, e lo salvo in un campo apposito per mostrarlo separatamente
function moveDcVotoSezione(data, parameterName) {
    for (var i = 0; i < data.parameters.length; i++) {
        if (data.parameters[i].parameterName === parameterName) {
            data.voteNameSection = parameterName;
            data.voteNameSectionDesc = data.parameters[i].description;
            data.voteSection = data.parameters[i].valueText || data.parameters[i].valueData || data.parameters[i].valueNumber || data.parameters[i].valueBoolean || data.parameters[i].valueList || "";
            data.parameters.splice(i, 1);
            return;
        }
    }
}

// Funzione per ottenere i custom weights per il report TESTING con i valori dal database
async function getCustomWeights(plant, project, order, report) {
    try {
        // Default report = 'Testing'
        const reportType = report || 'Testing';

        // Recupero i dati con LEFT JOIN tra z_report_weight e z_weight_values
        const weightsData = await getReportWeightWithValues(plant, project, order, reportType);
        
        // Raggruppo i dati per id
        const groupedByIdMap = {};
        
        for (const item of weightsData) {
            const currentId = item.id || 1;
            const weight = parseFloat(item.weight || 0);
            const value = item.value || '';
            const dateTime = item.datetime || null;
            
            // Inizializzo il gruppo per questo id se non esiste
            if (!groupedByIdMap[currentId]) {
                groupedByIdMap[currentId] = {
                    sections: [],
                    totalWeight: 0,
                    totalWeightedValue: 0,
                    validSections: 0
                };
            }
            
            // Aggiungo la sezione al gruppo
            groupedByIdMap[currentId].sections.push({
                id: currentId,
                section: item.section,
                weight: weight,
                value: value,
                datetime: dateTime
            });
            
            // Converto value in numero per calcolare la media pesata
            const numericValue = parseFloat(value);
            
            // Aggiorno i totali per questo id
            groupedByIdMap[currentId].totalWeight += weight;
            if (!isNaN(numericValue) && value !== '') {
                groupedByIdMap[currentId].totalWeightedValue += weight * numericValue;
                groupedByIdMap[currentId].validSections++;
            }
        }
        
        // Costruisco l'array di risultati
        const results = [];
        
        // Per ogni id, aggiungo le sezioni e poi la riga "Risultato dell'ispezione"
        for (const currentId in groupedByIdMap) {
            const group = groupedByIdMap[currentId];
            
            // Aggiungo tutte le sezioni di questo id con peso formattato
            for (const section of group.sections) {
                results.push({
                    id: section.id,
                    section: section.section,
                    weight: section.weight,
                    value: section.value,
                    datetime: section.datetime
                });
            }
            
            // Calcolo media pesata per questo id
            let finalValue = '';
            if (group.totalWeight > 0 && group.validSections > 0) {
                finalValue = parseFloat((group.totalWeightedValue / group.totalWeight).toFixed(2)).toString();
            }
            
            // Aggiungo la riga "Risultato dell'ispezione" per questo id
            results.push({
                id: parseInt(currentId),
                section: "Risultato dell'ispezione",
                weight: group.totalWeight,
                value: finalValue,
                datetime: null
            });
        }
        
        return results;
    } catch (error) {
        console.error("Error in getCustomWeights:", error);
        return false;
    }
}

// Funzione per elaborare l'analisi ore varianza
async function elaborateAnalisiOreVarianza(plant, order) {
    try {
        // Step 1: Recupero i dati raggruppati da z_op_confirmations
        const varianceData = await getAnalisiOreVarianza(plant, order);
        
        if (!varianceData || varianceData.length === 0) {
            return [];
        }
        
        // Step 2: Recupero la mappatura dei cluster da Z_SHARED_MEMORY
        const sharedMemoryData = await getZSharedMemoryData(plant, "PARAMETRI_VARIANCE_CLUSTER");
        let clusterMapping = {};
        
        if (sharedMemoryData && sharedMemoryData.length > 0) {
            try {
                const parsedData = JSON.parse(sharedMemoryData[0].value);
                // Converto l'array in un oggetto chiave-valore per accesso rapido
                if (Array.isArray(parsedData)) {
                    parsedData.forEach(item => {
                        if (item.key && item.value) {
                            clusterMapping[item.key] = item.value;
                        }
                    });
                }
            } catch (error) {
                console.error("Error parsing PARAMETRI_VARIANCE_CLUSTER:", error);
            }
        }
        
        // Step 3: Elaboro i risultati
        const results = varianceData.map(item => {
            const cluster = clusterMapping[item.variance_cluster] || item.variance_cluster;
            const totalVarianceLabor = parseFloat(item.total_variance_labor || 0);
            
            // Conversione da HCN a ore: divido per 100
            const hours = totalVarianceLabor / 100;
            
            return {
                cluster: cluster,
                hours: Math.round(hours * 100) / 100 // Arrotondo a 2 decimali
            };
        });
        
        return results;
    } catch (error) {
        console.error("Error in elaborateAnalisiOreVarianza:", error);
        return false;
    }
}

// Esporta la funzione
module.exports = { elaborateDataCollectionsSupervisoreAssembly, getReportWeightDataCollections, generateJsonParameters, autoCompileFieldsDataCollection, moveDcVotoSezione, elaborateDataCollectionstTesting, getCustomWeights, elaborateAnalisiOreVarianza }