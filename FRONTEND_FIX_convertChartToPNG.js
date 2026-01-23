// ============================================
// VERSIONE MIGLIORATA CON TIMEOUT E FALLBACK
// ============================================

_convertChartToPNG: function(chartId) {
    return new Promise((resolve, reject) => {
        // Timeout di 10 secondi per evitare blocchi infiniti
        const timeoutId = setTimeout(() => {
            console.warn("Timeout conversione grafico:", chartId);
            resolve(null);
        }, 10000);
        
        try {
            const oVizFrame = this.byId(chartId);
            if (!oVizFrame) {
                clearTimeout(timeoutId);
                resolve(null);
                return;
            }
            
            // Verifica che VizFrame abbia il metodo exportToSVGString
            if (typeof oVizFrame.exportToSVGString !== "function") {
                console.warn("exportToSVGString non disponibile per:", chartId);
                clearTimeout(timeoutId);
                resolve(null);
                return;
            }
            
            console.log("Inizio esportazione grafico:", chartId);
            
            // Esporta VizFrame in SVG
            oVizFrame.exportToSVGString({
                width: 800,
                height: 600
            }, function(svgString) {
                console.log("SVG ricevuto, lunghezza:", svgString.length);
                
                // Verifica che SVG non sia vuoto
                if (!svgString || svgString.length < 100) {
                    console.warn("SVG vuoto o troppo piccolo");
                    clearTimeout(timeoutId);
                    resolve(null);
                    return;
                }
                
                // Crea canvas per conversione
                const canvas = document.createElement("canvas");
                canvas.width = 800;
                canvas.height = 600;
                const ctx = canvas.getContext("2d");
                
                // Aggiungi sfondo bianco al canvas
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const img = new Image();
                const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(svgBlob);
                
                // Timeout per il caricamento dell'immagine (5 secondi)
                const imgTimeoutId = setTimeout(() => {
                    console.warn("Timeout caricamento immagine SVG");
                    URL.revokeObjectURL(url);
                    clearTimeout(timeoutId);
                    resolve(null);
                }, 5000);
                
                img.onload = function() {
                    clearTimeout(imgTimeoutId);
                    console.log("Immagine SVG caricata, disegno su canvas");
                    
                    try {
                        ctx.drawImage(img, 0, 0);
                        const pngDataUrl = canvas.toDataURL("image/png");
                        console.log("PNG generato, lunghezza:", pngDataUrl.length);
                        URL.revokeObjectURL(url);
                        clearTimeout(timeoutId);
                        resolve(pngDataUrl);
                    } catch (error) {
                        console.error("Errore drawImage:", error);
                        URL.revokeObjectURL(url);
                        clearTimeout(timeoutId);
                        resolve(null);
                    }
                };
                
                img.onerror = function(error) {
                    clearTimeout(imgTimeoutId);
                    console.error("Errore caricamento immagine SVG:", error);
                    URL.revokeObjectURL(url);
                    clearTimeout(timeoutId);
                    resolve(null);
                };
                
                img.src = url;
                
            }, function(error) {
                console.error("Errore exportToSVGString:", error);
                clearTimeout(timeoutId);
                resolve(null);
            });
            
        } catch (error) {
            console.error("Errore conversione grafico:", error);
            clearTimeout(timeoutId);
            resolve(null);
        }
    });
},


// ============================================
// VERSIONE ALTERNATIVA: GENERA PDF SENZA GRAFICI
// ============================================

_generatePDF_NoCharts: async function() {
    const oModel = this.getView().getModel("FinalCollaudoDetailModel");
    if (!oModel) {
        sap.m.MessageToast.show("Modello non trovato");
        return;
    }
    
    const pdfData = {
        header: oModel.getProperty("/header"),
        groupsData: oModel.getProperty("/groupsData"),
        weights: oModel.getProperty("/weights"),
        varianzaCollaudo: oModel.getProperty("/varianzaCollaudo"),
        treeData: oModel.getProperty("/treeData"),
        treeDataModifiche: oModel.getProperty("/treeDataModifiche"),
        treeDataActivities: oModel.getProperty("/treeDataActivities"),
        mancanti: oModel.getProperty("/mancanti"),
        parameteresData: oModel.getProperty("/parameteresData"),
        riepilogoText: oModel.getProperty("/riepilogoText"),
        // NON inviamo i grafici - il backend li salterà
        varianzaCollaudoChartPNG: null,
        oreCollaudoChartPNG: null
    };
    
    try {
        sap.ui.core.BusyIndicator.show(0);
        
        const response = await fetch("/api/generate-pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pdfData)
        });
        
        if (!response.ok) {
            throw new Error("Errore generazione PDF: " + response.status);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Rapporto_Fine_Collaudo.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        sap.m.MessageToast.show("PDF generato con successo!");
        
    } catch (error) {
        console.error("Errore:", error);
        sap.m.MessageBox.error("Errore durante la generazione del PDF: " + error.message);
    } finally {
        sap.ui.core.BusyIndicator.hide();
    }
},


// ============================================
// VERSIONE CON RETRY E PROGRESSIVO
// ============================================

_generatePDF_WithRetry: async function() {
    const oModel = this.getView().getModel("FinalCollaudoDetailModel");
    if (!oModel) {
        sap.m.MessageToast.show("Modello non trovato");
        return;
    }
    
    try {
        sap.ui.core.BusyIndicator.show(0);
        
        // Converti grafici con retry
        const convertWithRetry = async (chartId, maxRetries = 2) => {
            for (let i = 0; i < maxRetries; i++) {
                console.log(`Tentativo ${i + 1}/${maxRetries} per ${chartId}`);
                const result = await this._convertChartToPNG(chartId);
                if (result) {
                    console.log(`Conversione riuscita per ${chartId}`);
                    return result;
                }
                // Aspetta un po' prima del prossimo tentativo
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            console.warn(`Impossibile convertire ${chartId} dopo ${maxRetries} tentativi`);
            return null;
        };
        
        console.log("Inizio conversione grafici...");
        
        // Tenta di convertire entrambi i grafici con retry
        const [varianzaChart, oreChart] = await Promise.all([
            convertWithRetry("idPieChart"),
            convertWithRetry("idVizFrame")
        ]);
        
        console.log("Conversione grafici completata:", {
            varianza: varianzaChart ? "OK" : "FALLITO",
            ore: oreChart ? "OK" : "FALLITO"
        });
        
        const pdfData = {
            header: oModel.getProperty("/header"),
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
        
        console.log("Invio richiesta al backend...");
        
        const response = await fetch("/api/generate-pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pdfData)
        });
        
        if (!response.ok) {
            throw new Error("Errore generazione PDF: " + response.status);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Rapporto_Fine_Collaudo.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        sap.m.MessageToast.show("PDF generato con successo!");
        
    } catch (error) {
        console.error("Errore:", error);
        sap.m.MessageBox.error("Errore durante la generazione del PDF: " + error.message);
    } finally {
        sap.ui.core.BusyIndicator.hide();
    }
}
