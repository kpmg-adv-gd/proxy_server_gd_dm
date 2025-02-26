# Backend - Guida all'uso e all'estensione

Benvenuto nella documentazione del backend per il progetto. Questo backend è un server Node.js basato su Express, progettato per gestire le comunicazioni tra il frontend e diversi sistemi esterni, inclusi SAP DM e il nostro database custom PostgreSQL.

## Struttura del progetto

Il progetto è organizzato in tre cartelle principali per garantire scalabilità e modularità:

### 🛠️ **Api**

Gestisce le chiamate alle API di SAP DM. Ogni API ha una propria cartella, in cui troverai due file principali:
- **Listener**: Contiene la route per richiamare l'API dal frontend, mantenendolo il più pulito e diretto possibile.
- **Library**: Contiene la logica per la manipolazione dei dati prima di restituirli al frontend.

### 🗃️ **MDO**

Cartella riservata per la gestione di logiche specifiche per MDO (Master Data Objects).

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

## Estensione del backend

Per aggiungere nuove funzionalità o estendere il backend:
1. **Aggiungi un nuovo listener** per la funzionalità o API che desideri integrare.
2. Crea una cartella dedicata nella struttura del progetto (Api, MDO, o Postgres-DB).
3. Scrivi il codice di logica per la nuova funzionalità, seguendo la struttura di esempio delle cartelle già esistenti.

Ogni nuova funzionalità dovrebbe includere:
- Un **listener** per ricevere richieste dal frontend.
- Un **file per le query** se interagisce con il database.
- Una **library** per la logica di manipolazione dei dati.

## Conclusioni

Questa struttura garantisce che ogni parte del progetto sia chiara, facilmente estendibile e mantenibile nel tempo. Se hai bisogno di ulteriori dettagli su come configurare o estendere il backend, consulta i singoli file di esempio nelle cartelle `Api`, `MDO` e `Postgres-DB`.
