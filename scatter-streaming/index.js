'use strict';
var d3 = require('d3');
var Scatter = require('../viz/scatter');
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
    this.defaultSize = 8
    this.defaultAlpha = 0.9
    this._init();

};

inherits(ScatterStreaming, Scatter);

ScatterStreaming.prototype.appendData = function(data) {
   
    var x = this.x
    var y = this.y
    var self = this
    
    var newpoints = this._formatData(data).points

    // use classes to handle vanishing points over multiple updates
    // order: current -> old -> older -> oldest -> gone

    // set class of existing points so they are one time step older
    // then they were when we started
    this.svg.selectAll('circle.oldest').classed('gone', true)
    this.svg.selectAll('circle.older').classed('oldest', true)
    this.svg.selectAll('circle.old').classed('older', true)
    this.svg.selectAll('circle:not(.older):not(.oldest):not(.gone)').classed('old', true)
    
    // fade out old points based on age
    this.svg.selectAll('circle.old').transition().style('opacity', 0.5)
    this.svg.selectAll('circle.older').transition().style('opacity', 0.25)
    this.svg.selectAll('circle.oldest').transition().style('opacity', 0.1)
    

    // add new points
    this.svg.selectAll('circle:not(.old):not(.older):not(.oldest):not(.gone)')
      .data(newpoints).enter()
        .append('circle')
        .style('opacity', 0.0)
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s == null ? self.defaultSize : d.s)})
        .attr('transform', function(d) {
           return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c == null ? self.defaultFill : d.c);})
        .style('stroke',function(d) { return (d.c == null ? self.defaultStroke : d.c.darker(0.75));})
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
      .transition().ease('linear')
        .style('opacity', 1.0)
    
    // transition and remove points
    this.svg.selectAll('circle.gone')
        .transition().ease('linear').duration(300)
        .style('opacity', 0.0)
        .remove()
  
};

module.exports = ScatterStreaming;
