'use strict';
var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils');

var margin = {
    top: 30,
    right: 20,
    bottom: 20,
    left: 45
};


var nestedExtent = function(arrays, map) {
    var max = d3.max(arrays, function(arr) {
        return d3.max(_.map(arr, map));
    });
    var min = d3.min(arrays, function(arr) {
        return d3.min(_.map(arr, map));
    });

    return [min, max];
};


var LineGraph = function(selector, data, images, opts) {

    var self = this;

    if(!opts) {
        opts = {};
    }

    var width = (opts.width || $(selector).width()) - margin.left - margin.right;
    var height = (opts.height || (width * 0.6)) - margin.top - margin.bottom;

    data = this._formatData(data);


    var yDomain = nestedExtent(data, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data, function(d) {
        return d.x;
    });

    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    var noZoom = d3.scale.linear();

    this.x = d3.scale.linear()
        .domain([xDomain[0] - 0.05 * xSpread, xDomain[1] - 1 + 0.05 * xSpread])
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
        });


    var yToggle;
    if(opts.zoomAxes) {
        this.zoom = d3.behavior.zoom();
        if(opts.zoomAxes.indexOf('x') > -1) {
            this.zoom.x(this.x);
        } 
        if(opts.zoomAxes.indexOf('y') > -1) {
            this.zoom.y(this.y);
            yToggle = true;
        } else {
            yToggle = false;
        }

        this.zoom.on('zoom', zoomed);

    } else {
        yToggle = true;
        this.zoom = d3.behavior.zoom()
            .x(this.x)
            .y(this.y)
            .on('zoom', zoomed);
    }

    var svg = d3.select(selector)
        .append('svg:svg')
        .attr('class', 'line-plot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom);

    svg.append('svg:rect')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'plot');


    d3.select('body').on('keydown', function() {
        console.log('keydown');
        if(d3.event.shiftKey) {
            console.log('shift');
            if(yToggle) {
                yToggle = false;
                self.zoom.y(noZoom);
            } else {
                yToggle = true;
                self.zoom.y(self.y);
            }
        }
    });

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



    var colors = utils.getColors(data.length);
    _.each(data, function(d, i) {
        chartBody.append('path')
            .datum(d)
            .attr('class', 'line')
            .attr('stroke', colors[i])
            .attr('d', self.line);
    });


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
            .attr('d', self.line);
    }


    this.svg = svg;
    this.zoomed = zoomed;
    this.updateAxis = updateAxis;
    this.data = data;
};


LineGraph.prototype._formatData = function(data) {

    data = data || [];


    // Data can be:
    //
    // Array of points
    // e.g.
    // [{x: 1, y: 2}, {x: 2, y: 3}]
    //
    // or an array of timeseries values
    // e.g
    // [1, 2, 3, 5, 6, 3]
    //
    //
    // or an array of either of these

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

    return data;
}


module.exports = LineGraph;


LineGraph.prototype.updateData = function(data) {

    this.data = this._formatData(data);
    data = this.data;

    var yDomain = nestedExtent(data, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data, function(d) {
        return d.x;
    });
    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    this.x.domain([xDomain[0] - 0.05 * xSpread, xDomain[1] - 1 + 0.05 * xSpread]);
    this.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);

    this.updateAxis();

    this.svg.select('.line')
        .datum(data)
        .transition()
        .attr('d', this.line);
};


LineGraph.prototype.appendData = function(data) {
    
    this.data = this.data.concat(this._formatData(data));
    data = this.data;

    var yDomain = nestedExtent(data, function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data, function(d) {
        return d.x;
    });
    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    this.x.domain([xDomain[0] - 0.05 * xSpread, xDomain[1] - 1 + 0.05 * xSpread]);
    this.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);

    this.updateAxis();

    this.svg.select('.line')
        .datum(data)
        .transition()
        .attr('d', this.line);
};
