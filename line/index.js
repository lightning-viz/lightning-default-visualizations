'use strict';
var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var _ = require('lodash');
var utils = require('lightning-client-utils');
var TooltipPlugin = require('d3-tip');
TooltipPlugin(d3);



var margin = {
    top: 30,
    right: 20,
    bottom: 20,
    left: 45
};


var nestedExtent = function(data, map) {
    var arrays = data.map(function(d) {return d.d})
    var max = d3.max(arrays, function(arr) {
        return d3.max(_.map(arr, map));
    });
    var min = d3.min(arrays, function(arr) {
        return d3.min(_.map(arr, map));
    });

    return [min, max];
};


var Line = function(selector, data, images, opts) {

    var defaults = {
        tooltips: false
    };

    opts = _.defaults(opts || {}, defaults);
    this.opts = opts;

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data);
    this.selector = selector;
    this._init();
};


Line.prototype._init = function() {

    var data = this.data;
    var height = this.height;
    var width = this.width;
    var opts = this.opts;
    var selector = this.selector;
    var self = this;

    var series = data.series;

    var tip;

    if(this.opts.tooltips) {
        var format = d3.format('.02f');
        tip = d3.tip()
            .attr('class', 'd3-tip')
            .html(function(d, i) {
                return 'Series: ' + d.i;
            });
    }


    var defaultSize = Math.max(10 - 0.1 * series[0].d.length, 3);

    var yDomain = nestedExtent(series, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(series, function(d) {
        return d.x;
    });

    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    this.x = d3.scale.linear()
        .domain([xDomain[0] - 0.05 * xSpread, xDomain[1] + 0.05 * xSpread])
        .range([0, width]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread])
        .range([height, 0]);

    this.line = d3.svg.line()
        .x(function (d) {
            return self.x(d.x);
        })
        .y(function (d) {
            return self.y(d.y);
        })

    this.zoom = d3.behavior.zoom()
        .x(this.x)
        .y(this.y)
        .on('zoom', zoomed);

    var svg = d3.select(selector)
        .append('svg:svg')
        .attr('class', 'line-plot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom)

    if(this.opts.tooltips) {
        svg.call(tip);
    }

    svg.append('svg:rect')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'plot');


    var makeXAxis = function () {
        return d3.svg.axis()
            .scale(self.x)
            .orient('bottom')
            .ticks(5);
    };

    var makeYAxis = function () {
        return d3.svg.axis()
            .scale(self.y)
            .orient('left')
            .ticks(5);
    };

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient('bottom')
        .ticks(5);

    svg.append('svg:g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(this.xAxis);

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient('left')
        .ticks(5);

    svg.append('g')
        .attr('class', 'y axis')
        .call(this.yAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));

    svg.append('g')
        .attr('class', 'y grid')
        .call(makeYAxis()
                .tickSize(-width, 0, 0)
                .tickFormat(''));

    var clip = svg.append('svg:clipPath')
        .attr('id', 'clip')
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    var chartBody = svg.append('g')
        .attr('clip-path', 'url(#clip)');

    var toggleOpacity = 0;

    function highlight(d, i) {

        if (toggleOpacity === 0) {
            //var d = d3.select(this)[0][0].__data__
            svg.selectAll('.line').transition().duration(100).ease('linear').delay(100).style("opacity", function (o, j) {
                return i == j ? 0.9 : 0.2;
            });
            toggleOpacity = 1;

            if(self.opts.tooltips) {
                tip.show(d, i);
            }
        } else {
            svg.selectAll('.line').transition().duration(100).ease('linear').style('opacity', 0.9)
            toggleOpacity = 0;
            if(self.opts.tooltips) {
                tip.hide(d, i);
            }
        }
    }

    var line = chartBody.selectAll('.line')
        .data(series)
        .enter()
        .append('path')
        .attr('class', 'line')
        .attr('stroke', function(d) {return d.c})
        .style('stroke-width', function(d) {return d.s ? d.s : defaultSize})
        .style('stroke-opacity', 0.9)
        .attr('d', function(d) { return self.line(d.d)})
        .on('mouseover', highlight)
        .on('mouseout', highlight)

    function updateAxis() {

        self.svg.select('.x.axis').call(self.xAxis);
        self.svg.select('.y.axis').call(self.yAxis);
        self.svg.select('.x.grid')
            .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));
        self.svg.select('.y.grid')
            .call(makeYAxis()
                    .tickSize(-width, 0, 0)
                    .tickFormat(''));
    }

    function zoomed() {

        updateAxis();
        self.svg.selectAll('.line')
            .attr('class', 'line')
            .attr('d', function(d) { return self.line(d.d)});
    }

    this.defaultSize = defaultSize;
    this.highlight = highlight;
    this.svg = svg;
    this.zoomed = zoomed;
    this.updateAxis = updateAxis;
    this.series = series;
};


