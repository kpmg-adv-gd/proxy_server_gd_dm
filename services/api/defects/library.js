const { callPatch } = require("../../../utility/CommonCallApi");
const { dispatch } = require("../../mdo/library");
const { getDefectsTesting } = require("../../postgres-db/services/defect/library");
const { callGet } = require("../../../utility/CommonCallApi");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function updateCustomDefectOrder(plant,order,value){
    let url = hostname + "/order/v1/orders/customValues";
    let customValue={
        "attribute":"DEFECTS",
        "value": value
    };
    let body={
        "plant":plant,
        "order":order,
        "customValues": [customValue]
    };
    let response = await callPatch(url,body);
}

async function getDefectsTestingData(plant, project) {
    try {
        // Step 1: Recupero MFG_ORDER dalla tabella ORDER_CUSTOM_DATA con COMMESSA = project
        const orderFilter = `(DATA_FIELD eq 'COMMESSA' and DATA_FIELD_VALUE eq '${project}' and IS_DELETED eq 'false')`;
        const mockReqOrder = {
            path: "/mdo/ORDER_CUSTOM_DATA",
            query: { $apply: `filter(${orderFilter})` },
            method: "GET"
        };
        const orderResult = await dispatch(mockReqOrder);
        const orders = (orderResult?.data?.value && orderResult.data.value.length > 0) 
            ? orderResult.data.value.map(item => item.MFG_ORDER) 
            : [];

        if (orders.length === 0) {
            return [];
        }

        // Step 2: Recupero difetti da z_defects con status='OPEN'
        const defects = await getDefectsTesting(orders);

        if (defects.length === 0) {
            return [];
        }

        // Step 3: Recupero descrizioni per NC_CODE e NC_GROUP tramite API
        const processedDefects = [];
        
        for (const defect of defects) {
            // Recupero descrizione NC_CODE
            let codeDescription = "";
            if (defect.code) {
                try {
                    const codeUrl = `${hostname}/nonconformancecode/v1/nonconformancecodes?plant=${plant}&code=${defect.code}`;
                    const codeResponse = await callGet(codeUrl);
                    if (codeResponse && codeResponse.length > 0) {
                        codeDescription = codeResponse[0].description || "";
                    }
                } catch (error) {
                    console.log(`Error fetching NC code description for ${defect.code}: ${error.message}`);
                }
            }

            // Recupero descrizione NC_GROUP
            let groupDescription = "";
            if (defect.group) {
                try {
                    const groupUrl = `${hostname}/nonconformancegroup/v1/nonconformancegroups?plant=${plant}&group=${defect.group}`;
                    const groupResponse = await callGet(groupUrl);
                    if (groupResponse && groupResponse.length > 0) {
                        groupDescription = groupResponse[0].description || "";
                    }
                } catch (error) {
                    console.log(`Error fetching NC group description for ${defect.group}: ${error.message}`);
                }
            }

            processedDefects.push({
                ...defect,
                codeDescription: codeDescription,
                groupDescription: groupDescription
            });
        }

        // Step 4: Creo tree table raggruppata per nc_group
        const treeTable = [];
        
        for (const defect of processedDefects) {
            // Elemento figlio (dettaglio NC_CODE) - livello 2
            const child = {
                level: 2,
                nc_code_or_group: defect.code,
                nc_description: defect.codeDescription,
                wbs_element: defect.wbe || "",
                material: defect.material || "",
                priority: defect.priority || "",
                user: defect.user || "",
                department: "", // campo non presente in z_defects
                status: defect.status || "",
                qn: defect.qn_code || "",
                owner: defect.owner || "", // nuova colonna
                due_date: defect.due_date || "", // nuova colonna
                id: defect.id,
                sfc: defect.sfc || ""
            };

            // Cerco se esiste già il gruppo parent
            const existingGroup = treeTable.find(item => item.nc_code_or_group === defect.group);
            
            if (!existingGroup) {
                // Creo nuovo gruppo parent - livello 1
                treeTable.push({
                    level: 1,
                    nc_code_or_group: defect.group,
                    nc_description: defect.groupDescription,
                    children: [child]
                });
            } else {
                // Aggiungo al gruppo esistente
                existingGroup.children.push(child);
            }
        }

        return treeTable;

    } catch (error) {
        console.error("Error in getDefectsTestingData:", error);
        return false;
    }
}

module.exports = { updateCustomDefectOrder, getDefectsTestingData };