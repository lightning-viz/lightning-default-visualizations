var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var inherits = require('inherits');
var utils = require('lightning-client-utils');
var _ = require('lodash');
var Color = require('color');
var TooltipPlugin = require('d3-tip');
TooltipPlugin(d3);


var Scatter = function(selector, data, images, opts) {
    var margin = {
        top: 0,
        right: 0,
        bottom: 20,
        left: 45
    };

    var defaults = {
        tooltips: false
    };

    opts = _.defaults(opts || {}, defaults);

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

inherits(Scatter, require('events').EventEmitter);

module.exports = Scatter;

Scatter.prototype._init = function() {

    var data = this.data
    var height = this.height
    var width = this.width
    var opts = this.opts
    var selector = this.selector
    var margin = this.margin
    var self = this

    this.$el = $(selector).first();

    var points = data.points

    var xDomain = d3.extent(points, function(d) {
            return d.x;
        });
    var yDomain = d3.extent(points, function(d) {
            return d.y;
        });

    var xRange = xDomain[1] - xDomain[0]
    var yRange = yDomain[1] - yDomain[0]

    this.x = d3.scale.linear()
        .domain([xDomain[0] - xRange * 0.1, xDomain[1] + xRange * 0.1])
        .range([0, width]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - yRange * 0.1, yDomain[1] + yRange * 0.1])
        .range([height , 0]);

    this.zoom = d3.behavior.zoom()
        .x(this.x)
        .y(this.y)
        .on('zoom', zoomed);

    function nearestPoint(points, target, xscale, yscale) {
        // find point in points nearest to target
        // using scales x and y
        // point must have attrs x, y, and s
        var i = 0, count = 0;
        var found, dist, n, p;
        while (count == 0 & i < points.length) {
            p = points[i]
            dist = Math.sqrt(Math.pow(xscale(p.x) - target[0], 2) + Math.pow(yscale(p.y) - target[1], 2))
            if (dist <= p.s) {
                found = p
                count = 1
            }
            i++;
        }
        return found
    }

    var shiftKey;

    var selected = [];
    var highlighted = [];

    var brush = d3.svg.brush()
        .x(this.x)
        .y(this.y)
        .on("brushstart", function() {
            // remove any highlighting
            highlighted = []
            // select a point if we click without extent
            var pos = d3.mouse(this)
            var found = nearestPoint(points, pos, self.x, self.y)
            if (found) {
                if (_.indexOf(selected, found.i) == -1) {
                    selected.push(found.i)
                } else {
                    _.remove(selected, function(d) {return d == found.i})
                }
                redraw();
            }
        })
        .on("brush", function() {
            // select points within extent
            var extent = d3.event.target.extent();
            if (Math.abs(extent[0][0] - extent[1][0]) > 0 & Math.abs(extent[0][1] - extent[1][1]) > 0) {
                selected = []
                _.forEach(points, function(p) {
                    if (_.indexOf(selected, p.i) == -1) {
                        var cond1 = (p.x > extent[0][0] & p.x < extent[1][0])
                        var cond2 = (p.y > extent[0][1] & p.y < extent[1][1])
                        if (cond1 & cond2) {
                            selected.push(p.i)
                        }
                    }
                })
            }
            redraw();
        })
        .on("brushend", function() {
            console.log("got user data")
            getUserData()
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
        })

    var container = d3.select(selector)
        .append('div')
        .style('width', width + margin.left + margin.right + "px")
        .style('height', height + margin.top + margin.bottom + "px")

    var canvas = container
        .append('canvas')
        .attr('class', 'scatter-plot canvas')
        .attr('width', width)
        .attr('height', height)
        .style('margin', margin.top + 'px ' + margin.left + 'px')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom)
        .on("click", mouseHandler)
        .on("dblclick.zoom", null)
        .node().getContext("2d")

    var svg = container
        .append('svg:svg')
        .attr('class', 'scatter-plot svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom)

    var brushrect = container
        .append('svg:svg')
        .attr('class', 'scatter-plot brush-container')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
    .append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('class', 'brush')
        .call(brush)

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'scatter-plot rect');

    d3.selectAll('.brush .background')
        .style('cursor', 'default')
    d3.selectAll('.brush')
        .style('pointer-events', 'none')

    function mouseHandler() {
        if (d3.event.defaultPrevented) return;
        var pos = d3.mouse(this)
        var found = nearestPoint(points, pos, self.x, self.y)
        if (found) {
            highlighted = []
            highlighted.push(found.i)
            self.emit('hover', found);
        } else {
            highlighted = []
        }
        selected = []
        redraw();
    }

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

    _.map(points, function(p) {
        p.s = p.s ? p.s : self.defaultSize
        p.cfill = p.c ? p.c : self.defaultFill
        p.cstroke = p.c ? p.c.darker(0.75) : self.defaultStroke
        return p
    })

    // automatically set line width based on number of points
    var lineWidth = points.length > 500 ? 1 : 1.1

    draw();

    function redraw() {
        canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        draw()
    }

    function draw() {

        var cx, cy, s;

        _.forEach(points, function(p) {
            var alpha, stroke, fill;
            if (selected.length > 0) {
                if (_.indexOf(selected, p.i) >= 0) {
                    alpha = 0.9
                } else {
                    alpha = 0.1
                }
            } else {
                alpha = p.a ? p.a : self.defaultAlpha
            }
            if (_.indexOf(highlighted, p.i) >= 0) {
                fill = d3.rgb(d3.hsl(p.cfill).darker(0.75))
            } else {
                fill = p.cfill
            }
            cx = self.x(p.x);
            cy = self.y(p.y);
            canvas.beginPath();
            canvas.arc(cx, cy, p.s, 0, 2 * Math.PI, false);
            canvas.fillStyle = utils.buildRGBA(fill, alpha)
            canvas.lineWidth = lineWidth
            canvas.strokeStyle = utils.buildRGBA(p.cstroke, alpha)
            canvas.fill()
            canvas.stroke()
        })
          
    }

    function updateAxis() {

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

    }

    function zoomed() {

        canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        updateAxis();
        draw();
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

    d3.select(selector).attr("tabindex", -1)

    d3.select(selector).on("keydown", function() {
        shiftKey = d3.event.shiftKey;
        if (shiftKey) {
            d3.selectAll('.brush').style('pointer-events', 'all')
            d3.selectAll('.brush .background').style('cursor', 'crosshair')
        }
    });

    d3.select(selector).on("keyup", function() {
        if (shiftKey) {
            d3.selectAll('.brush').style('pointer-events', 'none')
            d3.selectAll('.brush .background').style('cursor', 'default')
        }
        shiftKey = false
    });

    function getUserData() {

        utils.sendCommMessage(self, 'selection', selected);
        var x = _.map(selected, function(d) {return points[d].x});
        var y = _.map(selected, function(d) {return points[d].y});
        utils.updateSettings(self, {
            selected: selected,
            x: x,
            y: y
        }, function(err) {
            if(err) {
                console.log('err saving user data');
            }
        });
    }
    
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