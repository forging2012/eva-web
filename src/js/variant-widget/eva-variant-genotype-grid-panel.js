/*
 * Copyright (c) 2014 Francisco Salavert (SGL-CIPF)
 * Copyright (c) 2014 Alejandro Alemán (SGL-CIPF)
 * Copyright (c) 2014 Ignacio Medina (EBI-EMBL)
 *
 * This file is part of JSorolla.
 *
 * JSorolla is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * JSorolla is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with JSorolla. If not, see <http://www.gnu.org/licenses/>.
 */
function EvaVariantGenotypeGridPanel(args) {
    _.extend(this, Backbone.Events);
    this.id = Utils.genId("VariantGenotypeGrid");
    this.autoRender = true;
    this.storeConfig = {};
    this.gridConfig = {};
    this.height = 200;
    this.target;
    this.columns = [
        {
            text: "Sample",
            dataIndex: "sample",
            flex: 1
        },
        {
            text: "Genotype",
            dataIndex: "genotype",
            flex: 1
        },
        {
            text: "Sex",
            dataIndex: "sex",
            flex: 1
        },
        {
            text: "Phenotype",
            dataIndex: "phenotype",
            flex: 1
        }
    ];

    _.extend(this, args);

    this.on(this.handlers);

    this.rendered = false;

    if (this.autoRender) {
        this.render(this.targetId);
    }
}

