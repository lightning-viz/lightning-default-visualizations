'use strict';
var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils');
var Line = require('../viz/line');
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
        opts = {};
    }

    this.opts = opts;

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data);
    this.selector = selector;
    this._init();
};


inherits(LineStreaming, Line);


LineStreaming.prototype.appendData = function(data) {


    var newData = this._formatData(data);
    var self = this;

    _.each(newData.series, function(d, i) {

        if(i < self.data.series.length) {
            var l = self.data.series[i].d.length;
            _.each(d.d, function(point) {
                point.x += l;
            });

            self.data.series[i].d = self.data.series[i].d.concat(d.d);
        }
    });
    
    data = this.data;

    var yDomain = nestedExtent(data.series.map(function(d) {return d.d}), function(d) {
        return d.y;
    });
    var xDomain = nestedExtent(data.series.map(function(d) {return d.d}), function(d) {
        return d.x;
    });
    
    var ySpread = Math.abs(yDomain[1] - yDomain[0]) || 1;
    var xSpread = Math.abs(xDomain[1] - xDomain[0]) || 1;

    this.x.domain([xDomain[0] - 0.05 * xSpread, xDomain[1] + 0.05 * xSpread]);
    this.y.domain([yDomain[0] - 0.1 * ySpread, yDomain[1] + 0.1 * ySpread]);
    this.zoom.x(this.x).y(this.y);
    this.updateAxis();
    
    var newdat = this.svg.selectAll('.line')
        .data(data.series)
        
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


module.exports = LineStreaming;

