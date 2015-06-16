'use strict';
var d3 = require('d3');
var inherits = require('inherits');
var utils = require('lightning-client-utils');
var _ = require('lodash');

var ScatterStreaming = function(selector, data, images, opts) {

    var margin = {
        top: 0,
        right: 0,
        bottom: 20,
        left: 45
    };
    if(!opts) {
        opts = {};
    }

    this.opts = opts

    this.data = this._formatData(data)

    if(_.has(this.data, 'xaxis')) {
        margin.bottom = 57;
    }
    if(_.has(this.data, 'yaxis')) {
        margin.left = 70;
    }

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = Math.min(($(selector).height() || Infinity), (opts.height || (this.width * 0.6))) - margin.top - margin.bottom;


    this.selector = selector;
    this.defaultFill = '#deebfa'
    this.defaultStroke = '#68a1e5'
    this.defaultSize = 8
    this.defaultAlpha = 0.9
    this.margin = margin
    this._init();

};

inherits(ScatterStreaming, require('events').EventEmitter);

ScatterStreaming.prototype._init = function() {

    var data = this.data
    var height = this.height
    var width = this.width
    var opts = this.opts
    var selector = this.selector
    var margin = this.margin
    var self = this

    var points = data.points

    var xDomain = d3.extent(points, function(d) {
            return d.x;
        });
    var yDomain = d3.extent(points, function(d) {
            return d.y;
        });

    var sizeMax = d3.max(points, function(d) {
            return d.s;
        });

    if (sizeMax) {
        var padding = sizeMax / 2
    } else {
        var padding = self.defaultSize / 2
    }

    var xRange = xDomain[1] - xDomain[0]
    var yRange = yDomain[1] - yDomain[0]

    this.x = d3.scale.linear()
        .domain([xDomain[0] - xRange * 0.1, xDomain[1] + xRange * 0.1])
        .range([0 + padding, width - padding]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - yRange * 0.1, yDomain[1] + yRange * 0.1])
        .range([height - padding , 0 + padding]);

    var zoom = d3.behavior.zoom()
        .x(this.x)
        .y(this.y)
        .on('zoom', zoomed);

    var svg = d3.select(selector)
        .append('svg')
        .attr('class', 'scatter-plot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoom);

    if(this.opts.tooltips) {
        svg.call(tip);
    }

    svg.append('rect')
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
        .scale(self.x)
        .orient('bottom')
        .ticks(5);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(self.xAxis);

    this.yAxis = d3.svg.axis()
        .scale(self.y)
        .orient('left')
        .ticks(5);

    svg.append('g')
        .attr('class', 'y axis')
        .call(self.yAxis);

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
    svg.append('svg:clipPath')
        .attr('id', clipId)
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    var chartBody = svg.append('g')
        .attr('clip-path', 'url(#' + clipId + ')');

    function darken(d, i) {
        if(self.opts.tooltips) {
            tip.show(d, i);
        }
        var point = d3.select(this)
        var newcolor = d3.hsl(point.style('fill')).darker(0.5)
        point.style('fill', d3.rgb(newcolor))
        self.emit('hover', d);
        console.log('in: ' + i);
    }

    function brighten(d, i) {
        if(self.opts.tooltips) {
            tip.hide(d, i);
        }
        var point = d3.select(this)
        var newcolor = d3.hsl(point.style('fill')).brighter(0.5)
        point.style('fill', d3.rgb(newcolor))
        console.log('out: ' + i);
    }

    chartBody.selectAll('.dot')
        .data(points)
      .enter().append('circle')
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s ? d.s: self.defaultSize)})
        .attr('transform', function(d) {
            return 'translate(' + self.x(d.x) + ',' + self.y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
        .on('mouseover', darken)
        .on('mouseout', brighten);

    function zoomed() {
        svg.select('.x.axis').call(self.xAxis);
        svg.select('.y.axis').call(self.yAxis);
        svg.select('.x.grid')
            .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));
        svg.select('.y.grid')
            .call(makeYAxis()
                    .tickSize(-width, 0, 0)
                    .tickFormat(''));

        svg.selectAll('circle')
            .attr('transform', function(d) {
                return 'translate(' + self.x(d.x) + ',' + self.y(d.y) + ')';
            });
    }

    if(_.has(this.data, 'xaxis')) {
        var txt = this.data.xaxis;
        if(_.isArray(txt)) {
            txt = txt[0];
        }
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
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
            .attr("y", -50)
            .text(txt);
    }
    
    this.brighten = brighten;
    this.darken = darken;
    this.svg = svg;
    this.points = points;


}

ScatterStreaming.prototype._formatData = function(data) {

    var retColor = utils.getColorFromData(data)
    var retSize = data.size || []
    var retAlpha = data.alpha || []

    data.points = data.points.map(function(d, i) {
        d.x = d[0]
        d.y = d[1]
        d.i = i
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        d.a = retAlpha.length > 1 ? retAlpha[i] : retAlpha[0]
        return d
    })

    return data

};

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
