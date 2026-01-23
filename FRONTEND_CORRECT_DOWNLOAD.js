// ============================================
// VERSIONE CORRETTA DEL DOWNLOAD PDF
// ============================================

_generatePDF: async function() {
    const oModel = this.getView().getModel("FinalCollaudoDetailModel");
    if (!oModel) {
        sap.m.MessageToast.show("Modello non trovato");
        return;
    }
    
    const header = oModel.getProperty("/header");
    const pdfData = {
        header: header,
        groupsData: oModel.getProperty("/groupsData"),
        weights: oModel.getProperty("/weights"),
        varianzaCollaudo: oModel.getProperty("/varianzaCollaudo"),
        treeData: oModel.getProperty("/treeData"),
        treeDataModifiche: oModel.getProperty("/treeDataModifiche"),
        treeDataActivities: oModel.getProperty("/treeDataActivities"),
        mancanti: oModel.getProperty("/mancanti"),
        parameteresData: oModel.getProperty("/parameteresData"),
        riepilogoText: oModel.getProperty("/riepilogoText"),
        varianzaCollaudoChartPNG: null, // o convertire i grafici
        oreCollaudoChartPNG: null
    };
    
    try {
        sap.ui.core.BusyIndicator.show(0);
        
        console.log("Invio richiesta PDF al backend...");
        
        // CORREZIONE: body deve essere JSON.stringify(pdfData) NON { pdfData }
        const response = await fetch("/api/generate-pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pdfData)  // <-- CORRETTO
        });
        
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers.get("content-type"));
        
        // IMPORTANTE: Controlla se la risposta è OK PRIMA di scaricare
        if (!response.ok) {
            // Prova a leggere il messaggio di errore
            let errorMessage = "Errore nella generazione del PDF";
            try {
                const errorText = await response.text();
                console.error("Errore dal backend:", errorText);
                errorMessage += ": " + errorText;
            } catch (e) {
                // Ignora se non riesce a leggere l'errore
            }
            throw new Error(errorMessage);
        }
        
        // Verifica che la risposta sia effettivamente un PDF
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/pdf")) {
            console.warn("Content-Type non è PDF:", contentType);
            // Prova a vedere cosa ha restituito
            const text = await response.text();
            console.error("Risposta ricevuta:", text.substring(0, 500));
            throw new Error("Il server non ha restituito un PDF valido");
        }
        
        // Ora possiamo scaricare il blob
        const blob = await response.blob();
        console.log("Blob ricevuto, dimensione:", blob.size, "bytes");
        
        // Verifica che il blob non sia vuoto
        if (blob.size === 0) {
            throw new Error("Il PDF generato è vuoto");
        }
        
        // CORREZIONE: usa downloadUrl invece di url per evitare conflitti
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `Report_Collaudo_${header.sfc || "documento"}_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        sap.m.MessageToast.show("PDF generato e scaricato con successo!");
        console.log("Download completato");
        
    } catch (error) {
        console.error("Errore completo:", error);
        sap.m.MessageBox.error("Errore durante la generazione del PDF: " + error.message);
    } finally {
        sap.ui.core.BusyIndicator.hide();
    }
},


// ============================================
// VERSIONE CON GRAFICI E RETRY
// ============================================

_generatePDF_WithCharts: async function() {
    const oModel = this.getView().getModel("FinalCollaudoDetailModel");
    if (!oModel) {
        sap.m.MessageToast.show("Modello non trovato");
        return;
    }
    
    const header = oModel.getProperty("/header");
    
    try {
        sap.ui.core.BusyIndicator.show(0);
        
        console.log("Conversione grafici in corso...");
        
        // Converti grafici con timeout
        const [varianzaChart, oreChart] = await Promise.all([
            this._convertChartToPNG("idPieChart").catch(err => {
                console.warn("Errore conversione grafico varianza:", err);
                return null;
            }),
            this._convertChartToPNG("idVizFrame").catch(err => {
                console.warn("Errore conversione grafico ore:", err);
                return null;
            })
        ]);
        
        console.log("Grafici convertiti:", {
            varianza: varianzaChart ? "OK" : "SKIP",
            ore: oreChart ? "OK" : "SKIP"
        });
        
        const pdfData = {
            header: header,
            groupsData: oModel.getProperty("/groupsData"),
            weights: oModel.getProperty("/weights"),
            varianzaCollaudo: oModel.getProperty("/varianzaCollaudo"),
            treeData: oModel.getProperty("/treeData"),
            treeDataModifiche: oModel.getProperty("/treeDataModifiche"),
            treeDataActivities: oModel.getProperty("/treeDataActivities"),
            mancanti: oModel.getProperty("/mancanti"),
            parameteresData: oModel.getProperty("/parameteresData"),
            riepilogoText: oModel.getProperty("/riepilogoText"),
            varianzaCollaudoChartPNG: varianzaChart,
            oreCollaudoChartPNG: oreChart
        };
        
        console.log("Invio richiesta PDF al backend...");
        
        const response = await fetch("/api/generate-pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pdfData)
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            let errorMessage = "Errore nella generazione del PDF";
            try {
                const errorText = await response.text();
                console.error("Errore dal backend:", errorText);
                errorMessage += ": " + errorText;
            } catch (e) {
                // Ignora
            }
            throw new Error(errorMessage);
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/pdf")) {
            console.warn("Content-Type non è PDF:", contentType);
            const text = await response.text();
            console.error("Risposta ricevuta:", text.substring(0, 500));
            throw new Error("Il server non ha restituito un PDF valido");
        }
        
        const blob = await response.blob();
        console.log("Blob ricevuto, dimensione:", blob.size, "bytes");
        
        if (blob.size === 0) {
            throw new Error("Il PDF generato è vuoto");
        }
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `Report_Collaudo_${header.sfc || "documento"}_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        sap.m.MessageToast.show("PDF generato e scaricato con successo!");
        console.log("Download completato");
        
    } catch (error) {
        console.error("Errore completo:", error);
        sap.m.MessageBox.error("Errore durante la generazione del PDF: " + error.message);
    } finally {
        sap.ui.core.BusyIndicator.hide();
    }
}