EvaVariantGenotypeGridPanel.prototype = {
    render: function () {
        var _this = this;

        //HTML skel
        this.div = document.createElement('div');
        this.div.setAttribute('id', this.id);

        this.panel = this._createPanel();

    },
    draw: function () {
        this.targetDiv = (this.target instanceof HTMLElement ) ? this.target : document.querySelector('#' + this.target);
        if (!this.targetDiv) {
            console.log('target not found');
            return;
        }
        this.targetDiv.appendChild(this.div);
        this.panel.render(this.div);
    },
    clear: function () {
        this.studiesContainer.removeAll(true);
    },
    load: function (data, params) {
        var _this = this;
        this.clear();
        var panels = [];
        var genotypeData = [];
        var genotypeChartData = [];
        for (var key in data) {
            var study = data[key];
            if (Object.keys(study.samplesData).length > 0) {
                Ext.getCmp('genotypeTitle').update('<h4>Genotypes <img class="title-header-icon" data-qtip="Genotype data for the selected variant split by study." style="margin-bottom:2px;" src="img/icon-info.png"/></h4>')
                var genotypePanel = this._createGenotypePanel(study, params);
                genotypeChartData.push(genotypePanel.chartData)
                panels.push(genotypePanel);
            }
        }

        if (_.isEmpty(panels)) {
            Ext.getCmp('genotypeTitle').update('<h4>Genotypes <img class="title-header-icon" data-qtip="Genotype data for the selected variant split by study." style="margin-bottom:2px;" src="img/icon-info.png"/></h4><p style="margin-left:-15px;" class="genotype-grid-no-data">No Genotypes data available</p>')
        }
        this.clear();
        this.studiesContainer.add(panels);

        _.each(_.keys(genotypeChartData), function (key) {
            _this._drawChart(this[key]);
        }, genotypeChartData);
    },
    _createPanel: function () {
        this.studiesContainer = Ext.create('Ext.container.Container', {
            layout: {
                type: 'accordion',
                titleCollapse: true,
                multi: true
            }
        });

        this.panel = Ext.create('Ext.container.Container', {
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            overflowY: true,
            padding: 0,
            items: [
                {
                    xtype: 'box',
                    id: 'genotypeTitle',
                    cls: 'ocb-header-4',
                    html: '<h4>Genotypes <img class="title-header-icon" data-qtip="Genotype data for the selected variant split by study." style="margin-bottom:2px;" src="img/icon-info.png"/></h4>',
                    margin: '5 0 10 10'
                },
                this.studiesContainer
            ],
            height: this.height,
            margin: '5 0 10 10'
        });
        return this.panel;
    },
    _createGenotypePanel: function (data, params) {
        var study_title;
        var projectList = '';
        EvaManager.get({
            category: 'meta/studies',
            resource: 'list',
            params: {species: params.species},
            async: false,
            success: function (response) {
                try {
                    projectList = response.response[0].result;
                } catch (e) {
                    console.log(e);
                }
            }
        });

        if (projectList) {
            for (var i = 0; i < projectList.length; i++) {
                if (projectList[i].studyId === data.studyId) {
                    study_title = '<a href="?eva-study=' + projectList[i].studyId + '" target="_blank">' + projectList[i].studyName + '</a> (' + projectList[i].studyId + ')';
                }
            }
        } else {
            study_title = '<a href="?eva-study=' + data.studyId + '" target="_blank">' + data.studyId + '</a>';
        }
        var samples = data.samplesData;
        var finalData = [];
        var chartData = []
        for (var key in samples) {
            var s = samples[key];

            if (s.GT.match(/-1\/-1/)) {
                s.GT = './.';
            }
            chartData.push({value: s.GT});
            finalData.push({
                sample: key,
                genotype: s.GT
            });
        }

        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'sample'},
                {name: 'genotype'}
            ],
            data: finalData,
            sorters: [
                {
                    property: 'sample',
                    direction: 'ASC'
                }
            ]
        });

        var genotypeColumns = {
            items: [
                {
                    text: 'Sample',
                    flex: 1.6,
                    dataIndex: 'sample'
                },
                {
                    text: 'Genotype',
                    flex: 1,
                    dataIndex: 'genotype'
                }
            ],
            defaults: {
                align: 'left',
                sortable: true
            }
        };

        var grid = Ext.create('Ext.grid.Panel', {
            flex: 1,
            store: store,
            loadMask: true,
            overflowY: true,
            height: 300,
            cls: 'genotype-grid',
            margin: 20,
            columns: genotypeColumns
        });

        var divID = Utils.genId("genotype-grid-") + data.studyId;
        var tpl = new Ext.XTemplate(['<div id="' + divID + '">Chart</div>']);
        var view = Ext.create('Ext.view.View', {
            tpl: tpl,
            margin: '20 0 0 0'
        });

        var tempGenotypeCount = _.groupBy(chartData, 'value');
        var genotypeCountArray = [];

        _.each(_.keys(tempGenotypeCount), function (key) {
            var obj = {};
            obj[key] = this[key].length;
            genotypeCountArray.push([key, this[key].length]);
        }, tempGenotypeCount);

        var chartData = {id: divID, data: genotypeCountArray, title: 'Genotype Count'}

        var panel = Ext.create('Ext.panel.Panel', {
            header: {
                titlePosition: 1
            },
            title: '<span class="genotype-grid-study-title">' + study_title + '</span>',
            border: false,
            layout: {
                type: 'hbox',
                align: 'fit'
            },
            items: [
                {
                    xtype: 'panel',
                    flex: 1.5,
                    border: false,
                    items: [grid]
                },
                {
                    xtype: 'panel',
                    flex: 1,
                    border: false,
                    height: 300,
                    items: [view]
                }
            ]
        });

        _.extend(panel, {chartData: chartData});

        return  panel;

    },
    _getGenotypeCount: function (gc) {
        var res = [];
        for (var key in gc) {
            res.push({
                genotype: key,
                count: gc[key]
            })
        }
        return res;
    },
    _drawChart: function (data) {
        var _this = this;
        var height = 290;
        var width = 250;
        var id = '#' + data.id;
        var render_id = document.querySelector(id)
        var dataArray = data.data;
        var title = data.title;
        $(function () {
            Highcharts.setOptions({
                colors: ['#207A7A', '#2BA32B', '#2E4988', '#54BDBD', '#5DD15D', '#6380C4', '#70BDBD', '#7CD17C', '#7D92C4', '#295C5C', '#377A37', '#344366', '#0A4F4F', '#0E6A0E', '#0F2559' ],
                chart: {
                    style: {
                        fontFamily: 'sans-serif;'
                    }
                }
            });
            $(render_id).highcharts({
                chart: {
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false,
                    height: height
                },
                legend: {
                    enabled: true,
                    margin: 0,
                    labelFormatter: function () {
                        return '<div>' + this.name + '(' + this.y + ')</div>';
                    },
                    layout: 'horizontal',
                    useHTML: true,
                    align: 'center'
                },
                title: {
                    text: title,
                    style: {},
                    align: 'center'
                },
                tooltip: {
                    pointFormat: '<b>{point.y}</b>'
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: false
                        },
                        showInLegend: true
                    }
                },
                series: [
                    {
                        type: 'pie',
                        name: 'Studies by ' + title,
                        data: dataArray
                    }
                ],
                credits: {
                    enabled: false
                }
            });

        });

    }
};