var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var inherits = require('inherits');
var utils = require('lightning-client-utils');
var _ = require('lodash');
var TooltipPlugin = require('d3-tip');
TooltipPlugin(d3);


var margin = {
    top: 0,
    right: 0,
    bottom: 20,
    left: 45
};


var Scatter = function(selector, data, images, opts) {

    var defaults = {
        tooltips: false
    };

    opts = _.defaults(opts || {}, defaults);

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

inherits(Scatter, require('events').EventEmitter);

module.exports = Scatter;

Scatter.prototype._init = function() {

    var tip;
    if(this.opts.tooltips) {
        var format = d3.format('.02f');
        tip = d3.tip()
            .attr('class', 'd3-tip')
            .html(function(d) {
                return 'x: ' + format(d.x) + '<br>' + 'y: ' + format(d.y);
            });
    }


    var data = this.data
    var height = this.height
    var width = this.width
    var opts = this.opts
    var selector = this.selector
    var self = this

    var points = data.points

    var xDomain = d3.extent(points, function(d) {
            return d.x;
        });
    var yDomain = d3.extent(points, function(d) {
            return d.y;
        });

    this.x = d3.scale.linear()
        .domain([xDomain[0] - 1, xDomain[1] + 1])
        .range([0, width]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - 1, yDomain[1] + 1])
        .range([height, 0]);

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


    svg.append('svg:clipPath')
        .attr('id', 'clip')
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    var chartBody = svg.append('g')
        .attr('clip-path', 'url(#clip)');



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
    
    this.brighten = brighten;
    this.darken = darken;
    this.svg = svg;
    this.points = points;

}

Scatter.prototype._formatData = function(data) {

    retColor = utils.getColorFromData(data)
    retSize = data.size || []
    retAlpha = data.alpha || []

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

Scatter.prototype.updateData = function(data) {
    
    // update existing points, add new ones
    // and delete old ones
   
    self = this
    var x = this.x
    var y = this.y

    var newdat = this.svg.selectAll('circle')
        .data(this._formatData(data).points)
        
    newdat.transition().ease('linear')
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s ? d.s : self.defaultSize)})
        .attr('transform', function(d) {
            return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})

    newdat.enter()
        .append('circle')
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
        .style('opacity', 0.0)
        .attr('class','dot')
        .attr('r', function(d) { return (d.s ? d.s : self.defaultSize)})
        .attr('transform', function(d) {return 'translate(' + x(d.x) + ',' + y(d.y) + ')';})
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity', function(d) { return (d.a ? d.a : self.defaultOpacity)})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
      .transition().ease('linear')
        .duration(300)
        .style('opacity', 1.0)
        
    newdat.exit().transition().ease('linear')
        .style('opacity', 0.0).remove()
    
};

Scatter.prototype.appendData = function(data) {
    
    // add new points to existing points
   
    this.points = this.points.concat(this._formatData(data).points)
    points = this.points

    self = this
    var x = this.x
    var y = this.y
    
    this.svg.selectAll('circle')
        .data(points)
      .enter().append('circle')
        .style('opacity', 0.0)
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s ? d.s : self.defaultSize)})
        .attr('transform', function(d) {return 'translate(' + x(d.x) + ',' + y(d.y) + ')';})
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity', function(d) { return (d.a ? d.a : self.defaultOpacity)})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
      .transition()
        .ease('linear')
        .duration(300)
        .style('opacity', 1.0)
};