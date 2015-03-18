'use strict';
var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils');
var inherits = require('inherits');

var margin = {
    top: 30,
    right: 20,
    bottom: 20,
    left: 45
};

var nestedExtent = function(data, map) {
    var max = d3.max(data, function(arr) {
        return d3.max(_.map(arr, map));
    });
    var min = d3.min(data, function(arr) {
        return d3.min(_.map(arr, map));
    });

    return [min, max];
};


var LineStreaming = function(selector, data, images, opts) {

    if(!opts) {
        opts = {
            maxTick: 300
        };
    }

    this.opts = opts;

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data);
    this.selector = selector;
    this._init();

    // code for testing streaming functionality

    // var self = this

    // setInterval(function()  {

    //     var random = d3.random.normal(0, .2)
    //     var newdata = {
    //         series: [[random(),random(),random(),random()], [random(),random(),random(),random()],
    // [random(),random(),random(),random()], [random(),random(),random(),random()]]}
    //     self.appendData(newdata)

    // }, 500)

};


LineStreaming.prototype._init = function() {

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

    var defaultSize = 6;

    this.size = data.size ? data.size : _.fill(_.range(series.length), defaultSize)

    var yDomain = nestedExtent(series.map(function(d) {return d.d}), function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(series.map(function(d) {return d.d}), function(d) {
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
        .x(function (d, i) {
            return self.x(d.x);
        })
        .y(function (d, i) {
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

    var clipId = utils.getUniqueId();
    var clip = svg.append('svg:clipPath')
        .attr('id', clipId)
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    var chartBody = svg.append('g')
        .attr('clip-path', 'url(#' + clipId + ')');

    var toggleOpacity = 0;

    if(_.has(this.data, 'xaxis')) {
        var txt = this.data.xaxis;
        if(_.isArray(txt)) {
            txt = txt[0];
        }
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .text(txt);
    }
    if(_.has(this.data, 'yaxis')) {
        var txt = this.data.yaxis;
        if(_.isArray(txt)) {
            txt = txt[0];
        }

        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", - height / 2)
            .attr("y", -40)
            .text(txt);
    }


    var path = chartBody.selectAll('.line')
        .data(series)
        .enter()
        .append('path')
        .attr('class', 'line')
        .attr('stroke', function(d) {return d.c})
        .style('stroke-width', function(d) {return d.s ? d.s : defaultSize})
        .style('stroke-opacity', 0.9)
        .attr('d', function(d) { return self.line(d.d)})

    function updateAxis() {

        self.svg.select('.x.axis').transition().duration(500).ease('linear').call(self.xAxis);
        self.svg.select('.y.axis').transition().duration(500).ease('linear').call(self.yAxis);
        self.svg.select('.x.grid')
            .transition().duration(500).ease('linear')
            .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));
        self.svg.select('.y.grid')
            .transition().duration(500).ease('linear')
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
    this.svg = svg;
    this.zoomed = zoomed;
    this.updateAxis = updateAxis;
    this.series = series;
    this.path = path;
    this.defaultSize = defaultSize;
    this.xTick = xDomain[1] + 1

}

LineStreaming.prototype._formatData = function(data) {

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

    if (data.keys) {
        var keys = data.keys
    } else {
        var keys = _.range(0, data.series.length)
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
        var d = {'d': line, 'i': keys[i]}
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        return d
    })

    return data;
};

LineStreaming.prototype.appendData = function(data) {

    var self = this
    var path = this.path
    var series = this.series
    var maxTick = this.opts.maxTick
    var xTick = this.xTick

    var newlength = data.series[0].length
    data.index = _.range(0, newlength).map( function(d) {return d + xTick})
    data.size = this.size

    var newdat = self._formatData(data).series

    this.xTick = xTick + newlength
    var shift = 0


    _.forEach(newdat, function(d, i) {
        var match = _.findIndex(series, function(s) {return s.i == d.i})
        if (match > -1) {
            _.forEach(d.d, function (e) {
                series[match].d.push(e)
                if (series[match].d.length > maxTick) {
                    shift++;
                }
                if (series[match].d.length > maxTick+newlength) {
                    series[match].d.shift()
                }
            })
        } else {
            console.log("we got here")
            series.push(d)
        }
    })

    var yDomain = nestedExtent(series.map(function(d) {return d.d}), function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(series.map(function(d) {return d.d}), function(d) {
        return d.x;
    });
    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;

    var newdat = path.data(series)

    var self = this;
    
    if(shift) {
        self.x.domain(self.savedXDomain);
        self.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);
        self.zoom.x(self.x).y(self.y);

        newdat
            .attr("d", function(d) { return self.line(d.d)})
            .transition()
            .duration(500)
            .ease("linear")
            .attr("transform", "translate(" + self.x(Math.min(0, maxTick - self.xTick)) + ")");
        

        self.x.domain([Math.max(xTick - maxTick, xDomain[0]), xTick]);
        self.updateAxis();
    } else {

        self.x.domain([Math.max(xTick - maxTick, xDomain[0]), xTick]);
        self.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);
        self.zoom.x(self.x).y(self.y);
        self.updateAxis();
        newdat
            .transition()
            .duration(500)
            .ease("linear")
            .attr("d", function(d) { return self.line(d.d)})

        self.savedXDomain = [Math.max(xTick - maxTick, xDomain[0]), xTick];
    }



    newdat
        .enter()
        .append('path')
        .attr('class', 'line')
        .attr('stroke', function(d) {return d.c})
        .style('stroke-width', function(d) {return d.s ? d.s : self.defaultSize})
        .style('stroke-opacity', 0.9)
        .attr('d', function(d) { return self.line(d.d)})
        .attr("d", function(d) { return self.line(d.d)})
    .transition()
        .duration(500)
        .ease("linear")

    this.path = newdat

};


module.exports = LineStreaming;

