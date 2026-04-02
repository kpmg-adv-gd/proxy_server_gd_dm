const postgresdbService = require('../../connection');
const queryDashKPI = require("./queries");

async function getDashboardKPI(plant, project, wbs, sfc, section) {

    // 1. Raccolta dati da tutte le tabelle details
    var machineDetails = getMachineProgressDetails(plant, project, wbs, sfc);
    var sfcGruppi  = getSFCProgressDetails(plant, project, wbs, sfc, "gruppi");
    var sfcAggr    = getSFCProgressDetails(plant, project, wbs, sfc, "aggr");
    var sfcMacr    = getSFCProgressDetails(plant, project, wbs, sfc, "macr");
    var scostamentoAll = getScostamentoDetails(plant, project, wbs, sfc); // tutti i dati
    var mancantiDetails  = getMancantiDetails(plant, project, wbs, sfc, section);
    var evasiDetails     = getEvasiDetails(plant, project, wbs, sfc);
    var modificheDetails = getModificheDetails(plant, project, wbs, sfc, section);
    var varianzeDetails  = getVarianzeDetails(plant, project, wbs, sfc);
    var analisiScarico   = getAnalisiGruppiScarico(plant, project, wbs, sfc);

    // 2. Filtra scostamento per workcenter
    var scostamentoGD = {
        columns: scostamentoAll.columns,
        data: scostamentoAll.data.filter(function(r) { return r.workCenter === "GD"; })
    };
    var scostamentoFornitori = {
        columns: scostamentoAll.columns,
        data: scostamentoAll.data.filter(function(r) { return r.workCenter !== "GD"; })
    };

    // 3. Calcola valori chart dai dati delle tabelle
    var result = {};

    result.gruppiLevels = {
        gruppi: _calcGruppiLevelChart(sfcGruppi.data),
        aggr:   _calcGruppiLevelChart(sfcAggr.data),
        macr:   _calcGruppiLevelChart(sfcMacr.data)
    };

    result.mancanti = _calcMancantiSummary(mancantiDetails.data);

    // NC non ha tabella details dedicata (apre report esterno)
    result.nonConformita = { gruppiConNC: "43%", maOpen: "15", maClosed: "25" };

    result.chartData = {
        machineProgress: _calcMachineProgressChart(machineDetails.data),
        scostamentoLevels: {
            GD:        _calcScostamentoChart(scostamentoGD.data),
            Fornitori: _calcScostamentoChart(scostamentoFornitori.data)
        },
        mancanti: _calcMancantiChart(mancantiDetails.data),
        evasi:    _calcEvasiChart(evasiDetails.data),
        ncPresenza: [
            { label: "NC open", value: 20 },
            { label: "NC bloccanti", value: 28 },
            { label: "NC closed", value: 52 }
        ],
        modificheOpen:   _calcModificheChart(modificheDetails.data, "Open"),
        modificheClosed: _calcModificheChart(modificheDetails.data, "Closed"),
        tipologiaVarianze:      _calcTipologiaVarianzeChart(varianzeDetails.data),
        responsabilitaVarianze: _calcResponsabilitaVarianzeChart(varianzeDetails.data)
    };

    // 4. Include tutti i dati delle tabelle details (pre-caricati per il frontend)
    result.details = {
        machineProgress: machineDetails,
        sfcProgress: {
            gruppi: sfcGruppi,
            aggr:   sfcAggr,
            macr:   sfcMacr
        },
        scostamento: {
            GD:        scostamentoGD,
            Fornitori: scostamentoFornitori
        },
        mancanti:            mancantiDetails,
        evasi:               evasiDetails,
        modifiche:           modificheDetails,
        varianze:            varianzeDetails,
        analisiGruppiScarico: analisiScarico
    };

    return result;
}

function getDataFilterDashboardKPI(plant, project, phase, customer, section) {
    // Dati di esempio - da sostituire con query reale
    var mockData = [
        { project: "PROGETTO_AC_1", wbe: "WBS-001-A", section: "Section A", phase: "Assembly", customer: "Customer A", sfc: "SFC-10001", order: "ORD-50001", material: "MAT-2001" },
        { project: "PRJ-001", wbe: "WBS-001-B", section: "Section B", phase: "Testing", customer: "Customer B", sfc: "SFC-10002", order: "ORD-50002", material: "MAT-2002" },
        { project: "PRJ-002", wbe: "WBS-002-A", section: "Section A", phase: "Installation", customer: "Customer C", sfc: "SFC-10003", order: "ORD-50003", material: "MAT-2003" },
        { project: "PRJ-002", wbe: "WBS-002-B", section: "Section C", phase: "Assembly", customer: "Customer D", sfc: "SFC-10004", order: "ORD-50004", material: "MAT-2004" },
        { project: "PRJ-003", wbe: "WBS-003-A", section: "Section B", phase: "Testing", customer: "Customer E", sfc: "SFC-10005", order: "ORD-50005", material: "MAT-2005" },
        { project: "PRJ-003", wbe: "WBS-003-B", section: "Section A", phase: "Installation", customer: "Customer F", sfc: "SFC-10006", order: "ORD-50006", material: "MAT-2001" },
        { project: "PROGETTO_AC_1", wbe: "WBS-001-C", section: "Section C", phase: "Assembly", customer: "Customer G", sfc: "SFC-10007", order: "ORD-50007", material: "MAT-2003" },
        { project: "PRJ-004", wbe: "WBS-004-A", section: "Section A", phase: "Testing", customer: "Customer H", sfc: "SFC-10008", order: "ORD-50008", material: "MAT-2006" }
    ];

    // Filtro lato server sui dati mock
    var filtered = mockData.filter(function(item) {
        if (project && item.project !== project) return false;
        if (phase && item.phase !== phase) return false;
        if (customer && item.customer !== customer) return false;
        if (section && item.section !== section) return false;
        return true;
    });

    return filtered;
}

