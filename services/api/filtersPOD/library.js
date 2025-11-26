const { dispatch } = require("../../mdo/library");
const { callGet } = require("../../../utility/CommonCallApi");
const { getAllMaterialsNoParentAssembly } = require("../../postgres-db/services/orders_link/library");
const credentials = JSON.parse(process.env.CREDENTIALS);
const hostname = credentials.DM_API_URL;

async function getFilterPOD(plant, userId) {
  try {
    const requests = [
      { key: "WBS", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'WBE' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
      { key: "Project", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'COMMESSA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
      { key: "ParentMaterial", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'MATERIALE PADRE' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" },
      { key: "MachineSection", path: "/mdo/ORDER_CUSTOM_DATA", query: { $apply: "filter(DATA_FIELD eq 'SEZIONE MACCHINA' and PLANT eq '"+plant+"')/groupby((DATA_FIELD_VALUE))"}, method: "GET" }
    ];

    // PROMISE ALL PARALLELO (MDO + MATERIALI + WC)
    const responses = await Promise.all([
        //MDO
      ...requests.map(async (request) => {
        const mockReq = { path: request.path, query: request.query, method: request.method };
        try {
          const result = await dispatch(mockReq);
          return { key: request.key, result };
        } catch (error) {
          return { key: request.key, result: { error: true, message: error.message, code: error.code || 500 } };
        }
      }),

      // Materials DAL DB 
      (async () => {
        try {
          const materialResponse = await getAllMaterialsNoParentAssembly(plant);
          const materials = materialResponse.map(m => ({ MATERIAL: m.child_material })) || [];
          return { key: "Materials", result: materials };
        } catch (error) {
          return { key: "Materials", result: { error: true, message: error.message || "", code: error.code || 500 } };
        }
      })()

    ]);

    const consolidatedData = responses.reduce((acc, { key, result }) => {
      if (result.error) {
        acc[key] = { error: true, message: result.message, code: result.code };
      } else {
        acc[key] = Array.isArray(result) ? result : result.data?.value || [];
      }
      return acc;
    }, {});

    // WC
    const userUrl = hostname + "/user/v1/users?plant=" + plant + "&userId=" + userId;
    const responseGetUser = await callGet(userUrl);
    const workCenters = (responseGetUser?.workCenters || []).sort((a, b) => a.description.localeCompare(b.description));
    consolidatedData.WorkCenters = workCenters;

    return consolidatedData;

  } catch (e) {
    console.error("Errore in getFilterPOD:", e);
    throw new Error("Errore in getFilterPOD:" + e);
  }
}


// Esporta la funzione
module.exports = { getFilterPOD };