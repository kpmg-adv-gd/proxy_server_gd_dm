const postgresdbService = require('./library');

module.exports.listenerSetup = (app) => {

    app.post("/db/insertDefect", async (req, res) => {
        var { idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, cause, notificationType, coding, replaceInAssembly, defectNote,
            responsible, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, project, phase, idLev1, idLev2, idLev3 } = req.body;
        if (!cause) cause = null;
        try {
            const result = await postgresdbService.insertZDefect(idDefect, material, mesOrder, assembly, title, description, priority, variance, blocking, createQN, notificationType,
                coding, replaceInAssembly, defectNote, responsible, sfc, user, operation, plant, wbe, typeOrder, group, code, dmOrder, cause, project, phase, idLev1, idLev2, idLev3);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/updateDefect", async (req, res) => {
        const { idDefect, title, description, priority, variance, create_qn, blocking, notificationType, coding, replaceInAssembly, defectNote, responsible } = req.body;
        try {
            const result = await postgresdbService.updateZDefect(idDefect, title, description, priority, variance, create_qn, blocking, notificationType, coding, replaceInAssembly, defectNote, responsible);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    })

    app.post("/db/selectZDefect", async (req, res) => {
        const { listDefect, plant } = req.body;
        try {
            const result = await postgresdbService.selectZDefect(listDefect, plant);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });
    
    app.post("/db/selectDefectToApprove", async (req, res) => {
        const { plant } = req.body;
        try {   
            const result = await postgresdbService.selectDefectToApprove(plant);   
            for (var i = 0; i < result.length; i++) {
                var element = result[i];
                var customData = await postgresdbService.getOrderCustomDataDefect(element.sfc, plant);
                if (customData.data.value && customData.data.value.length > 0) {
                    if (customData.data.value.filter(item => item.DATA_FIELD === "ORDER_TYPE").length > 0) {
                        element.orderType = customData.data.value.filter(item => item.DATA_FIELD === "ORDER_TYPE")[0].DATA_FIELD_VALUE;
                    } else {
                        element.orderType = null; // Se non esiste ORDER_TYPE, setto orderType a null
                    }
                    if (customData.data.value.filter(item => item.DATA_FIELD === "PURCHASE_ORDER").length > 0) {
                        element.purchaseOrder = customData.data.value.filter(item => item.DATA_FIELD === "PURCHASE_ORDER")[0].DATA_FIELD_VALUE;
                    } else {
                        element.purchaseOrder = null; // Se non esiste PURCHASE_ORDER, setto purchaseOrder a null
                    }
                } else {
                    element.orderType = null;
                    element.purchaseOrder = null;   
                }
                if (element.orderType === "GRPF") {
                    element.mes_order = element.purchaseOrder; // Se orderType è GRPF, uso purchaseOrder come mes_order
                    element.typeOrder = "Purchasing Doc.";
                }else{
                    element.typeOrder = "Prod. Order"; // Se orderType non è GRPF, setto type a "Production Order"
                }
                result[i] = element; // Aggiorno l'elemento con i nuovi campi
            }
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/cancelDefectQN", async (req, res) => {
        const { defectId, userId } = req.body;
        try {
            const result = await postgresdbService.cancelDefectQN(defectId, userId);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/approveDefectQN", async (req, res) => {
        const { dataForSap, defectId, userId, plant } = req.body;
        try {
            const result = await postgresdbService.sendApproveDefectQN(dataForSap, defectId, userId, plant);
            if (result.OUTPUT.esito == "OK")
                res.status(200).json(result);
            else
                res.status(400).json({error: result.OUTPUT.message || result.OUTPUT.error || "Error while approving defect"});
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });

    app.post("/db/selectDefectForReport", async (req, res) => {
        const { plant, wbe, sfc, order, qnCode, priority, startDate, endDate, status } = req.body;
        try {
            // Creo la query dinamina in base ai parametri ricevuti
            let query = "SELECT distinct z_defects.*, z_coding.coding, z_coding.coding_group, z_coding.coding_description, z_coding.coding_group_description, z_priority.description as priority_description, "
                        + "z_notification_type.description as notification_type_description, "
                        + "COALESCE(z_responsible.org_level_4, COALESCE(z_responsible.org_level_3, COALESCE(z_responsible.org_level_2, COALESCE(z_responsible.org_level_1, '')))) as responsible_description "
                        + "FROM z_defects "
                        + "left join z_coding on z_defects.coding_id = z_coding.id " 
                        + "left join z_priority on z_defects.priority = z_priority.priority "
                        + "left join z_notification_type on z_defects.notification_type = z_notification_type.notification_type "
                        + "left join z_responsible on z_defects.responsible = z_responsible.id "
                        + "WHERE z_defects.plant = '" + plant + "'";
            if (wbe) {
                query += ` AND z_defects.wbe = '${wbe}'`;
            }
            if (sfc) {
                query += ` AND z_defects.sfc = '${sfc}'`;
            }
            if (qnCode) {
                query += ` AND z_defects.qn_code = '${qnCode}'`;
            }
            if (priority) {
                query += ` AND z_priority.description = '${priority}'`;
            }
            if (startDate) {
                query += ` AND z_defects.creation_date >= (SELECT '${startDate}' AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome' AS utc_time)`;
            }
            if (endDate) {
                query += ` AND z_defects.creation_date <= (SELECT '${endDate}' AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome' AS utc_time)`;
            }
            if (status) {
                query += ` AND z_defects.status = '${status}'`;
            }

            query += " ORDER BY z_defects.creation_date DESC";
            const result = await postgresdbService.selectDefectForReport(query);

            for (var i = 0; i < result.length; i++) {
                var element = result[i];
                var customData = await postgresdbService.getOrderCustomDataDefect(element.sfc, plant);
                if (customData.data.value && customData.data.value.length > 0) {
                    if (customData.data.value.filter(item => item.DATA_FIELD === "ORDER_TYPE").length > 0) {
                        element.orderType = customData.data.value.filter(item => item.DATA_FIELD === "ORDER_TYPE")[0].DATA_FIELD_VALUE;
                    } else {
                        element.orderType = null; // Se non esiste ORDER_TYPE, setto orderType a null
                    }
                    if (customData.data.value.filter(item => item.DATA_FIELD === "PURCHASE_ORDER").length > 0) {
                        element.purchaseOrder = customData.data.value.filter(item => item.DATA_FIELD === "PURCHASE_ORDER")[0].DATA_FIELD_VALUE;
                    } else {
                        element.purchaseOrder = null; // Se non esiste PURCHASE_ORDER, setto purchaseOrder a null
                    }
                } else {
                    element.orderType = null;
                    element.purchaseOrder = null;   
                }
                if (element.orderType === "GRPF") {
                    element.mes_order = element.purchaseOrder; // Se orderType è GRPF, uso purchaseOrder come mes_order
                    element.typeOrder = "Purchasing Doc.";
                }else{
                    element.typeOrder = "Prod. Order"; // Se orderType non è GRPF, setto type a "Production Order"
                }
                result[i] = element; // Aggiorno l'elemento con i nuovi campi
            }

            if (!order) {
                // Se non è stato specificato un order, ritorno tutti i risultati
                return res.status(200).json(result);
            }else{
                // Se è stato specificato un order, filtro i risultati
                var finalResult = result.filter(item => {
                    return item.mes_order === order;
                });
                return res.status(200).json(finalResult);
            }

        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });
    
    app.post("/db/getDefectsWBE", async (req, res) => {
        const { plant } = req.body;
        try {
            const result = await postgresdbService.getDefectsWBE(plant);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    });
    
    app.post("/db/getCauses", async (req, res) => {
        const { plant } = req.body;
        try {
            const result = await postgresdbService.getCauses(plant);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing parsing: "+error);
            res.status(500).json({ error: "Error while executing parsing" });
        }
    });

    app.post("/db/getFiltersDefectsTI", async (req, res) => {
        const { } = req.body;
        try {
            const result = await postgresdbService.getFiltersDefectsTI();
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }); 

    app.post("/db/getDefectsTI", async (req, res) => {
        const { plant, project } = req.body;
        try {
            const result = await postgresdbService.getDefectsTI(plant, project);
            res.status(200).json(result);
        } catch (error) {
            console.log("Error executing query: "+error);
            res.status(500).json({ error: "Error while executing query" });
        }
    }); 

}