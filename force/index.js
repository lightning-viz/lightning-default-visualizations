'use strict';
var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var _ = require('lodash');
var inherits = require('inherits');
var Color = require('color');
var utils = require('lightning-client-utils');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};


var Force = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts
    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data)
    this.selector = selector;
    this.defaultSize = 8
    this.defaultFill = '#deebfa'
    this.defaultStroke = '#68a1e5'
    this._init();

};

inherits(Force, require('events').EventEmitter);

module.exports = Force;

Force.prototype._init = function() {

    var opts = this.opts
    var height = this.height
    var width = this.width
    var selector = this.selector
    var links = this.data.links
    var nodes = this.data.nodes
    var self = this

    this.$el = $(selector).first();

    // if points are colored use gray, otherwise use our default
    var linkStrokeColor = nodes[0].c ? '#999' : '#A38EF3';

    // set opacity inversely proportional to number of links
    var linkStrokeOpacity = Math.max(1 - 0.0005 * links.length, 0.5)

    // set circle stroke thickness based on number of nodes
    var strokeWidth = nodes.length > 500 ? 1 : 1.1

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

    this.x = d3.scale.linear()
        .domain([0, width + margin.left + margin.right])
        .range([0, width + margin.left + margin.right]);

    this.y = d3.scale.linear()
        .domain([height + margin.top + margin.bottom, 0])
        .range([height + margin.top + margin.bottom, 0]);

    var zoom = d3.behavior.zoom()
        .x(self.x)
        .y(self.y)
        .scaleExtent([0.2, 7])
        .on('zoom', zoomed)

    var container = d3.select(selector)
        .append('div')
        .style('width', width + margin.left + margin.right + "px")
        .style('height', height + margin.top + margin.bottom + "px")

    var canvas = container
        .append('canvas')
        .attr('class', 'force-plot canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .call(zoom)
        .on("click", mouseHandler)
        .on("dblclick.zoom", null)
        .node().getContext("2d")

    var loading = container
        .append('svg:svg')
        .attr('class', 'force-plot svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text("loading...");

    function mouseHandler() {
        if (d3.event.defaultPrevented) return;
        var pos = d3.mouse(this)
        var found = nearestPoint(nodes, pos, self.x, self.y)
        if (found) {
            highlighted = []
            highlighted.push(found.i)
            self.emit('hover', found);
        } else {
            highlighted = []
            selected = []
        };
        redraw();
    }

    var selected = [];
    var highlighted = [];
    var shiftKey;

    var brush = d3.svg.brush()
        .x(self.x)
        .y(self.y)
        .on("brushstart", function() {
            // remove any highlighting
            highlighted = []
            // select a point if we click without extent
            var pos = d3.mouse(this)
            var found = nearestPoint(nodes, pos, self.x, self.y)
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
            var extent = d3.event.target.extent();
            if (Math.abs(extent[0][0] - extent[1][0]) > 0 & Math.abs(extent[0][1] - extent[1][1]) > 0) {
                selected = []
                var x = self.x
                var y = self.y
                _.forEach(nodes, function(n) {
                    var cond1 = (x(n.x) > x(extent[0][0]) & x(n.x) < x(extent[1][0]))
                    var cond2 = (y(n.y) > y(extent[0][1]) & y(n.y) < y(extent[1][1]))
                    if (cond1 & cond2) {
                        selected.push(n.i)
                    }
                })
                redraw();
            }
        })
        .on("brushend", function() {
            getUserData()
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
        })

    function zoomed() {
        redraw();
    }

    _.map(nodes, function(d) {
        d.s = d.s ? d.s : self.defaultSize
        d.cfill = d.c ? d.c : self.defaultFill
        d.cstroke = d.c ? d.c.darker(0.75) : self.defaultStroke
        return d
    })

    // array indicating links
    var linkedByIndex = {};
    var i
    for (i = 0; i < nodes.length; i++) {
        linkedByIndex[i + ',' + i] = 1;
    };
    links.forEach(function (d) {
        linkedByIndex[d.source + ',' + d.target] = 1;
    });

    // look up neighbor pairs
    function neighboring(a, b) {
        return linkedByIndex[a.index + ',' + b.index];
    }

    var force = d3.layout.force()
        .size([width, height])
        .charge(-120)
        .linkDistance(30)    
        .nodes(nodes)
        .links(links)

    var brushrect = container
        .append('svg:svg')
        .attr('class', 'force-plot brush-container')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
    .append("g")
        .attr('class', 'brush')
        .call(brush)

    d3.selectAll('.brush .background')
        .style('cursor', 'default')
    d3.selectAll('.brush')
        .style('pointer-events', 'none')

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
        utils.updateSettings(self, {
            selected: selected
        }, function(err) {
            if(err) {
                console.log('err saving user data');
            }
        });
    }

    function redraw() {
        canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        draw()
    }

    function draw() {

        _.forEach(links, function(l) {
            var alpha
            if (selected.length > 0) {
                if (_.indexOf(selected, l.source.index) > -1 & _.indexOf(selected, l.target.index) > -1) {
                    alpha = 0.9
                } else {
                    alpha = 0.05
                }
            } 
            if (highlighted.length > 0) {
                if (_.indexOf(highlighted, l.source.index) > -1 | _.indexOf(highlighted, l.target.index) > -1) {
                    alpha = 0.9
                } else {
                    alpha = 0.05
                }
            } 
            if (selected.length == 0 & highlighted.length == 0) {
                alpha = linkStrokeOpacity
            }
            canvas.strokeStyle = utils.buildRGBA(linkStrokeColor, alpha);
            canvas.lineWidth = 1 * Math.sqrt(l.value);
            canvas.lineJoin = 'round';
            canvas.beginPath();
            canvas.moveTo(self.x(l.source.x), self.y(l.source.y))
            canvas.lineTo(self.x(l.target.x), self.y(l.target.y));
            canvas.stroke()

        })

        _.forEach(nodes, function(n) {
            var alpha, stroke;
            if (selected.length > 0) {
                if (_.indexOf(selected, n.i) >= 0) {
                    alpha = 0.9
                } else {
                    alpha = 0.1
                }
            } else {
                alpha = 0.9
            }
            if (highlighted.length > 0) {
                if (neighboring(nodes[highlighted[0]], n) | neighboring(n, nodes[highlighted[0]])) {
                    alpha = 0.9
                } else {
                    alpha = 0.1
                }
            }
            if (_.indexOf(highlighted, n.i) >= 0) {
                stroke = "black"
            } else {
                stroke = n.cstroke
            }
            canvas.beginPath();
            canvas.arc(self.x(n.x), self.y(n.y), n.s, 0, 2 * Math.PI, false);
            canvas.fillStyle = utils.buildRGBA(n.cfill, alpha)
            canvas.lineWidth = strokeWidth
            canvas.strokeStyle = utils.buildRGBA(stroke, alpha)
            canvas.fill()
            canvas.stroke()
        })

    }

    setTimeout(function() {

        force.start();
        for (var i = nodes.length * nodes.length; i > 0; --i) force.tick();
        force.stop();

        draw();

        loading.style('fill', 'white');

    }, 10);

};

Force.prototype._formatData = function(data) {

    var retColor = utils.getColorFromData(data);
    var retSize = data.size || [];
    var retName = data.name || [];

    data.nodes = data.nodes.map(function (d,i) {
        d = [];
        d.i = i;
        d.n = retName[i];
        d.c = retColor.length > 1 ? retColor[i] : retColor[0];
        d.s = retSize.length > 1 ? retSize[i] : retSize[0];
        return d;
    });

    data.links = data.links.map(function (d) {
        d.source = d[0];
        d.target = d[1];
        d.value = d[2];
        return d;
    });

    return data;

};