// ========== DETAILS MOCK DATA ==========

/**
 * 2.2.1 Machine Progress Details - Stato di completamento (gerarchia ore)
 * Griglia: Macchina → Macroaggregati → Aggregati → Gruppi → Lavorazioni
 * Colonne: Type, SFC, Work Center, Status, Ore pianificate, Ore marcate, Ore effettive montaggio, % completamento
 */
function getMachineProgressDetails(plant, project, wbs, sfc) {
    // TODO: Implementare query reale
    var columns = [
        { key: "type",                     label: "Type",            width: "180px" },
        { key: "sfc",                      label: "SFC",             width: "220px" },
        { key: "workCenter",               label: "Work Center",     width: "100px" },
        { key: "status",                   label: "Status",          width: "100px" },
        { key: "orePianificate",           label: "Ore pianificate", width: "110px" },
        { key: "oreMarcate",               label: "Ore marcate",     width: "100px" },
        { key: "oreEffettive",             label: "Ore effettive",   width: "100px" },
        { key: "percentualeCompletamento", label: "% completamento", width: "120px" }
    ];
    var data = [
        { type: "MACCHINA",               sfc: "C005.25001.MKM01_121 MK_223", workCenter: "GD",     status: "Start",       orePianificate: 59, oreMarcate: 23, oreEffettive: 23, percentualeCompletamento: "38,98%" },
        { type: "Lavorazione macchina",    sfc: "",                             workCenter: "F_14441", status: "Start",       orePianificate: 7,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" },
        { type: "Aggregato 1",            sfc: "C005.25001.MKM01_MK_COMPLETAMENTO SUPPORTI MODULI BKP_105", workCenter: "GD", status: "Start", orePianificate: 3, oreMarcate: 1, oreEffettive: 1, percentualeCompletamento: "33,33%" },
        { type: "Lavorazione aggregato",   sfc: "",                             workCenter: "GD",     status: "Start",       orePianificate: 3,  oreMarcate: 1,  oreEffettive: 1,  percentualeCompletamento: "33,33%" },
        { type: "Aggregato 2",            sfc: "C005.25001.MKM01_MK_ELE_MODULI REMOTI MK_196", workCenter: "GD", status: "Start", orePianificate: 49, oreMarcate: 22, oreEffettive: 22, percentualeCompletamento: "44,90%" },
        { type: "Lavorazione aggregato",   sfc: "",                             workCenter: "GD",     status: "Complete",    orePianificate: 5,  oreMarcate: 5,  oreEffettive: 5,  percentualeCompletamento: "100,00%" },
        { type: "Gruppo 1",               sfc: "C005.25001.MKM01_28MK_AGGR_306", workCenter: "GD",  status: "Start",       orePianificate: 31, oreMarcate: 17, oreEffettive: 17, percentualeCompletamento: "54,84%" },
        { type: "Lavorazione 1",          sfc: "",                             workCenter: "GD",     status: "Not started", orePianificate: 2,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" },
        { type: "Lavorazione 2",          sfc: "",                             workCenter: "GD",     status: "Complete",    orePianificate: 4,  oreMarcate: 4,  oreEffettive: 4,  percentualeCompletamento: "100,00%" },
        { type: "Lavorazione 3",          sfc: "",                             workCenter: "GD",     status: "Start",       orePianificate: 5,  oreMarcate: 3,  oreEffettive: 3,  percentualeCompletamento: "60,00%" },
        { type: "Lavorazione 4",          sfc: "",                             workCenter: "GD",     status: "Start",       orePianificate: 3,  oreMarcate: 1,  oreEffettive: 1,  percentualeCompletamento: "33,33%" },
        { type: "Lavorazione 5",          sfc: "",                             workCenter: "GD",     status: "Start",       orePianificate: 1,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" },
        { type: "Lavorazione 6",          sfc: "",                             workCenter: "GD",     status: "Complete",    orePianificate: 7,  oreMarcate: 7,  oreEffettive: 7,  percentualeCompletamento: "100,00%" },
        { type: "Lavorazione 7",          sfc: "",                             workCenter: "GD",     status: "Start",       orePianificate: 4,  oreMarcate: 2,  oreEffettive: 2,  percentualeCompletamento: "50,00%" },
        { type: "Lavorazione 8",          sfc: "",                             workCenter: "GD",     status: "Not started", orePianificate: 5,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" },
        { type: "Gruppo 2",               sfc: "C005.25001.MKM01_28MK_KD04_298", workCenter: "F_16013", status: "Start", orePianificate: 13, oreMarcate: 0, oreEffettive: 0, percentualeCompletamento: "0,00%" },
        { type: "Lavorazione 1",          sfc: "",                             workCenter: "F_16013", status: "Start",      orePianificate: 3,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" },
        { type: "Lavorazione 2",          sfc: "",                             workCenter: "F_16014", status: "Complete",   orePianificate: 2,  oreMarcate: 0,  oreEffettive: 3,  percentualeCompletamento: "100,00%" },
        { type: "Lavorazione 3",          sfc: "",                             workCenter: "F_16015", status: "Start",      orePianificate: 4,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" },
        { type: "Lavorazione 4",          sfc: "",                             workCenter: "F_16016", status: "Complete",   orePianificate: 2,  oreMarcate: 2,  oreEffettive: 2,  percentualeCompletamento: "100,00%" },
        { type: "Lavorazione 5",          sfc: "",                             workCenter: "F_16017", status: "Start",      orePianificate: 1,  oreMarcate: 0,  oreEffettive: 0,  percentualeCompletamento: "0,00%" }
    ];
    return { columns: columns, data: data };
}

/**
 * 2.2.2 SFC Gruppi Progress Details - SFC per lavorazioni e per gruppi
 * Vista "per lavorazioni": Macchina, Macro, Aggregato, Gruppo, Lavorazione, Stato, Ore teoriche, Ore effettive, Completata (SI/NO)
 * Vista "per gruppi": Macchina, Macro, Aggregato, Gruppo, #Lavorazioni, #Completate, Gruppo completo, Ore teoriche, Ore completate, %
 */
function getSFCProgressDetails(plant, project, wbs, sfc, level) {
    // TODO: Implementare query reale
    // Restituisce colonne e dati in base al livello selezionato (gruppi/aggr/macr)
    var columnsMap = {
        gruppi: [
            { key: "idMacchina",         label: "ID Macchina" },
            { key: "idMacroaggregato",   label: "ID Macroaggregato" },
            { key: "idAggregato",        label: "ID Aggregato" },
            { key: "idGruppo",           label: "ID Gruppo" },
            { key: "numLavorazioni",     label: "#Lavorazioni" },
            { key: "numCompletate",      label: "#Completate" },
            { key: "gruppoCompleto",     label: "Gruppo completo" },
            { key: "oreTeoricheGruppo",  label: "Ore teoriche" },
            { key: "oreCompletateGruppo", label: "Ore completate" },
            { key: "percentualeCompletamento", label: "% completamento" }
        ],
        aggr: [
            { key: "idMacchina",         label: "ID Macchina" },
            { key: "idMacroaggregato",   label: "ID Macroaggregato" },
            { key: "idAggregato",        label: "ID Aggregato" },
            { key: "numGruppi",          label: "#Gruppi" },
            { key: "numCompletati",      label: "#Completati" },
            { key: "oreTeoricheAggr",    label: "Ore teoriche" },
            { key: "oreCompletateAggr",  label: "Ore completate" },
            { key: "percentualeCompletamento", label: "% completamento" }
        ],
        macr: [
            { key: "idMacchina",          label: "ID Macchina" },
            { key: "idMacroaggregato",    label: "ID Macroaggregato" },
            { key: "numAggregati",        label: "#Aggregati" },
            { key: "numCompletati",       label: "#Completati" },
            { key: "oreTeoricheMacr",     label: "Ore teoriche" },
            { key: "oreCompletateMacr",   label: "Ore completate" },
            { key: "percentualeCompletamento", label: "% completamento" }
        ]
    };

    var dataMap = {
        gruppi: [
            { idMacchina: "MAC1", idMacroaggregato: "MA1", idAggregato: "A1", idGruppo: "G1", numLavorazioni: 2, numCompletate: 0, gruppoCompleto: "NO", oreTeoricheGruppo: 24, oreCompletateGruppo: 6,  percentualeCompletamento: "25,00%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA1", idAggregato: "A1", idGruppo: "G2", numLavorazioni: 2, numCompletate: 2, gruppoCompleto: "SI", oreTeoricheGruppo: 28, oreCompletateGruppo: 28, percentualeCompletamento: "100,00%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA1", idAggregato: "A2", idGruppo: "G3", numLavorazioni: 2, numCompletate: 0, gruppoCompleto: "NO", oreTeoricheGruppo: 38, oreCompletateGruppo: 10, percentualeCompletamento: "26,32%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA1", idAggregato: "A2", idGruppo: "G4", numLavorazioni: 2, numCompletate: 0, gruppoCompleto: "NO", oreTeoricheGruppo: 32, oreCompletateGruppo: 11, percentualeCompletamento: "34,38%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", idAggregato: "A3", idGruppo: "G5", numLavorazioni: 2, numCompletate: 2, gruppoCompleto: "SI", oreTeoricheGruppo: 40, oreCompletateGruppo: 41, percentualeCompletamento: "100,00%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", idAggregato: "A3", idGruppo: "G6", numLavorazioni: 2, numCompletate: 0, gruppoCompleto: "NO", oreTeoricheGruppo: 26, oreCompletateGruppo: 8,  percentualeCompletamento: "30,77%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", idAggregato: "A4", idGruppo: "G7", numLavorazioni: 2, numCompletate: 1, gruppoCompleto: "NO", oreTeoricheGruppo: 38, oreCompletateGruppo: 37, percentualeCompletamento: "97,37%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", idAggregato: "A4", idGruppo: "G8", numLavorazioni: 2, numCompletate: 0, gruppoCompleto: "NO", oreTeoricheGruppo: 36, oreCompletateGruppo: 12, percentualeCompletamento: "33,33%" }
        ],
        aggr: [
            { idMacchina: "MAC1", idMacroaggregato: "MA1", idAggregato: "A1", numGruppi: 2, numCompletati: 1, oreTeoricheAggr: 52,  oreCompletateAggr: 34, percentualeCompletamento: "65,38%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA1", idAggregato: "A2", numGruppi: 2, numCompletati: 0, oreTeoricheAggr: 70,  oreCompletateAggr: 21, percentualeCompletamento: "30,00%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", idAggregato: "A3", numGruppi: 2, numCompletati: 1, oreTeoricheAggr: 66,  oreCompletateAggr: 49, percentualeCompletamento: "74,24%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", idAggregato: "A4", numGruppi: 2, numCompletati: 0, oreTeoricheAggr: 74,  oreCompletateAggr: 49, percentualeCompletamento: "66,22%" }
        ],
        macr: [
            { idMacchina: "MAC1", idMacroaggregato: "MA1", numAggregati: 2, numCompletati: 0, oreTeoricheMacr: 122, oreCompletateMacr: 55,  percentualeCompletamento: "45,08%" },
            { idMacchina: "MAC1", idMacroaggregato: "MA2", numAggregati: 2, numCompletati: 0, oreTeoricheMacr: 140, oreCompletateMacr: 98,  percentualeCompletamento: "70,00%" }
        ]
    };

    var sLevel = level || "gruppi";
    return { columns: columnsMap[sLevel] || columnsMap.gruppi, data: dataMap[sLevel] || dataMap.gruppi };
}

/**
 * 2.2.3 Scostamento Details - Tabella scostamenti (netto varianza)
 * Colonne: Type, SFC, Work Center, Status, % completamento, Ore pianificate, Ore effettive montaggio, Ore varianza, Time spent, Scostamento, Alert
 */
function getScostamentoDetails(plant, project, wbs, sfc, workcenter) {
    // TODO: Implementare query reale
    var columns = [
        { key: "type",                     label: "Type",               width: "160px" },
        { key: "sfc",                      label: "SFC",                width: "200px" },
        { key: "workCenter",               label: "Work Center",        width: "100px" },
        { key: "status",                   label: "Status",             width: "100px" },
        { key: "percentualeCompletamento", label: "% completamento",    width: "110px" },
        { key: "orePianificate",           label: "Ore pianificate",    width: "110px" },
        { key: "oreEffettiveMontaggio",    label: "Ore eff. montaggio", width: "120px" },
        { key: "oreVarianza",              label: "Ore varianza",       width: "100px" },
        { key: "timeSpent",               label: "Time spent",          width: "90px"  },
        { key: "scostamento",              label: "Scostamento",        width: "100px" },
        { key: "alert",                    label: "Alert",              width: "60px"  }
    ];
    var allData = [
        { type: "MACCHINA",             sfc: "C005.25001.MKM01_121 MK_223",  workCenter: "GD",      status: "Start",       percentualeCompletamento: "38,98%",  orePianificate: 59,  oreEffettiveMontaggio: 23, oreVarianza: 16, timeSpent: 39, scostamento: 36, alert: "" },
        { type: "Lavorazione macchina", sfc: "",                              workCenter: "F_14441", status: "Start",       percentualeCompletamento: "0,00%",   orePianificate: 7,   oreEffettiveMontaggio: 0,  oreVarianza: 2,  timeSpent: 2,  scostamento: 7,  alert: "" },
        { type: "Aggregato 1",         sfc: "C005.25001.MKM01_MK_COMPL...",  workCenter: "GD",      status: "Start",       percentualeCompletamento: "33,33%",  orePianificate: 3,   oreEffettiveMontaggio: 1,  oreVarianza: 0,  timeSpent: 1,  scostamento: 2,  alert: "" },
        { type: "Lavorazione aggregato",sfc: "",                              workCenter: "GD",      status: "Start",       percentualeCompletamento: "33,33%",  orePianificate: 3,   oreEffettiveMontaggio: 1,  oreVarianza: 0,  timeSpent: 1,  scostamento: 2,  alert: "" },
        { type: "Aggregato 2",         sfc: "C005.25001.MKM01_MK_ELE...",    workCenter: "GD",      status: "Start",       percentualeCompletamento: "44,90%",  orePianificate: 49,  oreEffettiveMontaggio: 22, oreVarianza: 14, timeSpent: 36, scostamento: 27, alert: "" },
        { type: "Lavorazione aggregato",sfc: "",                              workCenter: "GD",      status: "Complete",    percentualeCompletamento: "100,00%", orePianificate: 5,   oreEffettiveMontaggio: 5,  oreVarianza: 1,  timeSpent: 6,  scostamento: 0,  alert: "" },
        { type: "Gruppo 1",            sfc: "C005.25001.MKM01_28MK_AGG...",  workCenter: "GD",      status: "Start",       percentualeCompletamento: "54,84%",  orePianificate: 31,  oreEffettiveMontaggio: 17, oreVarianza: 10, timeSpent: 27, scostamento: 14, alert: "" },
        { type: "Lavorazione 1",       sfc: "",                              workCenter: "GD",      status: "Not started", percentualeCompletamento: "0,00%",   orePianificate: 2,   oreEffettiveMontaggio: 0,  oreVarianza: 0,  timeSpent: 0,  scostamento: 2,  alert: "" },
        { type: "Lavorazione 2",       sfc: "",                              workCenter: "GD",      status: "Complete",    percentualeCompletamento: "100,00%", orePianificate: 4,   oreEffettiveMontaggio: 4,  oreVarianza: 2,  timeSpent: 6,  scostamento: 0,  alert: "" },
        { type: "Lavorazione 3",       sfc: "",                              workCenter: "GD",      status: "Start",       percentualeCompletamento: "60,00%",  orePianificate: 5,   oreEffettiveMontaggio: 3,  oreVarianza: 1,  timeSpent: 4,  scostamento: 2,  alert: "" },
        { type: "Lavorazione 4",       sfc: "",                              workCenter: "F_16013", status: "Start",       percentualeCompletamento: "33,33%",  orePianificate: 3,   oreEffettiveMontaggio: 4,  oreVarianza: 3,  timeSpent: 7,  scostamento: -1, alert: "!!" },
        { type: "Lavorazione 5",       sfc: "",                              workCenter: "F_16014", status: "Start",       percentualeCompletamento: "0,00%",   orePianificate: 1,   oreEffettiveMontaggio: 0,  oreVarianza: 1,  timeSpent: 1,  scostamento: 1,  alert: "" },
        { type: "Lavorazione 6",       sfc: "",                              workCenter: "F_16015", status: "Complete",    percentualeCompletamento: "100,00%", orePianificate: 7,   oreEffettiveMontaggio: 7,  oreVarianza: 3,  timeSpent: 10, scostamento: 0,  alert: "" },
        { type: "Lavorazione 7",       sfc: "",                              workCenter: "F_16016", status: "Start",       percentualeCompletamento: "50,00%",  orePianificate: 4,   oreEffettiveMontaggio: 4,  oreVarianza: 0,  timeSpent: 4,  scostamento: 0,  alert: "!!" },
        { type: "Lavorazione 8",       sfc: "",                              workCenter: "F_16017", status: "Not started", percentualeCompletamento: "0,00%",   orePianificate: 5,   oreEffettiveMontaggio: 0,  oreVarianza: 0,  timeSpent: 0,  scostamento: 5,  alert: "" }
    ];
    // Filtra per workcenter: GD = solo work center "GD", Fornitori = tutti i non-GD (F_xxxxx)
    var data = allData;
    if (workcenter === "GD") {
        data = allData.filter(function(item) { return item.workCenter === "GD"; });
    } else if (workcenter === "Fornitori") {
        data = allData.filter(function(item) { return item.workCenter !== "GD"; });
    }
    return { columns: columns, data: data };
}

/**
 * 2.3 Mancanti Details - Report Mancanti
 * Apertura report Mancanti esistente, prefiltrato con Project/WBS/Section/SFC
 */
function getMancantiDetails(plant, project, wbs, sfc, section) {
    // TODO: Implementare query reale - si integrerà con il report Mancanti esistente
    var columns = [
        { key: "sfc",               label: "SFC",           width: "120px" },
        { key: "componente",        label: "Componente",    width: "120px" },
        { key: "materiale",         label: "Materiale",     width: "120px" },
        { key: "descrizione",       label: "Descrizione",   width: "220px" },
        { key: "quantitaRichiesta", label: "Qty Richiesta", width: "100px" },
        { key: "quantitaEvasa",     label: "Qty Evasa",     width: "100px" },
        { key: "quantitaMancante",  label: "Qty Mancante",  width: "110px" },
        { key: "bsd",               label: "BSD",           width: "100px" },
        { key: "scaduto",           label: "Scaduto",       width: "80px"  }
    ];
    var data = [
        { sfc: "SFC-10001", componente: "COMP-001", materiale: "MAT-A100", descrizione: "Supporto flangia DN200",  quantitaRichiesta: 4,  quantitaEvasa: 2,  quantitaMancante: 2, bsd: "01/03/2026", scaduto: "SI" },
        { sfc: "SFC-10001", componente: "COMP-002", materiale: "MAT-A200", descrizione: "Modulo BKP standard",     quantitaRichiesta: 10, quantitaEvasa: 10, quantitaMancante: 0, bsd: "05/03/2026", scaduto: "NO" },
        { sfc: "SFC-10001", componente: "COMP-003", materiale: "MAT-B101", descrizione: "Connettore elettrico M12", quantitaRichiesta: 8,  quantitaEvasa: 3,  quantitaMancante: 5, bsd: "10/03/2026", scaduto: "SI" },
        { sfc: "SFC-10001", componente: "COMP-004", materiale: "MAT-B202", descrizione: "Cavo segnale 5m",         quantitaRichiesta: 12, quantitaEvasa: 12, quantitaMancante: 0, bsd: "15/03/2026", scaduto: "NO" },
        { sfc: "SFC-10001", componente: "COMP-005", materiale: "MAT-C301", descrizione: "Piastra montaggio 400x300", quantitaRichiesta: 2, quantitaEvasa: 0,  quantitaMancante: 2, bsd: "20/03/2026", scaduto: "SI" },
        { sfc: "SFC-10001", componente: "COMP-006", materiale: "MAT-C402", descrizione: "Guarnizione OR 50mm",     quantitaRichiesta: 20, quantitaEvasa: 15, quantitaMancante: 5, bsd: "25/03/2026", scaduto: "NO" }
    ];
    return { columns: columns, data: data };
}

/**
 * 2.4 Evasi Details - Tabella sintetica evasi (SFC/Componente/Status/Date rilevanti)
 */
function getEvasiDetails(plant, project, wbs, sfc) {
    // TODO: Implementare query reale
    var columns = [
        { key: "sfc",                 label: "SFC",              width: "120px" },
        { key: "componente",          label: "Componente",       width: "120px" },
        { key: "materiale",           label: "Materiale",        width: "120px" },
        { key: "descrizione",         label: "Descrizione",      width: "200px" },
        { key: "status",              label: "Status",           width: "140px" },
        { key: "dataUscitaMagazzino", label: "Uscita Magazzino", width: "130px" },
        { key: "dataRFID",            label: "Data RFID",        width: "110px" },
        { key: "bsd",                 label: "BSD",              width: "100px" }
    ];
    var data = [
        { sfc: "SFC-10001", componente: "COMP-001", materiale: "MAT-A100", descrizione: "Supporto flangia DN200",   status: "Evaso",             dataUscitaMagazzino: "02/03/2026", dataRFID: "02/03/2026", bsd: "01/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-002", materiale: "MAT-A200", descrizione: "Modulo BKP standard",      status: "Evaso",             dataUscitaMagazzino: "04/03/2026", dataRFID: "04/03/2026", bsd: "05/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-003", materiale: "MAT-B101", descrizione: "Connettore elettrico M12",  status: "Non evaso scaduto", dataUscitaMagazzino: "",           dataRFID: "",           bsd: "10/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-004", materiale: "MAT-B202", descrizione: "Cavo segnale 5m",          status: "Evaso",             dataUscitaMagazzino: "14/03/2026", dataRFID: "14/03/2026", bsd: "15/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-005", materiale: "MAT-C301", descrizione: "Piastra montaggio 400x300", status: "Non evaso scaduto", dataUscitaMagazzino: "",           dataRFID: "",           bsd: "20/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-006", materiale: "MAT-C402", descrizione: "Guarnizione OR 50mm",      status: "Non evaso",         dataUscitaMagazzino: "",           dataRFID: "",           bsd: "25/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-007", materiale: "MAT-D501", descrizione: "Sensore pressione 0-10bar", status: "Evaso",             dataUscitaMagazzino: "18/03/2026", dataRFID: "18/03/2026", bsd: "18/03/2026" },
        { sfc: "SFC-10001", componente: "COMP-008", materiale: "MAT-D602", descrizione: "Valvola pneumatica 3/2",   status: "Non evaso",         dataUscitaMagazzino: "",           dataRFID: "",           bsd: "30/03/2026" }
    ];
    return { columns: columns, data: data };
}

/**
 * 2.5.2 Modifiche Engineering Details - Tabella Modifiche (dedicata)
 * Colonne: Type, Prog.Number/Process Id, Material, Child, Qty, Flux, Status, Data, Owner
 */
function getModificheDetails(plant, project, wbs, sfc, section) {
    // TODO: Implementare query reale
    var columns = [
        { key: "type",       label: "Type",         width: "70px"  },
        { key: "progNumber", label: "Prog. Number",  width: "140px" },
        { key: "processId",  label: "Process Id",    width: "100px" },
        { key: "material",   label: "Material",      width: "110px" },
        { key: "child",      label: "Child",         width: "100px" },
        { key: "qty",        label: "Qty",           width: "60px"  },
        { key: "flux",       label: "Flux",          width: "90px"  },
        { key: "status",     label: "Status",        width: "110px" },
        { key: "data",       label: "Data",          width: "100px" },
        { key: "owner",      label: "Owner",         width: "130px" }
    ];
    var data = [
        { type: "ECN", progNumber: "ECN-2026-001", processId: "PRC-100", material: "MAT-A100", child: "CHILD-01", qty: 4,  flux: "Standard",   status: "Open",        data: "05/03/2026", owner: "Engineering A" },
        { type: "ECN", progNumber: "ECN-2026-002", processId: "PRC-101", material: "MAT-B101", child: "CHILD-02", qty: 2,  flux: "Urgente",    status: "Implemented", data: "08/03/2026", owner: "Engineering B" },
        { type: "ECR", progNumber: "ECR-2026-003", processId: "PRC-102", material: "MAT-C301", child: "CHILD-03", qty: 1,  flux: "Standard",   status: "Open",        data: "10/03/2026", owner: "Design Team" },
        { type: "ECN", progNumber: "ECN-2026-004", processId: "PRC-103", material: "MAT-A200", child: "CHILD-04", qty: 10, flux: "Standard",   status: "Closed",      data: "12/03/2026", owner: "Engineering A" },
        { type: "ECR", progNumber: "ECR-2026-005", processId: "PRC-104", material: "MAT-D501", child: "CHILD-05", qty: 3,  flux: "Urgente",    status: "Open",        data: "15/03/2026", owner: "Engineering B" },
        { type: "ECN", progNumber: "ECN-2026-006", processId: "PRC-105", material: "MAT-B202", child: "CHILD-06", qty: 6,  flux: "Standard",   status: "Implemented", data: "18/03/2026", owner: "Design Team" },
        { type: "ECN", progNumber: "ECN-2026-007", processId: "PRC-106", material: "MAT-C402", child: "CHILD-07", qty: 8,  flux: "Standard",   status: "Closed",      data: "20/03/2026", owner: "Engineering A" }
    ];
    return { columns: columns, data: data };
}

/**
 * 2.6 Varianze Details - Tabella Varianze
 * Colonne: Codice, Tipologia, Responsabilità, Ore varianza, Include (Y/N); filtro per periodo/Project/WBS
 */
function getVarianzeDetails(plant, project, wbs, sfc) {
    // TODO: Implementare query reale
    var columns = [
        { key: "codice",         label: "Codice",         width: "80px"  },
        { key: "tipologia",      label: "Tipologia",      width: "200px" },
        { key: "responsabilita", label: "Responsabilità", width: "180px" },
        { key: "oreVarianza",    label: "Ore varianza",   width: "110px" },
        { key: "include",        label: "Include (Y/N)",  width: "100px" }
    ];
    var data = [
        { codice: "V29", tipologia: "Attesa materiale",         responsabilita: "Operational",      oreVarianza: 31, include: "Y" },
        { codice: "V24", tipologia: "Rilavorazione",            responsabilita: "Assembly",          oreVarianza: 24, include: "Y" },
        { codice: "V06", tipologia: "Attesa documentazione",    responsabilita: "Engineering",       oreVarianza: 14, include: "Y" },
        { codice: "V26", tipologia: "Difetto fornitore",        responsabilita: "Fornitori",         oreVarianza: 12, include: "Y" },
        { codice: "V12", tipologia: "Modifica engineering",     responsabilita: "Engineering",       oreVarianza: 11, include: "Y" },
        { codice: "NA",  tipologia: "Non attribuita",           responsabilita: "Non attribuita",    oreVarianza: 9,  include: "N" },
        { codice: "V28", tipologia: "Attesa attrezzatura",      responsabilita: "Operational",       oreVarianza: 5,  include: "Y" },
        { codice: "V36", tipologia: "Ritardo consegna fornit.", responsabilita: "Fornitori Assembly", oreVarianza: 5,  include: "Y" },
        { codice: "V02", tipologia: "Setup macchina",           responsabilita: "Assembly",          oreVarianza: 3,  include: "Y" },
        { codice: "V15", tipologia: "Problema qualità",         responsabilita: "Sales",             oreVarianza: 3,  include: "Y" }
    ];
    return { columns: columns, data: data };
}

/**
 * 2.7 Analisi gruppi allo scarico Details
 * Tabella: SFC Gruppi, Data BSD, Data scarico, Delay, Data uscita RFID mag, Data completamento, % oggi, % a completamento
 */
function getAnalisiGruppiScarico(plant, project, wbs, sfc) {
    // TODO: Implementare query reale
    var columns = [
        { key: "sfcGruppo",                label: "SFC Gruppi",         width: "140px" },
        { key: "dataBSD",                  label: "Data BSD",           width: "100px" },
        { key: "dataScarico",              label: "Data scarico",       width: "100px" },
        { key: "delay",                    label: "Delay",              width: "70px"  },
        { key: "dataUscitaRFIDMag",        label: "Uscita RFID mag.",   width: "130px" },
        { key: "dataCompletamento",        label: "Data completamento", width: "140px" },
        { key: "percentualeOggi",          label: "% oggi",             width: "90px"  },
        { key: "percentualeCompletamento", label: "% a completamento",  width: "130px" }
    ];
    var data = [
        { sfcGruppo: "G1-SFC-10001", dataBSD: "01/03/2026", dataScarico: "05/03/2026", delay: "SI", dataUscitaRFIDMag: "02/03/2026", dataCompletamento: "",           percentualeOggi: "54,84%",  percentualeCompletamento: "" },
        { sfcGruppo: "G2-SFC-10001", dataBSD: "05/03/2026", dataScarico: "06/03/2026", delay: "SI", dataUscitaRFIDMag: "05/03/2026", dataCompletamento: "10/03/2026", percentualeOggi: "100,00%", percentualeCompletamento: "100,00%" },
        { sfcGruppo: "G3-SFC-10001", dataBSD: "10/03/2026", dataScarico: "12/03/2026", delay: "SI", dataUscitaRFIDMag: "11/03/2026", dataCompletamento: "",           percentualeOggi: "26,32%",  percentualeCompletamento: "" },
        { sfcGruppo: "G4-SFC-10001", dataBSD: "15/03/2026", dataScarico: "",           delay: "NO", dataUscitaRFIDMag: "",           dataCompletamento: "",           percentualeOggi: "34,38%",  percentualeCompletamento: "" },
        { sfcGruppo: "G5-SFC-10001", dataBSD: "08/03/2026", dataScarico: "08/03/2026", delay: "NO", dataUscitaRFIDMag: "08/03/2026", dataCompletamento: "09/03/2026", percentualeOggi: "100,00%", percentualeCompletamento: "100,00%" },
        { sfcGruppo: "G6-SFC-10001", dataBSD: "20/03/2026", dataScarico: "",           delay: "NO", dataUscitaRFIDMag: "",           dataCompletamento: "",           percentualeOggi: "30,77%",  percentualeCompletamento: "" },
        { sfcGruppo: "G7-SFC-10001", dataBSD: "12/03/2026", dataScarico: "15/03/2026", delay: "SI", dataUscitaRFIDMag: "13/03/2026", dataCompletamento: "",           percentualeOggi: "97,37%",  percentualeCompletamento: "" },
        { sfcGruppo: "G8-SFC-10001", dataBSD: "25/03/2026", dataScarico: "",           delay: "NO", dataUscitaRFIDMag: "",           dataCompletamento: "",           percentualeOggi: "33,33%",  percentualeCompletamento: "" }
    ];
    return { columns: columns, data: data };
}

module.exports = { 
    getDashboardKPI, 
    getDataFilterDashboardKPI,
    getMachineProgressDetails,
    getSFCProgressDetails,
    getScostamentoDetails,
    getMancantiDetails,
    getEvasiDetails,
    getModificheDetails,
    getVarianzeDetails,
    getAnalisiGruppiScarico
}

// ========== FUNZIONI DI CALCOLO CHART DA DATI TABELLE ==========

/**
 * Calcola % Gruppi (Completati / Iniziati / Da iniziare) dal detail SFC per livello
 */
function _calcGruppiLevelChart(aData) {
    var total = aData.length;
    if (total === 0) return [
        { label: "Completati", value: 0 },
        { label: "Iniziati", value: 0 },
        { label: "Da iniziare", value: 0 }
    ];
    var completati = 0, iniziati = 0, daIniziare = 0;
    aData.forEach(function(row) {
        var pct = row.percentualeCompletamento || "0,00%";
        if (pct === "100,00%") completati++;
        else if (pct === "0,00%") daIniziare++;
        else iniziati++;
    });
    return [
        { label: "Completati",  value: Math.round(completati / total * 100) },
        { label: "Iniziati",    value: Math.round(iniziati / total * 100) },
        { label: "Da iniziare", value: Math.round(daIniziare / total * 100) }
    ];
}

/**
 * Calcola Machine Progress chart (ore per stato) dalle lavorazioni
 */
function _calcMachineProgressChart(aData) {
    var oreComplete = 0, oreStart = 0, oreNotStarted = 0;
    aData.forEach(function(row) {
        if (!row.type.startsWith("Lavorazione")) return;
        var ore = row.orePianificate || 0;
        if (row.status === "Complete") oreComplete += ore;
        else if (row.status === "Start") oreStart += ore;
        else oreNotStarted += ore;
    });
    return [
        { label: "Ore completate",  value: oreComplete },
        { label: "Ore iniziate",    value: oreStart },
        { label: "Ore da iniziare", value: oreNotStarted }
    ];
}

/**
 * Calcola Scostamento chart (Pianificato vs Marcato) dalle lavorazioni filtrate per workcenter
 */
function _calcScostamentoChart(aData) {
    var pianificato = 0, marcato = 0;
    aData.forEach(function(row) {
        if (!row.type.startsWith("Lavorazione")) return;
        pianificato += row.orePianificate || 0;
        marcato += row.oreEffettiveMontaggio || 0;
    });
    return [
        { label: "Pianificato", value: pianificato },
        { label: "Marcato",     value: marcato }
    ];
}

/**
 * Calcola summary mancanti (percentuale e totale) dai dati tabella
 */
function _calcMancantiSummary(aData) {
    var totalRichiesta = 0, totalMancante = 0;
    aData.forEach(function(row) {
        totalRichiesta += row.quantitaRichiesta || 0;
        totalMancante  += row.quantitaMancante || 0;
    });
    var pct = totalRichiesta > 0 ? (totalMancante / totalRichiesta * 100).toFixed(1).replace(".", ",") : "0";
    return { percentuale: pct + "%", totale: totalMancante + "/" + totalRichiesta };
}

/**
 * Calcola Mancanti chart (con mancanti / scaduti / no mancanti) dai dati tabella
 */
function _calcMancantiChart(aData) {
    var conMancanti = 0, mancantiScaduti = 0, noMancanti = 0;
    aData.forEach(function(row) {
        if ((row.quantitaMancante || 0) === 0) noMancanti++;
        else if (row.scaduto === "SI") mancantiScaduti++;
        else conMancanti++;
    });
    return [
        { label: "Con mancanti",     value: conMancanti },
        { label: "Mancanti scaduti", value: mancantiScaduti },
        { label: "No mancanti",      value: noMancanti }
    ];
}

/**
 * Calcola Evasi chart (evasi / non evasi / non evasi scaduti) dai dati tabella
 */
function _calcEvasiChart(aData) {
    var evasi = 0, nonEvasi = 0, nonEvasiScaduti = 0;
    aData.forEach(function(row) {
        if (row.status === "Evaso") evasi++;
        else if (row.status === "Non evaso scaduto") nonEvasiScaduti++;
        else nonEvasi++;
    });
    return [
        { label: "Non evasi",         value: nonEvasi },
        { label: "Non evasi scaduti", value: nonEvasiScaduti },
        { label: "Evasi",             value: evasi }
    ];
}

/**
 * Calcola Modifiche chart (raggruppate per type, filtrate per status Open o Closed/Implemented)
 */
function _calcModificheChart(aData, sStatusFilter) {
    var groups = {};
    aData.forEach(function(row) {
        var match = false;
        if (sStatusFilter === "Open") {
            match = row.status === "Open";
        } else {
            match = row.status === "Closed" || row.status === "Implemented";
        }
        if (match) {
            var type = row.type || "Other";
            groups[type] = (groups[type] || 0) + 1;
        }
    });
    return Object.keys(groups).map(function(key) {
        return { label: key, value: groups[key] };
    });
}

/**
 * Calcola Tipologia Varianze chart (raggruppato per codice, somma ore varianza)
 */
function _calcTipologiaVarianzeChart(aData) {
    var groups = {};
    aData.forEach(function(row) {
        var key = row.codice || "NA";
        groups[key] = (groups[key] || 0) + (row.oreVarianza || 0);
    });
    return Object.keys(groups).map(function(key) {
        return { label: key === "NA" ? "Non attr." : key, value: groups[key] };
    }).sort(function(a, b) { return b.value - a.value; });
}

/**
 * Calcola Responsabilità Varianze chart (raggruppato per responsabilità, somma ore varianza)
 */
function _calcResponsabilitaVarianzeChart(aData) {
    var groups = {};
    aData.forEach(function(row) {
        var key = row.responsabilita || "Non attribuita";
        groups[key] = (groups[key] || 0) + (row.oreVarianza || 0);
    });
    var labelMap = {
        "Non attribuita": "Non attr.",
        "Fornitori Assembly": "Forn. Ass."
    };
    return Object.keys(groups).map(function(key) {
        return { label: labelMap[key] || key, value: groups[key] };
    }).sort(function(a, b) { return b.value - a.value; });
}