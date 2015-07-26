'use strict';
var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var _ = require('lodash');
var inherits = require('inherits');
var utils = require('lightning-client-utils');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};


var Graph = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts;

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data);
    this.images = images || [];
    this.selector = selector;
    this.defaultFill = '#68a1e5';
    this.defaultStroke = 'white';
    this.defaultSize = 8;
    this._init();

};

inherits(Graph, require('events').EventEmitter);

module.exports = Graph;

Graph.prototype._init = function() {

    var data = this.data;
    var width = this.width;
    var height = this.height;
    var opts = this.opts;
    var selector = this.selector;
    var self = this;

    var nodes = data.nodes;
    var links = data.links;

    // if points are colored use gray, otherwise use our default
    var linkStrokeColor = nodes[0].c ? '#999' : '#A38EF3';

    // set opacity inversely proportional to number of links
    var linkStrokeOpacity = Math.max(1 - 0.0005 * links.length, 0.5);

    // set circle stroke thickness based on number of nodes
    var strokeWidth = nodes.length > 500 ? 1 : 1.1

    var xDomain = d3.extent(nodes, function(d) {
        return d.x;
    });

    var yDomain = d3.extent(nodes, function(d) {
        return d.y;
    });

    var sizeMax = d3.max(nodes, function(d) {
            return d.s;
        });

    if (sizeMax) {
        var padding = sizeMax * 2
    } else {
        var padding = 8 * 2 + 10
    }

    var xRng = Math.abs(xDomain[1] - xDomain[0])
    var yRng = Math.abs(yDomain[1] - yDomain[0])

    xDomain[0] -= xRng * 0.025
    xDomain[1] += xRng * 0.025
    yDomain[0] -= yRng * 0.025
    yDomain[1] += yRng * 0.025

    this.x = d3.scale.linear()
        .domain(xDomain)
        .range([0, width]);

    this.y = d3.scale.linear()
        .domain(yDomain)
        .range([height, 0]);

    var zoom = d3.behavior.zoom()
        .x(self.x)
        .y(self.y)
        .on('zoom', zoomed);

    var container = d3.select(selector)
        .append('div')
        .style('width', width + "px")
        .style('height', height + "px")

    var canvas = container
        .append('canvas')
        .attr('class', 'graph-plot canvas')
        .attr('width', width)
        .attr('height', height)
        .call(zoom)
        .on("click", mouseHandler)
        .on("dblclick.zoom", null)
        .node().getContext("2d")

    function mouseHandler() {
        if (d3.event.defaultPrevented) return;
        var pos = d3.mouse(this)
        var found = utils.nearestPoint(nodes, pos, self.x, self.y)

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
            var found = utils.nearestPoint(nodes, pos, self.x, self.y)
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
                    var cond1 = (n.x > extent[0][0] & n.x < extent[1][0])
                    var cond2 = (n.y > extent[0][1] & n.y < extent[1][1])
                    if (cond1 & cond2) {
                        selected.push(n.i)
                    }
                })
                redraw();
            }
        })
        .on("brushend", function() {
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
        })


    function zoomed() {
        redraw();
    }

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
        return linkedByIndex[a + ',' + b];
    }

    var brushrect = container
        .append('svg:svg')
        .attr('class', 'graph-plot brush-container')
        .attr('width', width)
        .attr('height', height)
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

    _.map(nodes, function(d) {
        d.cfill = d.c ? d.c : self.defaultFill
        d.cstroke = d.c ? d.c.darker(0.75) : self.defaultStroke
        return d
    })

    function redraw() {
        canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        draw()
    }

    function draw() {

        _.forEach(links, function(l) {
            var alpha
            if (selected.length > 0) {
                if (_.indexOf(selected, l.source) > -1 & _.indexOf(selected, l.target) > -1) {
                    alpha = 0.9
                } else {
                    alpha = 0.05
                }
            } 
            if (highlighted.length > 0) {
                if (_.indexOf(highlighted, l.source) > -1 | _.indexOf(highlighted, l.target) > -1) {
                    alpha = 0.9
                } else {
                    alpha = 0.05
                }
            } 
            if (selected.length == 0 & highlighted.length == 0) {
                alpha = linkStrokeOpacity
            }

            var source = nodes[l.source]
            var target = nodes[l.target]
            canvas.strokeStyle = utils.buildRGBA(linkStrokeColor, alpha);
            canvas.lineWidth = 1 * Math.sqrt(l.value);
            canvas.lineJoin = 'round';
            canvas.beginPath();
            canvas.moveTo(self.x(source.x), self.y(source.y))
            canvas.lineTo(self.x(target.x), self.y(target.y));
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
                if (neighboring(nodes[highlighted[0]].i, n.i) | neighboring(n.i, nodes[highlighted[0]].i)) {
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

    draw();

};

Graph.prototype._formatData = function(data) {

    var retColor = utils.getColorFromData(data);
    var retSize = data.size || [];
    var retName = data.name || [];

    data.nodes = data.nodes.map(function (d,i) {
        d.x = d[0];
        d.y = d[1];
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
