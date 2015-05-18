///////////////////////////////////////////////////////////////////////////
// Copyright © 2015 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/SimpleTable',
    'dojo',
    'dojo/query',
    'dojo/_base/html',
    'dojo/dom-style',
    'dojo/_base/array',
    'dojo/on',
    'dojo/_base/lang',
    'dojo/dom-construct'
],
  function (
    declare,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    SimpleTable,
    dojo,
    query,
    html,
    domStyle,
    array,
    on,
    lang,
    domConstruct

        ) {
      return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
          //these two properties is defined in the BaseWidget
          baseClass: 'solutions-widget-SpiderDist-setting',
          layersTable: null,
          currentLayer: null,
          selectedFields: [],
          startup: function () {
              this.inherited(arguments);
              if (this.config === null) {
                  this.config = {};

              }
              if (this.config === undefined) {
                  this.config = {};

              }
              if (this.config === '') {
                  this.config = {};

              }
              this.setConfig(this.config);
              this.createLayerTable();
              this.loadLayerTable();
              this.createFieldsTable();


              try {
                  var btnBar =
                      (this.domNode.parentNode.parentNode.parentNode.
                        parentNode.lastChild.lastChild);

                  this.btnAdvSettings = domConstruct.toDom(
                  "<div class='jimu-popup-btn jimu-float-trailing jimu-leading-margin1'>" +
                  this.nls.advSettingsBtn + "</div>");
                  dojo.connect(this.btnAdvSettings, "onclick", 
                    lang.hitch(this, this.showAdvSettings));

                  this.btnSaveFields = domConstruct.toDom(
                     "<div class='jimu-popup-btn jimu-float-trailing jimu-leading-margin1 hide'>" +
                     this.nls.saveFields + "</div>");
                  dojo.connect(this.btnSaveFields, "onclick", 
                    lang.hitch(this, this.saveFields));

                  this.btnCancelFields = domConstruct.toDom(
                      "<div class='jimu-popup-btn jimu-float-trailing jimu-leading-margin1 hide'>" +
                      this.nls.cancelFields + "</div>");
                  dojo.connect(this.btnCancelFields, "onclick", 
                    lang.hitch(this, this.cancelFields));

                  this.btnSaveAdv = domConstruct.toDom(
                    "<div class='jimu-popup-btn jimu-float-trailing jimu-leading-margin1 hide'>" +
                    this.nls.saveAdv + "</div>");
                  dojo.connect(this.btnSaveAdv, "onclick", 
                    lang.hitch(this, this.saveAdv));

                  this.btnCancelAdv = domConstruct.toDom(
                      "<div class='jimu-popup-btn jimu-float-trailing jimu-leading-margin1 hide'>" +
                      this.nls.cancelAdv + "</div>");
                  dojo.connect(this.btnCancelAdv, "onclick", 
                    lang.hitch(this, this.cancelAdv));

                  this.btnErrorMsg = domConstruct.toDom("<div class='settings-error hide'></div>");
                  domConstruct.place(this.btnAdvSettings, btnBar, "after");
                  domConstruct.place(this.btnSaveAdv, this.btnAdvSettings, "after");
                  domConstruct.place(this.btnCancelAdv, this.btnSaveAdv, "after");
                  domConstruct.place(this.btnSaveFields, this.btnCancelAdv, "after");
                  domConstruct.place(this.btnCancelFields, this.btnSaveFields, "after");
                  domConstruct.place(this.btnErrorMsg, this.btnCancelFields, "after");

              }
              catch (err) {
                  console.log(err.message);
              }
          },


          setConfig: function (config) {
              this.config = config;
              array.forEach(this.config.pointLayer, function (row) {
                  this.selectedFields[row.id] = row.fields;
              }, this);
          },
          getConfig: function () {

              var data = this.layersTable.getData();
              this.config.pointLayer = [];
              var layersValid = false;
              var error = array.some(data, function (row) {
                  if (row.enrich) {
                      var enrichLayer = {};
                      enrichLayer.id = row.id;
                      enrichLayer.name = row.name;
                      enrichLayer.url = row.url;
                      if (!this.selectedFields[enrichLayer.id]) {
                          return true;
                      }
                      enrichLayer.fields = this.selectedFields[enrichLayer.id];
                      this.config.pointLayer.push(enrichLayer);
                      layersValid = true;
                  }
              }, this);
              if (error || layersValid === false) {
                  this.showOKError();
                  return false;
              }

              return this.config;
          },

          loadLayerTable: function () {
              var label = '';
              var tableValid = false;
              var enrich = false;

              array.forEach(this.map.itemInfo.itemData.operationalLayers, function (layer) {
                  if (layer.layerObject !== null && layer.layerObject !== undefined) {
                      if (layer.layerObject.type === 'Feature Layer' && 
                        layer.url && layer.layerObject.geometryType === "esriGeometryPoint") {
                          label = layer.title;
                          enrich = false;

                          var filteredArr = dojo.filter(this.config.pointLayer, 
                            function (layerInfo) {
                              return layerInfo.id === layer.layerObject.id;
                          });
                          if (filteredArr.length > 0) {
                              enrich = true;
                          }
                          this.layersTable.addRow({
                              label: label,
                              enrich: enrich,
                              url:layer.layerObject.url,
                              id: layer.layerObject.id
                          });
                          tableValid = true;
                      }
                  }
              }, this);

              if (!tableValid) {
                  domStyle.set(this.tableLayerInfosError, 'display', '');
              } else {
                  domStyle.set(this.tableLayerInfosError, 'display', 'none');
              }
          },
          createLayerTable: function () {
              var layerTableFields = [{
                  name: 'enrich',
                  title: this.nls.layerTable.colEnrich,
                  type: 'radio',
                  'class': 'enrich'
              }, {
                  name: 'label',
                  title: this.nls.layerTable.colLabel,
                  type: 'text'
              },
             {
                 name: 'actions',
                 title: this.nls.layerTable.colFieldSelector,
                 type: 'actions',
                 'class': 'fieldselector',
                 actions: ['edit']
             }, {
                 name: 'id',
                 type: 'text',
                 hidden: true
             },{
                 name: 'url',
                 type: 'text',
                 hidden: true
             }];
              var args = {
                  fields: layerTableFields,
                  selectable: false
              };
              domConstruct.empty(this.tableLayerInfos);
              this.layersTable = new SimpleTable(args);
              this.layersTable.placeAt(this.tableLayerInfos);
              this.layersTable.startup();
              this.own(on(this.layersTable, 'actions-edit',
                  lang.hitch(this, this.showLayerFields)));

          },
          createFieldsTable: function () {
              var layerFields = [{
                  name: 'isAppended',
                  title: this.nls.fieldTable.colAppend,
                  type: 'radio',
                  'class': 'appended'
              }, {
                  name: 'fieldName',
                  title: this.nls.fieldTable.colName,
                  type: 'text'
              }, {
                  name: 'label',
                  title: this.nls.fieldTable.colAlias,
                  type: 'text',
                  editable: true
              }];
              var layerFieldArgs = {
                  fields: layerFields,
                  selectable: false
              };
              this.layerFieldsTable = new SimpleTable(layerFieldArgs);
              this.layerFieldsTable.placeAt(this.tableFieldInfos);
              this.layerFieldsTable.startup();
          },
          showLayerFields: function (tr) {
             
              this.currentLayer = null;
              var tds = query('.action-item-parent', tr);
              if (tds && tds.length) {
                  var rowData = this.layersTable.getRowData(tr);
                  this.layerFieldsTable.clear();

                  var layer = this.map.getLayer(rowData.id);
                  if (layer) {
                      if (layer.infoTemplate) {
                          var fields = this.selectedFields[rowData.id];
                          var filtFields;
                          var filtAlias;
                          var isAppended;
                          if (fields) {
                              filtFields = array.map(fields, function (field) {
                                  return field.fieldName;
                              });
                              filtAlias = array.map(fields, function (field) {
                                return field.label; 
                              });
                          }
                          fields = layer.infoTemplate.info.fieldInfos;
                          array.forEach(fields, function (field) {
                           var aliasLabel = field.label;
                              isAppended = false;
                              if (filtFields) {
                                  if (filtFields.indexOf(field.fieldName) >= 0) {
                                      isAppended = true;
                                      aliasLabel = filtAlias[filtFields.indexOf(field.fieldName)];
                                  }
                              }
                              this.layerFieldsTable.addRow({
                                  fieldName: field.fieldName,
                                  label: aliasLabel,
                                  isAppended: isAppended
                              });
                          }, this);
                          html.addClass(this.mainPage, 'hide');
                          html.addClass(this.btnAdvSettings, 'hide');
                          html.removeClass(this.fieldsPage, 'hide');
                          html.removeClass(this.btnSaveFields, 'hide');
                          html.removeClass(this.btnCancelFields, 'hide');
                          this.currentLayer = rowData.id;
                      }
                  }
              }
          },
          saveFields: function () {
              var data = this.layerFieldsTable.getData();
              var fields = [];
              var field;
              array.forEach(data, function (row) {
                  if (row.isAppended === true) {
                      field = {};
                      field.fieldName = row.fieldName;
                      field.label = row.label;
                      fields.push(field);
                  }
              }, this);

              this.selectedFields[this.currentLayer] = fields;
              html.removeClass(this.mainPage, 'hide');
              html.addClass(this.fieldsPage, 'hide');
              html.addClass(this.btnSaveFields, 'hide');
              html.addClass(this.btnCancelFields, 'hide');
              html.removeClass(this.btnAdvSettings, 'hide');
          },
          cancelFields: function () {
              html.removeClass(this.mainPage, 'hide');
              html.addClass(this.fieldsPage, 'hide');
              html.addClass(this.btnSaveFields, 'hide');
              html.addClass(this.btnCancelFields, 'hide');
              html.removeClass(this.btnAdvSettings, 'hide');

          },
          cancelAdv: function () {
              html.removeClass(this.mainPage, 'hide');
              html.addClass(this.advSettingsPage, 'hide');
             html.addClass(this.btnSaveAdv, 'hide');
              html.addClass(this.btnCancelAdv, 'hide');
             html.removeClass(this.btnAdvSettings, 'hide');
          },
          saveAdv: function () {
              html.removeClass(this.mainPage, 'hide');
              html.addClass(this.advSettingsPage, 'hide');
             html.addClass(this.btnSaveAdv, 'hide');
              html.addClass(this.btnCancelAdv, 'hide');
             html.removeClass(this.btnAdvSettings, 'hide');
              this.config.labelColor = this.advSettingsLabelColor.get("value");
              console.log(this.config.labelColor);

          },
          showAdvSettings: function () {

              this.advSettingsLabelColor.set("value", this.config.labelColor);

              html.addClass(this.mainPage, 'hide');
              html.removeClass(this.advSettingsPage, 'hide');
              html.removeClass(this.btnSaveAdv, 'hide');
              html.removeClass(this.btnCancelAdv, 'hide');
              html.addClass(this.btnAdvSettings, 'hide');
          },
          showOKError: function () {
              this.btnErrorMsg.innerHTML = this.nls.errorOnOk;
              html.removeClass(this.btnErrorMsg, 'hide');

          },
          hideOkError: function () {

              html.addClass(this.btnErrorMsg, 'hide');

          }
      });
  });