Line.prototype._formatData = function(data) {

    // parse the array data
    if(_.isArray(data.series[0])) {
        // handle case of mutliple series
        data.series = _.map(data.series, function(d) {
            return _.map(d, function(datum, i) {
                return {
                    x: data.index ? data.index[i] : i,
                    y: datum
                };
            });
        });
    } else {
        // handle a single series
        data.series = [_.map(data.series, function(d, i) {
            return {
                x: data.index ? data.index[i] : i,
                y: d
            };
        })];
    }

    // parse colors and sizes, and automatically fill colors
    // with our random colors if none provided
    var retColor = utils.getColorFromData(data);
    if (retColor.length == 0) {
        retColor = utils.getColors(data.series.length)
    }
    var retSize = data.size || []

    // embed properties in data array
    data.series = data.series.map(function(line, i) {
        var d = {'d': line, 'i': i}
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        return d
    })

    return data;
};


module.exports = Line;


Line.prototype.updateData = function(data) {

    var self = this
    
    this.data = this._formatData(data);
    var series = this.data.series;

    var yDomain = nestedExtent(series, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(series, function(d) {
        return d.x;
    });
    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    this.x.domain([xDomain[0] - 0.05 * xSpread, xDomain[1] + 0.05 * xSpread]);
    this.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);
    this.zoom.x(this.x).y(this.y);
    this.updateAxis();
    
    var newdat = this.svg.selectAll('.line')
        .data(series)
        
    newdat.exit().transition().style('opacity', 0.0).remove()
    
    newdat
        .attr('class', 'line')
        .on('mouseover', self.highlight)
        .on('mouseout', self.highlight) 
        .transition()
        .attr('d', function(d) { return self.line(d.d)})   
        .attr('stroke', function(d) {return d.c})
        .style('stroke-width', function(d) {return d.s ? d.s : self.defaultSize})
        .style('stroke-opacity', 0.9)
         
    
    newdat.enter()
        .append('path')
        .attr('class', 'line') 
        .attr('d', function(d) { return self.line(d.d)})
        .attr('stroke', function(d) {return d.c})
        .style('stroke-width', function(d) {return d.s ? d.s : self.defaultSize})
        .style('stroke-opacity', 0.9)
        .on('mouseover', self.highlight)
        .on('mouseout', self.highlight) 
        .style('opacity', 0.0)
        .transition()
        .style('opacity', 1.0)
   
};


Line.prototype.appendData = function(data) {

    // add new lines to existing lines
    
    var self = this
    
    var toappend = this._formatData(data).series
    
    toappend = toappend.map(function (d) {
        d.i = d.i + self.series.length
        return d
    })

    this.series = this.series.concat(toappend)
    
    var series = this.series;  
    
    var newdat = this.svg.selectAll('.line')
        .data(series)

    newdat.enter()
        .append('path')
        .attr('class', 'line') 
        .attr('d', function(d) { return self.line(d.d)})
        .attr('stroke', function(d) {return d.c})
        .style('stroke-width', function(d) {return d.s ? d.s : self.defaultSize})
        .style('stroke-opacity', 0.9)
        .on('mouseover', self.highlight)
        .on('mouseout', self.highlight) 
        .style('opacity', 0.0)
        .transition()
        .style('opacity', 1.0)
};