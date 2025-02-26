# Backend - Guida all'uso e all'estensione

Benvenuto nella documentazione del backend per il progetto. Questo backend è un server Node.js basato su Express, progettato per gestire le comunicazioni tra il frontend e diversi sistemi esterni, inclusi SAP DM e il nostro database custom PostgreSQL.

## Struttura del progetto

Il progetto è organizzato in tre cartelle principali per garantire scalabilità e modularità:

### 🛠️ **Api**

Gestisce le chiamate alle API di SAP DM. Ogni API ha una propria cartella, in cui troverai due file principali:
- **Listener**: Contiene la route per richiamare l'API dal frontend, mantenendolo il più pulito e diretto possibile.
- **Library**: Contiene la logica per la manipolazione dei dati prima di restituirli al frontend.

##### Esempio di richiesta:

```http
POST /api/bom/getBomMultilivelloTreeTableData
Content-Type: application/json

{
  "order": "ORDER_1234",
  "plant": "PLANT_001"
}
```

### 🗃️ **MDO**

La cartella **MDO** gestisce le richieste e le operazioni relative agli **MDO (Master Data Objects)**, che vengono esposti dal data-center della relativa istanza DM contenuta nel subaccount BTP di destinazione.

#### Richiamare un MDO

In GET sul sottopath `/mdo/` del servizio, è possibile richiamare gli MDO esposti dal data-center. L'utilizzo è quasi trasparente: basta richiamare il sotto-path del server `/mdo/` seguito dal nome dell'MDO che si vuole interrogare, insieme ai relativi parametri (OData).

##### Esempio:

```text
/mdo/SfcStepStatus?$filter=Sfc eq 'SFC_INO'
```

### 🏛️ **Postgres-DB**

Gestisce l'integrazione con il nostro database custom PostgreSQL. Ogni servizio che vi si integra deve avere tre file:
- **Listener**: Contiene la route per essere chiamato dall'esterno e invia la risposta.
- **Queries**: Contiene le query per interagire con il database.
- **Library**: Esegue le query e manipola i dati prima di restituirli al frontend.

## Cartella `Utility`

La cartella `utility` centralizza i metodi comuni, utilizzati in tutto il progetto per semplificare e riutilizzare il codice.

### **CommonCallApi**

Contiene due funzioni fondamentali per l'interazione con le API di SAP DM:
- **callGet**: Utilizzata per eseguire chiamate GET alle API di SAP DM.
- **callPost**: Utilizzata per eseguire chiamate POST alle API di SAP DM.

Entrambe le funzioni inviano il **Bearer Token**, generato attraverso una funzione dedicata che, partendo dalle variabili nel file `.env`, si occupa di autenticare la chiamata alle API di SAP DM.

## Configurazione

Nel file `.env`, troverai la configurazione necessaria per l’autenticazione, inclusi i dettagli per generare il Bearer Token e configurare la whitelist dei domini che possono richiamare il server. In questo modo, il sistema è sicuro e scalabile.

## Conclusioni

Questa struttura garantisce che ogni parte del progetto sia chiara, facilmente estendibile e mantenibile nel tempo. Se hai bisogno di ulteriori dettagli su come configurare o estendere il backend, consulta i singoli file di esempio nelle cartelle `Api`, `MDO` e `Postgres-DB`.
