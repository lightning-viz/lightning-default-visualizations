var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils');
var simplify = require('simplify-js');
 
var margin = {
    top: 40,
    right: 10,
    bottom: 20,
    left: 10
};
 
var maxHeight = 600;
 
 
var LineStackedGraph = function(selector, data, images, opts) {
 
    var colors = utils.getColors(data.length);
 
    console.log('data.length: ' + data.length);
 
    if(_.isArray(data[0])) {
        data = _.map(data, function(d) {
            if(_.isNumber(d[0])) {
                return _.map(d, function(datum, i) {
                    return {
                        x: i,
                        y: datum
                    };
                });
            }
            return d;
        });
    } else {
        data = [_.map(data, function(d, i) {
            if(_.isNumber(d)) {
                return {
                    x: i,
                    y: d
                };
            }
            return d;
        })];
    }
 
    var nestedExtent = function(arrays, map) {
        var max = d3.max(arrays, function(arr) {
            return d3.max(_.map(arr, map));
        });
        var min = d3.min(arrays, function(arr) {
            return d3.min(_.map(arr, map));
        });
 
        return [min, max];
    };
 
 
    var yDomain = nestedExtent(data, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data, function(d) {
        return d.x;
    });
 
 
    var xSpread = Math.abs(xDomain[0] - xDomain[1]);
    var ySpread = Math.abs(yDomain[0] - yDomain[1]);

    var simpleData = _.map(data, function(d) {
        return simplify(d, 0.1);
    });
 
    var chartWidth = $(selector).width();
 
 
    // do everything for the minimap
    var minimapWidth = 0.2 * chartWidth;
    var minimapLineHeight = 20;
    var minimapLinePadding = 5;
 
 
    var minimapX = d3.scale.linear()
                    .domain([xDomain[0] - xSpread * 0.05, xDomain[1] + xSpread * 0.05])
                    .range([0, minimapWidth]);
 
    var minimapY = d3.scale.linear()
                    .domain([yDomain[0] - ySpread * 0.05, yDomain[1] + ySpread * 0.05])
                    .range([minimapLineHeight, 0]);
 
    var minimapLine = d3.svg.line()
                        .x(function(d, i) {
                            return minimapX(d.x);
                        })
                        .y(function(d, i) {
                            return minimapY(d.y);
                        });
 
 
    var chartWidth = $(selector).width();
    var chartLineHeight = 100;
    var chartLinePadding = 20;
 
 
    var max = 0;
 
 
    var getChartData = function(dataObjArr) {

        return _.map(dataObjArr, function(dataObj, i) {

            dataObj.data =  _.map(dataObj.data, function(point) {
                var p = {
                    x: point.x
                };
 
                p.y = point.y + i * (chartLineHeight + chartLinePadding);
 
                return p;
            });

            return dataObj;
        });

    }
 
    var chartYHeight = Math.min((chartLineHeight+chartLinePadding) * data.length, maxHeight);
 
    var chartX = d3.scale.linear()
                    .domain([xDomain[0] - xSpread * 0.05, xDomain[1] + xSpread * 0.05])
                    .range([0, chartWidth]);
 
    var chartY = d3.scale.linear()
                    .domain([yDomain[0] - ySpread * 0.05, yDomain[1] + ySpread * 0.05])
                    .range([chartYHeight, 0]);
 
    var chartLine = d3.svg.line()
                        .x(function(d, i) {
                            return chartX(d.x);
                        })
                        .y(function(d, i) {
                            return chartY(d.y);
                        });
 
 
    var minimapDiv = d3.select(selector).append('div').attr('class', 'minimap');
 
    _.each(simpleData, function(d, i) {
 
        console.log('iter: ' + i);
 
        var minimapSvg = minimapDiv.append('div').attr('class', 'miniline-container')
            .style('width', minimapWidth + 'px')
            .append('svg')
            .attr('class', 'stacked-line-plot-minimap')
            .attr('width', minimapWidth)
            .attr('height', minimapLineHeight);
 
        var minimap = minimapSvg.append('g')
            .attr('class', 'minimap');
        
        minimap.append('svg:clipPath')
            .attr('id', 'minimapClip')
            .append('svg:rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', minimapWidth)
            .attr('height', (minimapLineHeight + minimapLinePadding) * data.length);
 
        var chartBody = minimap.append('g')
            .attr('clip-path', 'url(#minimapClip)');
 
        chartBody.append('path')
            .datum(d)
            .attr('class', 'line')
            .attr('d', minimapLine)
            .style('stroke', colors[i]);
 
    });
 
    $(selector).find('.miniline-container').click(function() {
        $(this).toggleClass('active');
        updateChart();
    });
 

    var panExtent = {x: [xDomain[0], xDomain[1]], y: [-Infinity,Infinity] };

    var zoom = d3.behavior.zoom()
        .x(chartX)
        .on('zoom', zoomed);


    var chartDiv = d3.select(selector).append('div').attr('class', 'chart');
 
    var chartSvg = chartDiv.append('svg')
        .attr('class', 'stacked-line-plot')
        .attr('width', chartWidth)
        .attr('height', chartYHeight)
        .call(zoom);
 
    var chart = chartSvg.append('g')
        .attr('class', 'chart');
 
    chart.append('svg:clipPath')
        .attr('id', 'chartClip')
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', (chartLineHeight + chartLinePadding) * data.length);
 
 
    chartBody = chart.append('g')
        .attr('clip-path', 'url(#chartClip)');


    var updateChart = function() {
 
        var tempData = [];
        $('.miniline-container').each(function(i) {
            if($(this).hasClass('active')) {
                tempData.push({
                    data: data[i],
                    index: i
                });
            }
        });
 
        tempData = getChartData(tempData);

        var lineContainer = chartBody.selectAll('.line')
                            .data(tempData, function(d) {
                                return d.index;
                            });

        lineContainer
            .enter().append('g')
            .append('path')
            .attr('class', 'line')
            .attr('d', function(d) {
                return chartLine(d.data);
            })
            .attr('index', function(d) {
                return d.index;
            })
            .style('stroke', function(d, i) {
                console.log(d.index);
                return colors[d.index];
            });


        console.log(lineContainer.exit());

        lineContainer.exit().remove();

        chart.selectAll('.line')
            .transition()
            .duration(750)
            .attr('d', function(d) {
                return chartLine(d.data);
            });   
    }

    var lastS, lastT = [0, 0];
    function zoomed() {


        var t = d3.event.translate;
        var s = d3.event.scale;

        if(s === lastS) {

            // get dominant translation direction
            var threshold = 7;
            if(Math.abs(Math.abs(t[0] - lastT[0]) - Math.abs(t[1] - lastT[1])) > threshold) {
                if(Math.abs(t[0] - lastT[0]) > Math.abs(t[1] - lastT[1])) {
                    t[1] = lastT[1];
                } else {
                    t[0] = lastT[0];
                }
            } else {
                return;
            }

            zoom.translate(t);

            chartY = chartY
                .range([chartYHeight, 0 + t[1]]);

            chart.selectAll('.line')
                // .transition()
                // .duration(200)
                .attr('d', function(d) {
                    return chartLine(d.data);
                });
        } else {

            chart.selectAll('.line')
                .attr('d', function(d) {
                    return chartLine(d.data);
                });
        }

        lastS = s;
        lastT = t;
    }
};
 
module.exports = LineStackedGraph;
 
 
 
LineStackedGraph.prototype.updateData = function(data) {
    this.svg.select('.line')
        .datum(data)
        .transition()
        .attr('d', this.line);
};