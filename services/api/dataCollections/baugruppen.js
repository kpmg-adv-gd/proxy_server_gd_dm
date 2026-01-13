sap.ui.define([
  'jquery.sap.global',
  'sap/ui/model/Filter',
  'sap/ui/model/json/JSONModel',
  'sap/m/MessageToast',
  'sap/m/MessageBox',
  'podCommon/utils/ModelManager',
  'sap/ui/core/mvc/Controller',
  "commonCore/utility/CommonCallManager",
  "podCommon/controller/ChkContainerDialog",
  "../controller/BaseController",
  "podCommon/controller/PopupSFCDialog",
], function (jQuery, Filter, JSONModel, MessageToast, MessageBox, ModelManager, Controller, CommonCallManager, ChkContainerDialog, BaseController, PopupSFCDialog) {
  "use strict";
  var oContext;
  var BaugruppenController = BaseController.extend("podCommon.controller.Baugruppen", {
    baugruppenModel: new JSONModel([]),
    ChkContainerDialog: undefined,
    PopupSFCDialog: undefined,
    oEventInput: undefined,
    aInputFocus: [],
    aInputPreFocus: [],
    sLastBauId: "",
    sLastPreId: "",
    firstTabLoading: true,
    autoInsertPreassembly: false,

    onInit: function () {
      oContext = this;
      oContext.ChkContainerDialog = new ChkContainerDialog();
      oContext.PopupSFCDialog = new PopupSFCDialog();
      this.getView().setModel(this.baugruppenModel, "baugruppen");

      sap.ui.getCore().getEventBus().subscribe("baugruppen", "getBaugruppen", this.getBaugruppen, this);
      sap.ui.getCore().getEventBus().subscribe("baugruppen", "enterPropostaMotore", this.enterPropostaMotore, this);
    },

    onAfterRendering: function () {

      if (oContext.getInfoModel().getProperty("/tabSelectedKey") !== "BG") {
        oContext.getInfoModel().setProperty("/tabSelectedKey", "BG");
        sap.ui.getCore().getEventBus().publish("baugruppen", "manageColumn", oContext);

        if (oContext.getInfoModel().getProperty("/type") === "M") {
          oContext.getView().byId("ColumnSFCBaugruppen").setVisible(false);
          oContext.getView().byId("ColumnSFCPreassembly").setVisible(false);
          oContext.getView().byId("ColumnSFCPreassemblyAutomatic").setVisible(false);
        }

        if (ModelManager.tabKeys.justActivated === ModelManager.tabKeys.BAU) {
          return;
        }
        //if (oContext.getInfoModel().getProperty("/type") === "S") {
        oContext.sLastBauId = "";
        oContext.sLastPreId = "";
        this.firstTabLoading = true;
        //}
        this.checkAutomatici();
      }

      //Commentato per 311 - Premontaggi SDL \ TAB seriali- TTAMSO-1187
      //oContext.getViewModel().setProperty("/preassemblyVisible", oContext.getInfoModel().getProperty("/type") !== "S");

    },

    checkAutomatici: function () {
      var that = this;

      var trx = "8800_MES/TRANSACTION/COMPLETE_CARTELLA/COMPLETE/CHECK_CONFIGURATION_AUTO_INSERT_PREASSEMBLY";

      function succFun(rows, messages, xmlMessages) {
        if (rows.length > 0) {
          that.autoInsertPreassembly = true;
        }else{
          that.autoInsertPreassembly = false;
        }
        this.getBaugruppen();
      }

      var failFn = function (erx) {
        that.autoInsertPreassembly = false;
        this.getBaugruppen();
      }
      var params = {
        WC_HANDLE: oContext.getInfoModel().getProperty("/workcenter/handle")
      }

      CommonCallManager.getRows(trx, params, succFun.bind(that), failFn.bind(that), false, {
          preventBusyIndicator: true,
          preventMessageToast: true,
          preventMessageBox: true
      });
    },

    onExpandBaugruppen: function (oEvent) {
      oContext.getView().byId("baugruppenIDTable").setShowNoData(false);
      oContext.getView().byId("baugruppenIDTable").setShowNoData(true);
    },
    onExpandPreassy: function (oEvent) {
      oContext.getView().byId("preassemblyIDTable").setShowNoData(false);
      oContext.getView().byId("preassemblyIDTable").setShowNoData(true);
    },
    onExpandPreassyAutomatic: function (oEvent) {
      oContext.getView().byId("preassemblyAutomaticIDTable").setShowNoData(false);
      oContext.getView().byId("preassemblyAutomaticIDTable").setShowNoData(true);
    },

    updateExandadView: function () {
      if (this.firstTabLoading) {
        try {
          oContext.getViewModel().setProperty("/baugruppenExpanded", oContext.getViewModel().getProperty("/baugruppen").length > 0);
        } catch (e) {
          oContext.getViewModel().setProperty("/baugruppenExpanded", oContext.getView().getModel("baugruppen").getData().length > 0);
        }

        oContext.getViewModel().setProperty("/preassemblyExpanded", oContext.getViewModel().getProperty("/preassemblyManual").length > 0);
        oContext.getViewModel().setProperty("/preassemblyAutomaticExpanded", oContext.getViewModel().getProperty("/preassemblyAutomatic").length > 0);
        this.firstTabLoading = false;
      }
      //Gestione dinamica layout

      if (oContext.getViewModel().getProperty("/preassembly").length == 0) {
        oContext.getView().byId("dcScroll").removeStyleClass("ScrollContainerMaxHEIGTH");
        oContext.getView().byId("dcScroll").addStyleClass("ScrollContainerMaxHEIGTH_ALL");
      }

      oContext.setFocusToFirstInputEmpty();
    },

    getBaugruppen: function () {

      sap.ui.core.BusyIndicator.show();

      var that = this;

      var transactionName = "GetAllBaugruppen";
      var transactionCall = "8800_MES/TRANSACTION/POD_COMMON/MM" + "/" + transactionName;

      var selModel = ModelManager.getModel(ModelManager.NAMES.selPodModel);

      var params = {
        "TRANSACTION": transactionCall,
        "site": window.site,
        "sFrom": oContext.getInfoModel().getProperty("/type"),
        "user_id": oContext.getInfoModel().getProperty("/user/id"),
        "resource_bo": oContext.getInfoModel().getProperty("/workcenter/handleResource"),
        "SFCS_JSON": JSON.stringify(oContext.getInfoModel().getProperty("/sfcs")),
        "wc_handle": oContext.getInfoModel().getProperty("/workcenter/handle"),
        "OutputParameter": "JSON"
      };

      try {
        var req = jQuery.ajax({
          url: "/XMII/Runner",
          data: params,
          method: "POST",
          dataType: "xml",
          async: true
        });
        req.done(jQuery.proxy(that.getBaugruppenSuccess, that));
        req.fail(jQuery.proxy(that.getBaugruppenError, that));
      } catch (err) {
        jQuery.sap.log.debug(err.stack);
      }

    },

    getBaugruppenSuccess: function (data) {

      sap.ui.core.BusyIndicator.hide();
      oContext.clearInputFocus();
      //Commentato per 311 - Premontaggi SDL \ TAB seriali- TTAMSO-1187
      //Gestione baugruppen per selleria
      /*if (oContext.getInfoModel().getProperty("/type") === "S") {
          oContext.getViewModel().setProperty("/type", oContext.getInfoModel().getProperty("/type"));
          oContext.manageBaugruppeForSdl(data);
          return;
      }*/

      var jsonArrStr = jQuery(data).find("Row").text();
      var jsonObj = JSON.parse(jsonArrStr);

      var operations = jsonObj.operations;
      oContext.getViewModel().setProperty("/operationBaugruppen", operations);




      var tmpArr = [];

      var aBaugruppen = [],
        aPreassemblyContainer = [],
        aTablePreAssemblyContainer = [],
        aTableBaugruppen = [];
      aPreassemblyContainer = operations.filter(function (a) {
        return a.baugruppen.filter(function (b) {
          return b.data_type == "SFC";
        }).length > 0;
      });
      aBaugruppen = operations.filter(function (a) {
        return a.baugruppen.filter(function (b) {
          return b.data_type !== "SFC";
        }).length > 0;
      });


      // Pulizia dei container per spegnere funzionalità di "unione" dei Preassembly
      aPreassemblyContainer.forEach(item => {
        item.baugruppen.forEach(preass => {
            preass.container = "";
            preass.container_description = "";
            preass.container_key = "";
        });
      });

      var aBaugruppenCleanly = [],
        aPreassemblyContainerCleanly = [];

      aPreassemblyContainer.forEach(function (oItem) {
        var oItemNoBinding = JSON.parse(JSON.stringify(oItem));
        var aBau = [],
          op_handle = oItem.handle;
        oItemNoBinding.baugruppen.forEach(function (oBau) {
          if (oBau.data_type == "SFC") {
            aBau.push(oBau);
          }
        });
        if (aBau.length > 0) {
          var aBau2 = [],
            aBauContainerDescription = [];
          aBau.forEach(function (oBau) {
            var oItemNoBinding2 = JSON.parse(JSON.stringify(oBau));
            //controllo se non appartiene a nessun container
            if (oBau.container === "") {
              oItemNoBinding2.baugruppen = [oBau];
              oItemNoBinding2["handle"] = op_handle;
              aPreassemblyContainerCleanly.push(oItemNoBinding2);
            } else {
              if (aBauContainerDescription.length === 0) {
                aBauContainerDescription.push(oBau.container_key);
              } else {
                if (!aBauContainerDescription.includes(oBau.container_key)) {
                  aBauContainerDescription.push(oBau.container_key);
                }
              }
              aBau2.push(oBau);
            }

          });

          if (aBau2.length > 0) {
            if (aBauContainerDescription.length === 1) {
              oItemNoBinding.baugruppen = aBau2;
              oItemNoBinding["handle"] = op_handle;
              aPreassemblyContainerCleanly.push(oItemNoBinding);
            } else {
              //mi trovo in un multi-container
              aBauContainerDescription.forEach(function (oContainer) {
                var aBauContainer = aBau2.filter(a => a.container_key == oContainer);
                var aBauContainerNoBinding = JSON.parse(JSON.stringify(oItemNoBinding));
                aBauContainerNoBinding.baugruppen = aBauContainer;
                aBauContainerNoBinding["handle"] = op_handle;
                aPreassemblyContainerCleanly.push(aBauContainerNoBinding);
              });

            }

          }

        }

      });

      aBaugruppen.forEach(function (oItem) {
        var oItemNoBinding = JSON.parse(JSON.stringify(oItem));
        var aBau = [];
        oItemNoBinding.baugruppen.forEach(function (oBau) {
          if (oBau.data_type !== "SFC") {
            aBau.push(oBau);
          }
        });
        if (aBau.length > 0) {
          aBau.forEach(function (oBau) {
            var oItemNoBinding2 = JSON.parse(JSON.stringify(oItemNoBinding));
            oItemNoBinding2.baugruppen = [oBau];
            aBaugruppenCleanly.push(oItemNoBinding2);
          });

        }

      });

      aPreassemblyContainer = aPreassemblyContainerCleanly;
      aBaugruppen = aBaugruppenCleanly;

      ////////////////////////////////////
      // FINE
      ////////////////////////////////////


      //////////////////////////////////////////////////////////////////////////
      //baugruppen
      aBaugruppen.forEach(function (oItem) {
        var oRow = oItem.baugruppen[0];
        oRow.op_handle = oItem.handle;
        oRow.comments = oRow.value;
        oRow.justSaved = false;
        oRow.editable = oRow.isCertified === "1" && oRow.value === "";
        //Visibilità per mm
        oRow.isNotSdl = true;

        aTableBaugruppen.push(oRow);
      });
      this.baugruppenModel.setProperty("/", aTableBaugruppen);

      //logica per hide colonna bau create
      var tempDoCreate = aTableBaugruppen.filter(function (b) {
        return b.doCreate == true;
      });
      var bauCreateVisibility = tempDoCreate.length > 0 ? true : false;

      oContext.getViewModel().setProperty("/bauCreateVisibility", bauCreateVisibility);

      //aggiungo input quanto è il valore assy_qty
      var oBaugruppenTab = oContext.getView().byId("baugruppenIDTable");
      var iBauIndex = 0;
      oBaugruppenTab.getAggregation("items").forEach(function (oBau) {
        iBauIndex += 1;
        var sPath = oBau.getBindingContextPath();
        var oModel = oBau.getBindingContext("baugruppen").getProperty(sPath);
        if (oModel.assy_qty > 0) {
          oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 2].getAggregation("items")[0].destroyItems();
          for (var i = 0; i < oModel.assy_qty; i++) {
            var sValue = "",
              bEditable = true;
            if (oModel.value.length > 0) {
              var aValues = oModel.value.split(",");
              if (aValues !== undefined && aValues[i] !== undefined) {
                sValue = aValues[i];
              }
            }

            if (!oModel.editable) {
              bEditable = !(sValue.length > 0);
            }
            if (oModel.doCreate == 1) {
              bEditable = false;
            }

            let oOldInput = sap.ui.getCore().byId("bau_" + iBauIndex + "_" + i);
            if (oOldInput) {
              oOldInput.destroy();
            }
            oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 2].getAggregation("items")[0].addItem(new sap.m.Input({
              id: "bau_" + iBauIndex + "_" + i,
              value: sValue,
              class: "kpmgInput",
              enabled: bEditable,
              change: oContext.checksaveBaugruppen
            }));
            if (oModel.doCreate != 1) {
              if (sValue == "" || sValue == undefined) {
                oContext.insertInputFocus("bau_" + iBauIndex + "_" + i, false);
              }
            }

          }

        }
      });

      //////////////////////////////////////////////////////////////////////////
      //preassembly/container
      var aInnerTable = [];
      aPreassemblyContainer.forEach(function (oItem) {
        var _aInnerTable = [];
        oItem.baugruppen.forEach(function (oBaugruppen) {
          var sContainer = oBaugruppen.container,
            sKey = oBaugruppen.container_key;
          if (!!sContainer) {

            _aInnerTable = aPreassemblyContainer.filter(function (a) {
              return a.baugruppen.filter(function (b) {
                return b.container == sContainer && b.container_key == sKey
              }).length > 0
            });
          }
        });
        if (_aInnerTable.length > 0) {
          aInnerTable.push(_aInnerTable[0]);
        }

      });
      if (aInnerTable.length > 0) {
        aInnerTable.forEach(function (oInnerTable) {
          var oRow = oInnerTable.baugruppen[0];
          if (aTablePreAssemblyContainer.filter(a => a.container_key === oRow.container_key).length == 0) {
            oRow.op_handle = oInnerTable.handle;
            oRow.comments = oRow.value;
            oRow.justSaved = false;
            oRow.editable = oRow.isCertified === "1" && oRow.value === "";
            var aDescription = [];
            var sPreSparato = "";
            //TODO: un item_description può ssere raggruppato da più operazioni o ci potrebbero essere più bau all'interno di un'unica operazione.

            var aContainerDescription = aPreassemblyContainer.filter(a => a.baugruppen.filter(b => b.container_key === oRow.container_key).length > 0);
            aContainerDescription.forEach(function (oOutBau) {
              oOutBau.baugruppen.forEach(function (oBau) {
                if (oBau.value !== undefined && oBau.value.length > 0) {
                  sPreSparato = oBau.value;
                }
                aDescription.push({
                  key: oBau.item,
                  text: oBau.item_description
                });
              });
            });
            /*oInnerTable.baugruppen.forEach(function (oBau) {
                if (oBau.value !== undefined && oBau.value.length > 0) {
                    sPreSparato = oBau.value;
                }
                aDescription.push({ key: oBau.item, text: oBau.item_description });
            });*/

            if (sPreSparato !== undefined && sPreSparato !== "") {
              oRow.comments = oRow.container_inserted_key == undefined || oRow.container_inserted_key == "" ? oRow.container_description : oRow.container_inserted_key;
              oRow.editable = false;
            }
            oRow.itemDescriptionList = aDescription;

            //Rimuovo la visiblità del container per selleria
            oRow.isNotSdl = true;

            aTablePreAssemblyContainer.push(oRow);
          }
        });

      }
      var aOtherPreassembleContainer = aPreassemblyContainer.filter(function (a) {
        return !aInnerTable.includes(a);
      });
      aOtherPreassembleContainer.forEach(function (oItem) {
        var oRow = oItem.baugruppen[0];
        if (oRow.container_key === "") {
          oRow.op_handle = oItem.handle;
          oRow.comments = oRow.value;
          oRow.justSaved = false;
          oRow.editable = oRow.isCertified === "1" && oRow.value === "";

          aTablePreAssemblyContainer.push(oRow);
        } else if (aTablePreAssemblyContainer.filter(a => a.container_key === oRow.container_key).length == 0) {
          oRow.op_handle = oItem.handle;
          oRow.comments = oRow.value;
          oRow.justSaved = false;
          oRow.editable = oRow.isCertified === "1" && oRow.value === "";

          aTablePreAssemblyContainer.push(oRow);
        }
      });

      oContext.getViewModel().setProperty("/preassembly", aTablePreAssemblyContainer);
      oContext.getViewModel().setProperty("/preassemblyManual", aTablePreAssemblyContainer.filter(item => !oContext.autoInsertPreassembly || item.automatic == ""));
      oContext.getViewModel().setProperty("/preassemblyAutomatic", aTablePreAssemblyContainer.filter(item => oContext.autoInsertPreassembly && item.automatic == "X"));

      var oPreassemblyTab = oContext.getView().byId("preassemblyIDTable");
      var oPreassemblyTabAutomatic = oContext.getView().byId("preassemblyAutomaticIDTable");
      var iBauIndex = 0;
      oPreassemblyTab.getAggregation("items").forEach(function (oBau) {
        iBauIndex += Math.floor(Math.random() * 1000) + 10;

        var sPath = oBau.getBindingContextPath();
        var oModel = oBau.getBindingContext().getProperty(sPath);
        if (oModel.assy_qty > 0) {
          oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].destroyItems();
          for (var i = 0; i < oModel.assy_qty; i++) {
            oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].addItem(new sap.m.Input({
              id: "pre_" + iBauIndex + "_" + i,
              value: "{comments}",
              class: "kpmgInput",
              enabled: "{editable}",
              change: oContext.checksaveBaugruppen
            }));
            if (oModel.comments == "" || oModel.comments == undefined) {
              oContext.insertInputFocus("pre_" + iBauIndex + "_" + i, true);
            }
          }

        }
      });
      oPreassemblyTabAutomatic.getAggregation("items").forEach(function (oBau) {
        iBauIndex += Math.floor(Math.random() * 1000) + 10;

        var sPath = oBau.getBindingContextPath();
        var oModel = oBau.getBindingContext().getProperty(sPath);
        if (oModel.assy_qty > 0) {
          oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].destroyItems();
          for (var i = 0; i < oModel.assy_qty; i++) {
            oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].addItem(new sap.m.Input({
              id: "pre_" + iBauIndex + "_" + i,
              value: "{comments}",
              class: "kpmgInput",
              enabled: "{editable}",
              change: oContext.checksaveBaugruppen
            }));
            if (oModel.comments == "" || oModel.comments == undefined) {
              oContext.insertInputFocus("pre_" + iBauIndex + "_" + i, true);
            }
          }

        }
      });

      oContext.updateExandadView();
    },
    getBaugruppenError: function () {
      sap.ui.core.BusyIndicator.hide();
    },
    insertInputFocus: function (sName, bPre) {
      if (!bPre) {
        if (!oContext.aInputFocus.includes(sName)) {
          oContext.aInputFocus.push(sName);
        }
      } else {
        if (!oContext.aInputPreFocus.includes(sName)) {
          oContext.aInputPreFocus.push(sName);
        }
      }
    },
    clearInputFocus: function () {
      oContext.aInputFocus = [];
      oContext.aInputPreFocus = [];
      // oContext.sLastBauId =  "";
      // oContext.sLastPreId = "";
    },
    getNextFocus: function (sPrecId) {
      if (oContext.aInputFocus.includes(sPrecId)) {
        var iNextIndex = oContext.aInputFocus.findIndex(a => a == sPrecId) + 1;
        if (oContext.aInputFocus.length > 0) {
          if (iNextIndex < oContext.aInputFocus.length) {
            oContext.sLastBauId = oContext.aInputFocus[iNextIndex];
            oContext.sLastPreId = "";
          } else {
            oContext.sLastBauId = oContext.aInputFocus[0];
            oContext.sLastPreId = "";
          }
        }

      } else {
        var iNextIndex = oContext.aInputPreFocus.findIndex(a => a == sPrecId) + 1;
        if (oContext.aInputPreFocus.length > 0) {
          if (iNextIndex < oContext.aInputPreFocus.length) {
            oContext.sLastBauId = "";
            oContext.sLastPreId = oContext.aInputPreFocus[iNextIndex];
          } else {
            oContext.sLastBauId = "";
            oContext.sLastPreId = oContext.aInputPreFocus[0];
          }
        }

      }
    },
    setFocusToFirstInputEmpty: function () {
      if (oContext.sLastBauId == "" && oContext.sLastPreId == "") {
        if (oContext.aInputFocus.length > 0) {
          setTimeout(function () {
            if (sap.ui.getCore().byId(oContext.aInputFocus[0]) !== undefined && sap.ui.getCore().byId(oContext.aInputFocus[0]).focus !== undefined) {
              sap.ui.getCore().byId(oContext.aInputFocus[0]).focus();
            }

          }, 1000);
        } else if (oContext.aInputPreFocus.length > 0) {
          setTimeout(function () {
            if (sap.ui.getCore().byId(oContext.aInputPreFocus[0]) !== undefined && sap.ui.getCore().byId(oContext.aInputPreFocus[0]).focus !== undefined) {
              sap.ui.getCore().byId(oContext.aInputPreFocus[0]).focus();
            }
          }, 1000);
        }
      } else {
        if (oContext.sLastBauId == "") {
          setTimeout(function () {
            sap.ui.getCore().byId(oContext.sLastPreId).focus();
          }, 1000);
        } else {
          setTimeout(function () {
            sap.ui.getCore().byId(oContext.sLastBauId).focus();
          }, 1000);
        }
      }

    },
    manageBaugruppeForSdl: function (data) {
      var jsonArrStr = jQuery(data).find("Row").text();
      var jsonObj = JSON.parse(jsonArrStr);

      var operations = jsonObj.operations;
      oContext.getViewModel().setProperty("/operationBaugruppen", operations);

      var tmpArr = [];

      var aBaugruppen = [],
        aPreassemblyContainer = [],
        aTablePreAssemblyContainer = [],
        aTableBaugruppen = [];
      aPreassemblyContainer = operations.filter(function (a) {
        return a.baugruppen.filter(function (b) {
          return b.data_type == "SFC";
        }).length > 0;
      });
      aBaugruppen = operations.filter(function (a) {
        return a.baugruppen.filter(function (b) {
          return b.data_type !== "SFC";
        }).length > 0;
      });

      //////////////////////////////////////////////////////////////////////////
      //baugruppen
      aBaugruppen.forEach(function (oItem) {

        oItem.baugruppen.forEach(oRow => {
          oRow.op_handle = oItem.handle;
          oRow.comments = oRow.value;
          oRow.justSaved = false;
          oRow.editable = oRow.isCertified === "1" && oRow.value === "";
          //Rimuovo la visiblità del container per selleria
          oRow.isNotSdl = false;

          aTableBaugruppen.push(oRow);
        });


      });
      this.baugruppenModel.setProperty("/", aTableBaugruppen);

      //aggiungo input quanto è il valore assy_qty
      var oBaugruppenTab = oContext.getView().byId("baugruppenIDTable");
      var iBauIndex = 0;
      oBaugruppenTab.getAggregation("items").forEach(function (oBau) {
        iBauIndex += 1;
        var sPath = oBau.getBindingContextPath();
        var oModel = oBau.getBindingContext("baugruppen").getProperty(sPath);
        if (oModel.assy_qty > 0) {
          oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 2].getAggregation("items")[0].destroyItems();
          for (var i = 0; i < oModel.assy_qty; i++) {
            var sValue = "",
              bEditable = true;
            if (oModel.value.length > 0) {
              var aValues = oModel.value.split(",");
              if (aValues !== undefined && aValues[i] !== undefined) {
                sValue = aValues[i];
              }
            }

            if (!oModel.editable) {
              bEditable = !(sValue.length > 0) && oModel.doCreate !== "1";
            }
            if (oModel.doCreate === "1") {
              bEditable = false;
            }
            var bCreated = false;
            var iIndex = 0,
              sIdText = "assy_" + iBauIndex + "_",
              iDupIndex = 0;
            while (!bCreated) {
              if (!oContext.aInputFocus.includes(sIdText + iIndex.toString())) {
                sIdText = sIdText + iIndex.toString();
                if (sValue == undefined || sValue == "") {
                  if (oModel.doCreate !== "1") {
                    oContext.insertInputFocus(sIdText, false);
                  }

                }
                bCreated = true;
              } else if (!oContext.aInputFocus.includes(sIdText + iIndex.toString() + "_" + iDupIndex.toString())) {
                sIdText = sIdText + iIndex.toString() + "_" + iDupIndex.toString();
                if (sValue == undefined || sValue == "") {
                  if (oModel.doCreate !== "1") {
                    oContext.insertInputFocus(sIdText, false);
                  }
                }
                bCreated = true;
              }
            }
            oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 2].getAggregation("items")[0].addItem(new sap.m.Input({
              id: sIdText,
              value: sValue,
              class: "kpmgInput",
              enabled: bEditable,
              change: oContext.checksaveBaugruppen
            }));
          }

        }
      });
      //logica per hide colonna bau create
      var tempDoCreate = aTableBaugruppen.filter(function (b) {
        return b.doCreate == true;
      });
      var bauCreateVisibility = tempDoCreate.length > 0 ? true : false;
      oContext.getViewModel().setProperty("/bauCreateVisibility", bauCreateVisibility);
      //////////////////////////////////////////////////////////////////////////
      //preassembly/container
      var aInnerTable = [];
      aPreassemblyContainer.forEach(function (oItem) {
        //Rimuovo la visiblità del container per selleria
        oItem.isNotSdl = false;
        oItem.baugruppen.forEach(function (oBaugruppen) {
          var sContainer = oBaugruppen.container;
          if (!!sContainer) {

            aInnerTable = aPreassemblyContainer.filter(function (a) {
              return a.baugruppen.filter(function (b) {
                return b.container == sContainer
              }).length > 0
            });
          }
        });
      });
      aInnerTable.forEach(row => {

        row.baugruppen.forEach(function (oBau) {
          var sPreSparato = "";
          var oRow = oBau;

          oRow.op_handle = row.handle;
          oRow.comments = oRow.value;
          oRow.justSaved = false;
          oRow.editable = oRow.isCertified === "1" && oRow.value === "";
          //Rimuovo la visiblità del container per selleria
          oRow.isNotSdl = true;

          if (oBau.value !== undefined && oBau.value.length > 0) {
            sPreSparato = oBau.value;
          }

          /*if (sPreSparato !== undefined && sPreSparato !== "") {
              oRow.comments = oRow.container_description;
              oRow.editable = false;
          }*/
          oRow.itemDescriptionList = [];

          aTablePreAssemblyContainer.push(oRow);
        });
      });

      oContext.getViewModel().setProperty("/preassembly", aTablePreAssemblyContainer);
      oContext.getViewModel().setProperty("/preassemblyManual", aTablePreAssemblyContainer.filter(item => !oContext.autoInsertPreassembly || item.automatic == ""));
      oContext.getViewModel().setProperty("/preassemblyAutomatic", aTablePreAssemblyContainer.filter(item => oContext.autoInsertPreassembly && item.automatic == "X"));

      var oPreassemblyTab = oContext.getView().byId("preassemblyIDTable");
      var oPreassemblyTabAutomatic = oContext.getView().byId("preassemblyAutomaticIDTable");
      var iBauIndex = 0;
      oPreassemblyTab.getAggregation("items").forEach(function (oBau) {
        iBauIndex += 1;

        var sPath = oBau.getBindingContextPath();
        var oModel = oBau.getBindingContext().getProperty(sPath);
        if (oModel.assy_qty > 0) {
          oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].destroyItems();
          for (var i = 0; i < oModel.assy_qty; i++) {
            var sIdText = "assy_qty_" + iBauIndex + "_" + i;
            if (oModel.comments == undefined || oModel.comments == "") {
              oContext.insertInputFocus(sIdText, true);
            }
            oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].addItem(new sap.m.Input({
              id: sIdText,
              value: "{comments}",
              class: "kpmgInput",
              enabled: "{editable}",
              change: oContext.checksaveBaugruppen
            }));
          }

        }
      });
      oPreassemblyTabAutomatic.getAggregation("items").forEach(function (oBau) {
        iBauIndex += 1;

        var sPath = oBau.getBindingContextPath();
        var oModel = oBau.getBindingContext().getProperty(sPath);
        if (oModel.assy_qty > 0) {
          oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].destroyItems();
          for (var i = 0; i < oModel.assy_qty; i++) {
            var sIdText = "assy_qty_" + iBauIndex + "_" + i;
            if (oModel.comments == undefined || oModel.comments == "") {
              oContext.insertInputFocus(sIdText, true);
            }
            oBau.getAggregation("cells")[oBau.getAggregation("cells").length - 1].getAggregation("items")[0].addItem(new sap.m.Input({
              id: sIdText,
              value: "{comments}",
              class: "kpmgInput",
              enabled: "{editable}",
              change: oContext.checksaveBaugruppen
            }));
          }

        }
      });


      oContext.updateExandadView();
    },

    checksaveBaugruppen: function (event) {
      /* */
      oContext.getNextFocus(event.getSource().getId());
      oContext.oEventInput = event.getSource().getId();
      var sPath = event.getSource().getBindingContext("baugruppen") === undefined ? event.getSource().getBindingContext().getPath() : event.getSource().getBindingContext("baugruppen").getPath();
      var oModel = event.getSource().getBindingContext("baugruppen") === undefined ? event.getSource().getBindingContext().getModel().getProperty(sPath) : event.getSource().getBindingContext("baugruppen").getModel().getProperty(sPath);
      if (oModel.comments !== event.getParameter("value")) {
        oModel.comments = event.getParameter("value");
      }
      if (oModel.comments == "" || !oModel.comments) {

      } else {
        //Controllo che sia mm
        if ((oModel.container !== "") && (oContext.getInfoModel().getProperty("/type") === "M")) {
          //container
          oContext.saveContainer(oModel);
        } else {
          if (oModel.data_type === "SFC") {
            //preassemblaggio
            oContext.savePreAssembly(oModel, sPath);
          } else {
            //baugruppen
            oModel["work_center_bo"] = oContext.getInfoModel().getProperty("/workcenter/handle");
            oContext.checkUniqueMask(oModel, sPath, oContext.saveBaugruppen);
          }
        }
      }

    },
    saveContainer: function (oModel) {


      if (oModel !== undefined) {
        var aItemBOAll = oContext.getViewModel().getProperty("/operationBaugruppen").filter(function (a) {
          return a.baugruppen.filter(function (b) {
            return b.container == oModel.container && b.container_description == oModel.container_description;
          }).length > 0;
        });
        var aItemBO = []
        aItemBOAll.forEach(function (oItem) {
          var aBauContainer = [];
          oItem.baugruppen.forEach(function (oBau) {
            if (oBau.container_description === oModel.container_description && oBau.container === oModel.container) {
              aBauContainer.push(oBau);
            }
          });
          var oItemNoBinding = JSON.parse(JSON.stringify(oItem));
          oItemNoBinding.baugruppen = aBauContainer;
          aItemBO.push(oItemNoBinding);
        });

        var sToString = [].concat.apply([], aItemBO.map(function (a) {
          return a.baugruppen.map(function (b) {
            return b.item_handle;
          });
        })).join(" - ");
        var sAdaptToCall = "'" + sToString.replaceAll(" - ", "','") + "'";

         // Save Input Sparato
         oContext.getInfoModel().setProperty("/inputContainer", oModel.comments);
      }

      //Selleria senza container
      if (oContext.getInfoModel().getProperty("/type") === "S") {
        return;
      }
      (new oContext.getCustomBusyDialog()).openBusy("Caricamento", oContext);
      var sTransaction = "8800_MES/TRANSACTION/POD_COMMON/MM/INSERT_CONTAINER",
        oParams = {
          CONTAINER: oModel.comments,
          ITEMS_BO: sAdaptToCall,
          SITE: oContext.getInfoModel().getProperty("/site"),
          SFC: oContext.getInfoModel().getProperty("/vin/VIN"),
          USER: oContext.getView().getModel("infoModel").getProperty("/user").id,
          WORK_CENTER: oContext.getInfoModel().getProperty("/workcenter/name")
        },
        fSuccess = function (param, rows, sMessages) {

          //TODO: Apri popup
          if (rows !== undefined && rows.length > 0 &&
            ((rows[0].FILTRO_1 !== undefined && rows[0].FILTRO_1 !== "") ||
              (rows[0].FILTRO_2 !== undefined && rows[0].FILTRO_2 !== "") ||
              (rows[0].FILTRO_3 !== undefined && rows[0].FILTRO_3 !== ""))) {
            var oFilter1 = undefined,
              oFilter2 = undefined,
              oFilter3 = undefined;
            var oFilter4 = undefined;
            if (rows[0].FILTRO_1 !== undefined && rows[0].FILTRO_1 !== "") {
              oFilter1 = JSON.parse(rows[0].FILTRO_1);
            }
            if (rows[0].FILTRO_2 !== undefined && rows[0].FILTRO_2 !== "") {
              oFilter2 = JSON.parse(rows[0].FILTRO_2);
            }
            if (rows[0].FILTRO_3 !== undefined && rows[0].FILTRO_3 !== "") {
              oFilter3 = JSON.parse(rows[0].FILTRO_3);
            }
            if (rows[0].FILTRO_4 !== undefined && rows[0].FILTRO_4 !== "") {
              oFilter4 = JSON.parse(rows[0].FILTRO_4);
            }

            ///////////////////////////////////////////////
            /* Controllo se ci sono acquisizioni */
            ///////////////////////////////////////////////
            if (oFilter1 === undefined && oFilter2 === undefined && oFilter3 === undefined) {
              oContext.showErrorMessageBox("Non è prevista l'acquisizione del Container inserito in questa Cartella di lavoro");
              return;
            }
            ///////////////////////////////////////////////

            var aModelPopup = [];

            if (oFilter3 !== undefined) {
              if (oFilter3.f3.Row instanceof Array) {
                oFilter3.f3.Row.forEach(function (oRow) {
                  var oBaseModelPopup = {
                    SFC: "",
                    MATERIAL: "",
                    FLAG: false,
                    FLAG_EDITABLE: false
                  };
                  oBaseModelPopup.SFC = oRow.SFC;
                  oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                  oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                  oBaseModelPopup.FLAG = true;
                  oBaseModelPopup.FLAG_EDITABLE = true;
                  try {
                    oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                    oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                  } catch (e) { }

                  if (!aModelPopup.some(function (a) {
                    return a.SFC === oBaseModelPopup.SFC
                  })) {
                    aModelPopup.push(oBaseModelPopup);
                  }

                });

              } else {
                var oBaseModelPopup = {
                  SFC: "",
                  MATERIAL: "",
                  ID_Z_NC_LOCATION_INSTANCE: "",
                  FLAG: false,
                  FLAG_EDITABLE: false
                };
                var oRow = oFilter3.f3.Row;
                oBaseModelPopup.SFC = oRow.SFC;
                oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                oBaseModelPopup.FLAG = true;
                oBaseModelPopup.FLAG_EDITABLE = true;
                try {
                  oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                  oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                } catch (e) { }

                if (!aModelPopup.some(function (a) {
                  return a.SFC === oBaseModelPopup.SFC
                })) {
                  aModelPopup.push(oBaseModelPopup);
                }
              }
            }

            /*2) Elenco degli SFC estratti dopo l’esecuzione dei primi due filtri, descritti
            nell'algoritmo in alleagato,e se non già inseriti al punto 1); per questi SFC la casella non
            sarà flaggata e nemmeno editabile;*/
            if (oFilter2 !== undefined) {
              if (oFilter2.f2.Row instanceof Array) {
                oFilter2.f2.Row.forEach(function (oRow) {
                  var oBaseModelPopup = {
                    SFC: "",
                    MATERIAL: "",
                    ID_Z_NC_LOCATION_INSTANCE: "",
                    FLAG: false,
                    FLAG_EDITABLE: false
                  };
                  oBaseModelPopup.SFC = oRow.SFC;
                  oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                  oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                  oBaseModelPopup.FLAG = false;
                  oBaseModelPopup.FLAG_EDITABLE = false;
                  try {
                    oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                    oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                  } catch (e) { }

                  if (!aModelPopup.some(function (a) {
                    return a.SFC === oBaseModelPopup.SFC
                  })) {
                    aModelPopup.push(oBaseModelPopup);
                  }

                });

              } else {
                var oBaseModelPopup = {
                  SFC: "",
                  MATERIAL: "",
                  ID_Z_NC_LOCATION_INSTANCE: "",
                  FLAG: false,
                  FLAG_EDITABLE: false
                };
                var oRow = oFilter2.f2.Row;
                oBaseModelPopup.SFC = oRow.SFC;
                oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                oBaseModelPopup.FLAG = false;
                oBaseModelPopup.FLAG_EDITABLE = false;
                try {
                  oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                  oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                } catch (e) { }

                if (!aModelPopup.some(function (a) {
                  return a.SFC === oBaseModelPopup.SFC
                })) {
                  aModelPopup.push(oBaseModelPopup);
                }
              }
            }

            /*3) Elenco dei materiali a cui non è stato associato l’SFC sul container. Per recuperare questi valori:
            3.1) Entrare con gli SFC estratti dopo l’esecuzione dei primi due filtri, descritti nell'algoritmo
            in allegato, nella tabella SFC e recuperare i valori della colonna ITEM_DESCRIPTION.
            */
            var aMaterialModel = [];
            if (oFilter2 !== undefined) {
              if (oFilter2 !== undefined) {
                if (oFilter1 !== undefined) {
                  if (oFilter1.f1.Row instanceof Array) {
                    oFilter1.f1.Row.forEach(function (oRow) {
                      var oBaseModelPopup = {
                        SFC: "",
                        MATERIAL: "",
                        ID_Z_NC_LOCATION_INSTANCE: "",
                        FLAG: false,
                        FLAG_EDITABLE: false
                      };
                      oBaseModelPopup.SFC = oRow.SFC;
                      oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                      oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                      oBaseModelPopup.FLAG = false;
                      oBaseModelPopup.FLAG_EDITABLE = false;
                      try {
                        oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                        oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                      } catch (e) { }

                      if (!aModelPopup.some(function (a) {
                        return a.SFC === oBaseModelPopup.SFC
                      })) {
                        aModelPopup.push(oBaseModelPopup);
                      }

                    });

                  } else {
                    var oBaseModelPopup = {
                      SFC: "",
                      MATERIAL: "",
                      ID_Z_NC_LOCATION_INSTANCE: "",
                      FLAG: false,
                      FLAG_EDITABLE: false
                    };
                    var oRow = oFilter1.f1.Row;
                    oBaseModelPopup.SFC = oRow.SFC;
                    oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                    oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                    oBaseModelPopup.FLAG = false;
                    oBaseModelPopup.FLAG_EDITABLE = false;
                    try {
                      oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                      oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                    } catch (e) { }

                    if (!aModelPopup.some(function (a) {
                      return a.SFC === oBaseModelPopup.SFC
                    })) {
                      aModelPopup.push(oBaseModelPopup);
                    }
                  }
                }
                if (oFilter2.f2.Row instanceof Array) {
                  oFilter2.f2.Row.forEach(function (oRow) {
                    var oBaseModelPopup = {
                      MATERIAL: "",
                      FLAG: false,
                      FLAG_EDITABLE: false
                    };
                    //oBaseModelPopup.MATERIAL = oRow.DESCRIPTION;
                    try {
                      oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                      oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                    } catch (e) {
                      oBaseModelPopup.MATERIAL = oRow.DESCRIPTION;
                    }
                    oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                    oBaseModelPopup["ID_Z_NC_LOCATION_INSTANCE"] = oRow.ID_Z_NC_LOCATION_INSTANCE;
                    oBaseModelPopup.FLAG = false;
                    oBaseModelPopup.FLAG_EDITABLE = false;

                    if (!aMaterialModel.some(function (a) {
                      return a.MATERIAL === oBaseModelPopup.MATERIAL
                    })) {
                      aMaterialModel.push(oBaseModelPopup);
                    } else {
                      for (var [i, elem] of aMaterialModel.entries()) {
                        if (elem.MATERIAL === oBaseModelPopup.MATERIAL) {
                          aMaterialModel.splice(i, 1);
                        }
                      }
                    }

                  });
                } else {
                  var oBaseModelPopup = {
                    MATERIAL: "",
                    FLAG: false,
                    FLAG_EDITABLE: false
                  };
                  var oRow = oFilter2.f2.Row;
                  //oBaseModelPopup.MATERIAL = oRow.DESCRIPTION;
                  try {
                    oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                    oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                  } catch (e) {
                    oBaseModelPopup.MATERIAL = oRow.DESCRIPTION;
                  }
                  oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                  oBaseModelPopup["ID_Z_NC_LOCATION_INSTANCE"] = oRow.ID_Z_NC_LOCATION_INSTANCE;
                  oBaseModelPopup.FLAG = false;
                  oBaseModelPopup.FLAG_EDITABLE = false;

                  if (!aMaterialModel.some(function (a) {
                    return a.MATERIAL === oBaseModelPopup.MATERIAL
                  })) {
                    aMaterialModel.push(oBaseModelPopup);
                  } else {
                    for (var [i, elem] of aMaterialModel.entries()) {
                      if (elem.MATERIAL === oBaseModelPopup.MATERIAL) {
                        aMaterialModel.splice(i, 1);
                      }
                    }
                  }
                }
              }

            }


            /*17/06/2022*/
            /*************************************************************************************************************************/
            if (oFilter1 !== undefined && oFilter2 == undefined && oFilter3 == undefined) {
              if (oFilter1.f1.Row instanceof Array) {
                oFilter1.f1.Row.forEach(function (oRow) {
                  var oBaseModelPopup = {
                    SFC: "",
                    MATERIAL: "",
                    ID_Z_NC_LOCATION_INSTANCE: "",
                    FLAG: false,
                    FLAG_EDITABLE: false
                  };
                  oBaseModelPopup.SFC = oRow.SFC;
                  oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                  oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                  oBaseModelPopup.FLAG = false;
                  oBaseModelPopup.FLAG_EDITABLE = false;
                  try {
                    oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                    oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                  } catch (e) { }

                  if (!aModelPopup.some(function (a) {
                    return a.SFC === oBaseModelPopup.SFC
                  })) {
                    aModelPopup.push(oBaseModelPopup);
                  }

                });

              } else {
                var oBaseModelPopup = {
                  SFC: "",
                  MATERIAL: "",
                  ID_Z_NC_LOCATION_INSTANCE: "",
                  FLAG: false,
                  FLAG_EDITABLE: false
                };
                var oRow = oFilter1.f1.Row;
                oBaseModelPopup.SFC = oRow.SFC;
                oBaseModelPopup["OPERATION_BO"] = oRow.OPERATION_BO;
                oBaseModelPopup.ID_Z_NC_LOCATION_INSTANCE = oRow.ID_Z_NC_LOCATION_INSTANCE;
                oBaseModelPopup.FLAG = false;
                oBaseModelPopup.FLAG_EDITABLE = false;
                try {
                  oBaseModelPopup.MATERIAL = oRow.ITEM_BO.split(",")[1];
                  oBaseModelPopup.ITEM_BO = oRow.ITEM_BO;
                } catch (e) { }

                if (!aModelPopup.some(function (a) {
                  return a.SFC === oBaseModelPopup.SFC
                })) {
                  aModelPopup.push(oBaseModelPopup);
                }
              }
            }
            /*17/06/2022     FINE*/
            /*************************************************************************************************************************/

            /*3.2) Confrontare questi valori con quelli dei materiali recuperati precedentemente
            (sono i valori che andranno a popolare la tabella di sola visualizzazione dei materiali che compare sul
            POD quando c’è da acquisire un container).*/
            /*3.3) Inserire nell’elenco in popup i materiali che sono presenti nella tabella di sola visualizzazione
            solo se non è stata trovata la corrispondenza con i valori estratti al punto 3.1)*/

            /*I materiali inseriti come elenco nella popup avranno la casella non flaggata e non editabile.
            Vedere allegato Algoritmo sparata container*/
            try {
              var aContainer = oContext.getViewModel().getProperty("/preassembly").filter(function (a) {
                return a.container === param[0] && a.container_key === param[1];
              });
              if (aContainer !== undefined && aContainer.length > 0) {
                if (aContainer !== undefined && aContainer.length > 0) {
                  var aDifMaterial = [];
                  aContainer.forEach(function (oContainer) {
                    if (oContainer.itemDescriptionList.length > 0) {
                      oContainer.itemDescriptionList.forEach(function (oItem) {
                        let skip = false;
                        for (let i in aModelPopup) {
                          if (oItem["key"] === aModelPopup[i]["MATERIAL"] && !aModelPopup[i]["SKIP"]) {
                            skip = true;
                            aModelPopup[i]["SKIP"] = skip;
                            break;
                          }
                        }
                        if (!skip) {
                          aDifMaterial.push({
                            OPERATION: oContainer.op_handle,
                            MATERIAL: oItem.key,
                            ID_Z_NC_LOCATION_INSTANCE: 22622,
                            FLAG: false,
                            FLAG_EDITABLE: false
                          });
                        }

                        /*
                        var aExist = aMaterialModel.filter(function (a) {
                          return a.MATERIAL == oItem.key;
                        });
                        var bExist = aExist.length > 0;
                       
                        var aExistPos = aModelPopup.filter(function (a) {
                          return a.MATERIAL == oItem.key;
                        });
                        var bExistPos = aExistPos.length > 0;

                        if (!bExist && !bExistPos) {
                          aDifMaterial.push({
                            OPERATION: oContainer.op_handle,
                            MATERIAL: oItem.key,
                            ID_Z_NC_LOCATION_INSTANCE: 22622,
                            FLAG: false,
                            FLAG_EDITABLE: false
                          });
                        }
                        */
                      });
                    }
                  });
                  aMaterialModel = aDifMaterial;
                }
                aMaterialModel = aDifMaterial;

              }

            } catch (e) { }

            oContext.getViewModel().setProperty("/container", {
              SFC: aModelPopup,
              MATERIAL: aMaterialModel,
              INPUT_MATERIAL_LIST: param[2]
            });
            oContext.getViewModel().setProperty("/containerOperation", {
              oFilter4
            });
            oContext.ChkContainerDialog.open(oContext.getView(), oContext);
          } else if (sMessages !== undefined && sMessages.length > 0) {
            if (sMessages instanceof Array) {
              var aMessage = sMessages.filter(function (v, i, a) {
                return a.indexOf(v) === i;
              });
              aMessage.forEach(function (oItem) {
                oContext.showErrorMessageBox(oItem);
              });
            } else {
              oContext.showErrorMessageBox(sMessages);
            }
          } else {
            if (rows[0].CONTAINER === param[1]) {
              var aMaterialModel = [];
              try {
                var aContainer = oContext.getViewModel().getProperty("/preassembly").filter(function (a) {
                  return a.container === param[0] && a.container_key === param[1];
                });
                if (aContainer !== undefined && aContainer.length > 0) {
                  if (aContainer !== undefined && aContainer.length > 0) {
                    var aDifMaterial = [];
                    aContainer.forEach(function (oContainer) {
                      if (oContainer.itemDescriptionList.length > 0) {

                        oContainer.itemDescriptionList.forEach(function (oItem) {

                          var aExist = aMaterialModel.filter(function (a) {
                            return a.MATERIAL == oItem.key;
                          });
                          var bExist = aExist.length > 0;
                          if (!bExist) {
                            aDifMaterial.push({
                              OPERATION: oContainer.op_handle,
                              MATERIAL: oItem.key,
                              ID_Z_NC_LOCATION_INSTANCE: 22622,
                              FLAG: false,
                              FLAG_EDITABLE: false
                            });
                          }

                        });
                      }
                    });
                    //var aDifMaterial = aMaterialModel.filter(function (x) { return !aContainer[0].itemDescriptionList.map(function (a) { return a.text; }).includes(x.MATERIAL); });
                    aMaterialModel = aDifMaterial;
                  }
                  aMaterialModel = aDifMaterial;
                }

              } catch (e) { }

              oContext.getViewModel().setProperty("/container", {
                SFC: aModelPopup,
                MATERIAL: aMaterialModel,
                INPUT_MATERIAL_LIST: param[2]
              });
              oContext.ChkContainerDialog.open(oContext.getView(), oContext);
            } else {
              oContext.showErrorMessageBox("Non è prevista l'acquisizione del Container inserito in questa Cartella di lavoro");
            }

          }

          (new oContext.getCustomBusyDialog()).closeBusy(oContext);
        },
        fError = function (oError) {
          (new oContext.getCustomBusyDialog()).closeBusy(oContext);
          console.log(oError);
        };
      CommonCallManager.getRows(sTransaction, oParams, fSuccess.bind(oContext, [oModel.container, oModel.container_key, oModel.itemDescriptionList]), fError.bind(oContext), true);
    },
    saveBaugruppen: function (oModel, sPath) {

      sap.ui.core.BusyIndicator.show();
      var obj = oModel;

      var that = this;

      var transactionName = "InsertBaugruppen";
      var transactionCall = "8800_MES/TRANSACTION/POD_COMMON/MM" + "/" + transactionName;

      var selModel = ModelManager.getModel(ModelManager.NAMES.selPodModel);

      var params = {
        "TRANSACTION": transactionCall,
        "baugruppen": obj.comments.trim(),
        "site": window.site,
        "bom_component_handle": obj.bom_component_handle,
        "item_handle": obj.item_handle,
        "data_field": obj.data_type, //TODO: Forse devo fare un controllo se è un container o meno....
        "op_handle": obj.op_handle,
        "user_id": window.user_id_http,
        "res_handle": "",
        "VIN": obj.SFC, //oContext.getInfoModel().getProperty("/vin/VIN"),
        "wc_handle": obj.work_center_bo,
        "SKIP_UNIQUE_ASSY": obj.SKIP_UNIQUE_ASSY,
        "OutputParameter": "JSON"
      };


      try {
        var req = jQuery.ajax({
          url: "/XMII/Runner",
          data: params,
          method: "POST",
          dataType: "xml",
          async: true
        });
        req.done(jQuery.proxy(that.saveBaugruppenSuccess, that, [sPath]));
        req.fail(jQuery.proxy(that.saveBaugruppenError, [sPath]));
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        jQuery.sap.log.debug(err.stack);
      }

    },
    checkUniqueMask: function (oModel, sPath, successFunction) {
      var that = this;
      var obj = oModel;

      var transactionName = "CHECK_MASK_MULTI_GROUP";
      var transactionCall = "8800_MES/TRANSACTION/POD_COMMON/MM" + "/" + transactionName;

      var params = {
        "TRANSACTION": transactionCall,
        "baugruppen": obj.comments.trim(),
        "site": window.site,
        "item_handle": obj.item_handle,
        "data_field": obj.data_type,
        "user_id": oContext.getInfoModel().getProperty("/user/id"),
        "VIN": obj.SFC,
        "OutputParameter": "JSON"
      };


      try {
        var req = jQuery.ajax({
          url: "/XMII/Runner",
          data: params,
          method: "POST",
          dataType: "xml",
          async: true
        });
        req.done(jQuery.proxy(that.checkUniqueMaskSuccess, that, [oModel, sPath, successFunction]));
        req.fail(jQuery.proxy(that.checkUniqueMaskError));
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        jQuery.sap.log.debug(err.stack);
      }
    },
    checkUniqueMaskSuccess: function (tData, data, response) {
      var jsonArrStr = jQuery(data).find("Row").text();
      var jsonObj = JSON.parse(jsonArrStr);
      var oModel = tData[0],
        sPath = tData[1],
        sFunction = tData[2];

      if (jsonObj.isError === "2") {
        MessageBox.warning(jsonObj.errorMessage, {
          actions: [oContext.getI18nByTokenCommon("podCommon.action.ok"), MessageBox.Action.CANCEL],
          emphasizedAction: oContext.getI18nByTokenCommon("podCommon.action.ok"),
          onClose: function (sAction) {
            if (sAction === oContext.getI18nByTokenCommon("podCommon.action.ok")) {
              oModel["SKIP_UNIQUE_ASSY"] = true;
              sFunction.apply(oContext, [oModel]);
              return;
            }
          }
        });
      } else {
        sFunction.apply(oContext, [oModel]);
      }
    },
    checkUniqueMaskError: function (error) {
      this.showErrorMessageBox("Impossibile verificare unicità maschera per materiale: " + error.responseText);
    },
    preSave: function (oEvent) {
      debugger;
      oContext.oEventInput = oEvent.getSource().getId();
      var sPath = oEvent.getSource().getBindingContext("baugruppen") === undefined ? oEvent.getSource().getBindingContext().getPath() : oEvent.getSource().getBindingContext("baugruppen").getPath();
      var oModel = oEvent.getSource().getBindingContext("baugruppen") === undefined ? oEvent.getSource().getBindingContext().getModel().getProperty(sPath) : oEvent.getSource().getBindingContext("baugruppen").getModel().getProperty(sPath);
      oModel["work_center_bo"] = oContext.getInfoModel().getProperty("/workcenter/handle");
      oContext.createAndSaveBaugruppen(oModel, sPath);
    },
    createAndSaveBaugruppen: function (oModel, sPath) {

      sap.ui.core.BusyIndicator.show();
      var obj = oModel;

      var that = this;

      var transactionName = "CREATE_AND_ASSEMBLY_BAU";
      var transactionCall = "8800_MES/TRANSACTION/BAU_CREATION" + "/" + transactionName;

      var selModel = ModelManager.getModel(ModelManager.NAMES.selPodModel);

      var params = {
        "TRANSACTION": transactionCall,
        "STEP": "SFC_ASSY",
        "SITE": window.site,
        "bom_component_handle": obj.bom_component_handle,
        "ITEM": obj.item_handle,
        "data_field": obj.data_type, //TODO: Forse devo fare un controllo se è un container o meno....
        "op_handle": obj.op_handle,
        "user_id": window.user_id_http,
        "res_handle": "",
        "SFC": obj.SFC, //oContext.getInfoModel().getProperty("/vin/VIN"),
        "wc_handle": obj.work_center_bo,
        "SKIP_UNIQUE_ASSY": obj.SKIP_UNIQUE_ASSY,
        "OutputParameter": "JSON"
      };


      try {
        var req = jQuery.ajax({
          url: "/XMII/Runner",
          data: params,
          method: "POST",
          dataType: "xml",
          async: true
        });
        req.done(jQuery.proxy(that.createAndSaveBaugruppenSuccess, that, [sPath]));
        req.fail(jQuery.proxy(that.createAndSaveBaugruppenError, [sPath]));
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        jQuery.sap.log.debug(err.stack);
      }

    },
    createAndSaveBaugruppenSuccess: function (sPath, data) {
      var path = sPath[0];

      sap.ui.core.BusyIndicator.hide();
      try {
        var jsonArrStr = jQuery(data).find("Row").text();
        var jsonObj = JSON.parse(jsonArrStr);
        if ("1" === jsonObj.isError) {
          sap.ui.core.BusyIndicator.hide();
          this.showErrorMessageBox("Impossibile creare/salvare il BAUGRUPPEN. Messaggio di errore: " + jsonObj.errorMessage);
        } else {
          oContext.getView().getModel("baugruppen").setProperty(path + "/editable", false);
          oContext.getView().getModel("baugruppen").setProperty(path + "/justSaved", true);
          sap.ui.core.BusyIndicator.hide();
          MessageToast.show("Baugruppen saved");
          oContext.getBaugruppen();

          //Apro l'aggiornamento delle operazioni
          oContext.getInfoModel().setProperty("/changeOperation", true);
        }
        jQuery.sap.log.debug(data);
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        this.showErrorMessageBox("Impossibile creare/salvare il BAUGRUPPEN. Messaggio di errore: " + err);
      }


    },

    createAndSaveBaugruppenError: function (error) {

      sap.ui.core.BusyIndicator.hide();
      this.showErrorMessageBox("Impossibile creare/salvare il BAUGRUPPEN. Messaggio di errore: " + error.responseText);

    },
    saveBaugruppenSuccess: function (sPath, data) {
      var path = sPath[0];

      sap.ui.core.BusyIndicator.hide();
      try {
        var jsonArrStr = jQuery(data).find("Row").text();
        var jsonObj = JSON.parse(jsonArrStr);
        if ("1" === jsonObj.isError) {
          sap.ui.core.BusyIndicator.hide();
          this.showErrorMessageBox("Impossibile salvare il BAUGRUPPEN. " + jsonObj.errorMessage);
        } else {
          oContext.getView().getModel("baugruppen").setProperty(path + "/editable", false);
          oContext.getView().getModel("baugruppen").setProperty(path + "/justSaved", true);
          sap.ui.core.BusyIndicator.hide();
          MessageToast.show("Baugruppen saved");
          oContext.getBaugruppen();

          //Apro l'aggiornamento delle operazioni
          oContext.getInfoModel().setProperty("/changeOperation", true);
        }
        jQuery.sap.log.debug(data);
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        this.showErrorMessageBox("Impossibile salvare il BAUGRUPPEN. Messaggio di errore: " + err);
      }


    },
    saveBaugruppenError: function (error) {

      sap.ui.core.BusyIndicator.hide();
      this.showErrorMessageBox("Impossibile salvare il BAUGRUPPEN. Messaggio di errore: " + error.responseText);

    },
    showErrorMessageBox: function (msg) {
      MessageBox.error(msg, {
        onClose: function (oEvent) {
          //Aprire popup dei commenti // rimosso con enh 51  se Baugruppe già acquisito
          if (msg.indexOf("Baugruppe già acquisito") < 0) {
            oContext.PopupSFCDialog.open(oContext.getView(), oContext, oContext.getInfoModel().getProperty("/vin/VIN"), true);
          }
          //Svuoto il campo
          //oContext.oEventInput.getSource().setValue("");
          sap.ui.getCore().byId(oContext.oEventInput).setValue("");
          oContext.oEventInput = undefined;
        }
      });
    },
    savePreAssembly: function (oModel, sPath, bForce) {
      if (bForce === undefined) {
        bForce = false;
      }
      var fSuccess = function (sPath, data) {

        var path = sPath[0];

        sap.ui.core.BusyIndicator.hide();
        try {
          var jsonArrStr = jQuery(data).find("Row").text();
          var jsonObj = JSON.parse(jsonArrStr);
          if ("1" === jsonObj.isError) {
            sap.ui.core.BusyIndicator.hide();
            oContext.showErrorMessageBox(jsonObj.errorMessage);
          } else if ("2" === jsonObj.isError) {
            //source.setValue("");
            sap.ui.core.BusyIndicator.hide();
            //Popup conferma
            sap.m.MessageBox.confirm(jsonObj.errorMessage, {
              title: "Conferma Assemblaggio", // default
              onClose: function (oAction) {
                if (oAction == "OK") {
                  //lancia transazione
                  jQuery.proxy(oContext.savePreAssembly(oModel, sPath, true), oContext);
                }
                if (oAction == "CANCEL") {
                  source.setValue("");
                }
              },
              styleClass: "", // default
              initialFocus: null, // default
              textDirection: sap.ui.core.TextDirection.Inherit // default
            });
          } else {
            oContext.getViewModel().setProperty(path + "/editable", false);
            oContext.getViewModel().setProperty(path + "/justSaved", true);
            sap.ui.core.BusyIndicator.hide();
            oContext.getBaugruppen();
            MessageToast.show("Preassembly saved");

            //Apro l'aggiornamento delle operazioni
            oContext.getInfoModel().setProperty("/changeOperation", true);
          }
          jQuery.sap.log.debug(data);
        } catch (err) {
          sap.ui.core.BusyIndicator.hide();
          oContext.showErrorMessageBox("Impossibile salvare il PREASSEMBLY. " + err);
        }
      },
        sError = function (oError) {
          sap.ui.core.BusyIndicator.hide();
          oContext.showErrorMessageBox("Impossibile salvare il BAUGRUPPEN. " + error.responseText);
        };
      var op_handle = op_handle;

      var transactionName = "InsertPreAssembly";

      var transactionCall = "8800_MES/TRANSACTION" + "/" + transactionName;

      var params = {
        "TRANSACTION": transactionCall,
        "site": oContext.getInfoModel().getProperty("/site"),
        "op_handle": oModel.op_handle,
        "preassembly": oModel.comments.trim(),
        "user_id": oContext.getInfoModel().getProperty("/user/id"),
        "res_handle": "",
        "VIN": oModel.SFC, //oContext.getInfoModel().getProperty("/vin/VIN"),
        "wc_handle": oContext.getInfoModel().getProperty("/workcenter/handle"),
        "okAssembleGiven": bForce,
        "ITEM": oModel.item,
        "OutputParameter": "JSON"
      };

      try {
        var req = jQuery.ajax({
          url: "/XMII/Runner",
          data: params,
          method: "POST",
          dataType: "xml",
          async: true
        });
        req.done(jQuery.proxy(fSuccess, oContext, [sPath]));
        req.fail(jQuery.proxy(sError, [sPath]));
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        jQuery.sap.log.debug(err.stack);
      }
    },
    savePreassemblyInternal: function (pPreAssembly, pOpHandle, pItem, bForce) {
      var that = this;
      var fSuccess = function (data) {


        sap.ui.core.BusyIndicator.hide();
        try {
          var jsonArrStr = jQuery(data).find("Row").text();
          var jsonObj = JSON.parse(jsonArrStr);
          if ("1" === jsonObj.isError) {
            sap.ui.core.BusyIndicator.hide();
            oContext.showErrorMessageBox("Impossibile salvare il PREASSEMBLY. " + jsonObj.errorMessage);
          } else if ("2" === jsonObj.isError) {
            // //source.setValue("");
            // sap.ui.core.BusyIndicator.hide();

            // //Popup conferma
            // sap.m.MessageBox.confirm("Attenzione: il pre-assembly non è destinato al SFC in lavorazione. Sei sicuro di voler confermare l'assemblaggio?", {
            //   title: "Conferma Assemblaggio", // default
            //   onClose: function (oAction) {
            //     if (oAction == "OK") {
            //       //lancia transazione
            //       jQuery.proxy(that.savePreassemblyInternal(pPreAssembly, pOpHandle, pItem, true), that);
            //     }
            //   },
            //   styleClass: "", // default
            //   initialFocus: null, // default
            //   textDirection: sap.ui.core.TextDirection.Inherit // default
            // });
          } else {
            sap.ui.core.BusyIndicator.hide();
            that.getBaugruppen();
            MessageToast.show("Preassembly saved");
          }
        } catch (err) {
          sap.ui.core.BusyIndicator.hide();
          that.showErrorMessageBox("Impossibile salvare il PREASSEMBLY. " + err);
        }
      };
      var sError = function (oError) {
        sap.ui.core.BusyIndicator.hide();
        that.showErrorMessageBox("Impossibile salvare il BAUGRUPPEN. " + oError.responseText);
      };

      var transactionCall = "8800_MES/TRANSACTION/InsertPreAssembly";

      var params = {
        "TRANSACTION": transactionCall,
        "site": that.getInfoModel().getProperty("/site"),
        "op_handle": pOpHandle,
        "preassembly": pPreAssembly,
        "user_id": that.getInfoModel().getProperty("/user/id"),
        "res_handle": "",
        "VIN": that.getInfoModel().getProperty("/vin/VIN"),
        "wc_handle": that.getInfoModel().getProperty("/workcenter/handle"),
        "okAssembleGiven": bForce,
        "ITEM": pItem,
        "OutputParameter": "JSON"
      };

      try {
        var req = jQuery.ajax({
          url: "/XMII/Runner",
          data: params,
          method: "POST",
          dataType: "xml",
          async: true
        });
        req.done(jQuery.proxy(fSuccess, that));
        req.fail(jQuery.proxy(sError, that));
      } catch (err) {
        sap.ui.core.BusyIndicator.hide();
        jQuery.sap.log.debug(err.stack);
      }
    },
    enterPropostaMotore: function (arg, man, par) {
      var that = this;
      that.savePreassemblyInternal(par.selectedObj.SFC, par.selectedObj.OPERATION_BO, par.selectedObj.ITEM, true)
    }
  });

  return BaugruppenController;

});
