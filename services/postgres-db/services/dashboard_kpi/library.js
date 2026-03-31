const postgresdbService = require('../../connection');
const queryDashKPI = require("./queries");

async function getDashboardKPI(plant) {

    var result = {};
    result.gruppi = { daIniziare: "20%", iniziati: "55%", completati: "25%" };
    result.mancanti = { percentuale: "7,5%", totale: "150/2000" };
    result.nonConformita = { gruppiConNC: "43%", maOpen: "15", maClosed: "25" };
    // Dati per i chart - settati come oggetto unico per evitare problemi con path annidati
    result.chartData = {
        machineProgress: [
            { label: "Ore completate", value: 45 },
            { label: "Ore iniziate", value: 22 },
            { label: "Ore da iniziare", value: 33 }
        ],
        sfcProgress: [
            { label: "SFC completati", value: 25 },
            { label: "SFC iniziati", value: 55 },
            { label: "SFC da iniziare", value: 20 }
        ],
        scostamento: [
            { label: "Pianificato", value: 1500 },
            { label: "Marcato", value: 1200 }
        ],
        mancanti: [
            { label: "Con mancanti", value: 20 },
            { label: "Mancanti scaduti", value: 44 },
            { label: "No mancanti", value: 56 }
        ],
        evasi: [
            { label: "Non evasi", value: 37 },
            { label: "Non evasi scaduti", value: 13 },
            { label: "Evasi", value: 50 }
        ],
        ncPresenza: [
            { label: "NC open", value: 20 },
            { label: "NC bloccanti", value: 28 },
            { label: "NC closed", value: 52 }
        ],
        modificheOpen: [
            { label: "MA", value: 7 },
            { label: "MT", value: 3 },
            { label: "MK", value: 5 }
        ],
        modificheClosed: [
            { label: "MA", value: 12 },
            { label: "MT", value: 5 },
            { label: "MK", value: 8 }
        ],
        tipologiaVarianze: [
            { label: "V29", value: 31 },
            { label: "V24", value: 24 },
            { label: "V06", value: 14 },
            { label: "V26", value: 12 },
            { label: "V12", value: 11 },
            { label: "Non attr.", value: 9 },
            { label: "V28", value: 5 },
            { label: "V36", value: 5 },
            { label: "V02", value: 3 },
            { label: "V15", value: 3 }
        ],
        responsabilitaVarianze: [
            { label: "Operational", value: 21 },
            { label: "Non attr.", value: 17 },
            { label: "Assembly", value: 16 },
            { label: "Fornitori", value: 11 },
            { label: "Forn. Ass.", value: 9 },
            { label: "Engineering", value: 7 },
            { label: "Sales", value: 5 }
        ]
    };
    return result;
}

module.exports = { getDashboardKPI }