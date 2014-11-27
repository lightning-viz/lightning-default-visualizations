var d3 = require('d3');

var ScatterPlot = require('../viz/scatter');
var inherits = require('inherits');
var utils = require('lightning-client-utils');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};

var ScatterStreaming = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data)
    this.selector = selector;
    this.defaultFill = '#deebfa'
    this.defaultStroke = '#68a1e5'
    this._init();

};

inherits(ScatterStreaming, ScatterPlot);

ScatterStreaming.prototype.appendData = function(data) {

    newpoints = this._formatData(data)
    this.points = this.points.concat(newpoints)
    
    var x = this.x
    var y = this.y
    
    newdat = this.svg.selectAll('circle').data(this.points)
    
    newdat.enter().append('circle')
        .transition()
        .ease('linear')
        .style('opacity', 1.0)
        .attr('class', 'dot')
        .attr('r',6)
        .attr('fill','black')
        .attr('transform', function(d) {
            return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c == null ? this.defaultFill : d.c);})
        .style('stroke',function(d) { return (d.c == null ? this.defaultStroke : d.c.darker(0.75));})

    newdat.style('opacity', 0.0)

    this.points = newpoints
};

module.exports = ScatterPlot;
