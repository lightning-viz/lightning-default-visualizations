'use strict';
var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var inherits = require('inherits');
var utils = require('lightning-client-utils');
var _ = require('lodash');
var nester = require('underscore.nest');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};


var Circle = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts
    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width)) - margin.top - margin.bottom;

    this.data = this._formatData(data)
    this.defaultColor = '#deebfa'
    this.selector = selector;
    this._init();

};

inherits(Circle, require('events').EventEmitter);

module.exports = Circle;


Circle.prototype._init = function() {

    var opts = this.opts
    var height = this.height
    var width = this.width
    var selector = this.selector
    var self = this

    var nodes = this.data.nodes
    var links = this.data.links

    var diameter = width
    var radius = diameter / 2
    var innerRadius = radius - 120

    var cluster = d3.layout.cluster()
       .size([360, innerRadius])
       .sort(null)

    var partition = d3.layout.partition()
        .size([2 * Math.PI, innerRadius])
        .sort(null)
        .value(function(d) { return 1; });

    var bundle = d3.layout.bundle();

    var line = d3.svg.line.radial()
        .interpolate("bundle")
        .tension(0.7)
        .radius(function(d) { return d.y; })
        .angle(function(d) { return d.x / 180 * Math.PI; });

    var svg = d3.select(selector)
        .append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr('class', 'circle-plot')
        .append("g")
        .attr('transform', 'translate(' + radius + ',' + radius + ')')

    var link = svg.append("g").selectAll(".link"),
        node = svg.append("g").selectAll(".node");

    var tree = cluster.nodes(nodes);
    var maxDepth = d3.max(tree, function(d) {return d.depth})
    var points = _.sortBy(tree.filter(function (n) { return !n.children;}), function (n) {return n.i})
    
    links = links.map( function(d) {
        return {source: points[d[0]], target: points[d[1]]}
    })

    link = link
        .data(bundle(links))
    .enter().append("path")
        .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
        .attr("class", "link")
        .attr("d", line)
        .style("stroke", function(d) {return d.source.c ? d.source.c : self.defaultColor})
        .style("opacity", 0.05)

    node = node
        .data(tree.filter(function(n) { return !n.children; }))
    .enter().append("text")
        .attr("class", "node")
        .attr("dy", ".31em")
        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + maxDepth * 10 + 10) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
        .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
        .text(function(d) { return d.name; })
        .style("fill", function(d) {return d.c ? d.c : self.defaultColor})
        .on("mouseover", moverlink)
        .on("mouseout", moutlink)
        .on("click", clicklink)

    link.classed("link--fade--out", false)
    link.classed("link--fade--stick", false)

    function clickarc(d) {

        if (d.depth == (maxDepth - 1)) {

            d3.select(this).classed("arc--highlight--stick", !d3.select(this).classed("arc--highlight--stick"))

            var children = _.flatten(getChildren(d))
            
            link.classed("link--fade--out", function(l) {
                if ((_.indexOf(children, l.target) > -1) | (_.indexOf(children, l.source) > -1)) {
                    if (d3.select(this).classed("link--fade--stick")) {
                        return true
                    } else {
                        return false
                    }
                } else {
                    if (d3.select(this).classed("link--fade--stick")) {
                        return false
                    } else {
                        return true
                    }  
                }
            })

            link.classed("link--fade--stick", function(l) {
                if ((_.indexOf(children, l.target) > -1) | (_.indexOf(children, l.source) > -1)) {
                    return !d3.select(this).classed("link--fade--stick")
                } else {
                    return d3.select(this).classed("link--fade--stick")
                }
            })

            var total = 0
            link.classed("link--fade--out", function(l) {
                if (d3.select(this).classed("link--fade--out")) {
                    total += 1
                }
                return d3.select(this).classed("link--fade--out")
            })

            if (total == links.length) {
                link.classed("link--fade--out", false)
            }

        }

    }

    function moverarc(d) {
        if (d.depth == (maxDepth - 1)) {
            d3.select(this).classed("arc--highlight", true)
        }
    }

    function moutarc(d) {
        if (d.depth == (maxDepth - 1)) {
            d3.select(this).classed("arc--highlight", false)
        }
    }

    function clicklink(d) {

        link.classed("link--highlight", function(l) { 
                if (l.target === d | l.source === d) { 
                    return !d3.select(this).classed("link--highlight")
                } else {
                    return d3.select(this).classed("link--highlight")
                }
            })

        d3.select(this).classed("node--highlight--stick", !d3.select(this).classed("node--highlight--stick"))
    }

    function moverlink(d) {

        d3.select(this).classed("node--highlight", true)

    }

    function moutlink(d) {
       
        d3.select(this).classed("node--highlight", false)

    }

    // get colors from groups
    var n = d3.max(tree.filter(function (d) {return d.depth == 1}), function(d) {return d.index})
    var colors = utils.getColors(n + 1)
    
    // color the first level
    tree.filter(function (d) {return d.depth == 1}).map(function(d) {
        d.c = colors[d.index] 
        return d
    })

    // color all subsequent levels
    var i
    for (i = 1; i < maxDepth; i++) {
        tree.filter(function (d) {return d.depth == i}).map(function(d) {
            var nchildren = d.children.length
            if (nchildren > 1) {
                var baseColor = d.c
                var newColors = [d3.rgb(baseColor).darker(0.3), d3.rgb(baseColor).brighter(0.3)]                
                d.children.map(function(e) {
                    e.c = (e.index % 2) == 0 ? newColors[0] : newColors[1];
                    return e
                })
            } else {
                d.children.map(function(e) {
                    e.c = d.c
                    return e
                })
            }
            return d
        })
    }

    var top = tree.filter(function (d) { return d.depth < maxDepth && d.depth > 0;})

    var arc = d3.svg.arc()
         .startAngle(function(d) { return findStartAngle(d); })
         .endAngle(function(d) { return findEndAngle(d); })
         .innerRadius(function(d) {return d.depth * 10 + innerRadius})
         .outerRadius(function(d) {return d.depth * 10 + innerRadius + 7})

    var arcs = svg.append("g").selectAll(".path")
         .data(top)
         .enter().append("path")
         .attr("d", arc)
         .attr("class", "arc")
         .style("fill", function(d) {return d.c ? d.c : self.defaultColor})
         .on("mouseover", moverarc)
         .on("mouseout", moutarc)
         .on("click", clickarc)

    function findStartAngle(d) {
        var min = treeMinPos(d) - 1
        return (min * Math.PI) / 180;
    }

    function findEndAngle(d) {
        var max = treeMaxPos(d) + 1
        return (max * Math.PI) / 180;
    }

    function treeMaxPos(obj) {
        var max = 0
        if (obj.children) {
            obj.children.forEach(function (d) {
                var tmpMax = treeMaxPos(d)
                if (tmpMax > max) {
                    max = tmpMax
                }
            })
            return max
        } else {
            return obj.x
        }
    }

    function treeMinPos(obj) {
        var min = Number.POSITIVE_INFINITY
        if (obj.children) {
            obj.children.forEach(function (d) {
                var tmpMin = treeMinPos(d)
                if (tmpMin < min) {
                    min = tmpMin
                }
            })
            return min
        } else {
            return obj.x
        }
    }

    
    function getChildren(obj) {
        var children = []
        if (obj.children) {
            obj.children.forEach(function(d) {
                var tmp = getChildren(d)
                if (tmp) {
                    children.push(tmp)
                }
            })
            return children
        } else {
            return obj
        }
    }

    d3.select('body').on('keydown', update)

    var tension = 0.7
    function update() {
        if (d3.event.keyCode == 37 | d3.event.keyCode == 39) {
            d3.event.preventDefault();
        }
        if (d3.event.keyCode == 38 | d3.event.keyCode == 40) {
            d3.event.preventDefault();
            if (d3.event.keyCode == 40) {
                tension = tension - 0.05
                if (tension < 0) {
                    tension = 0
                }
            }
            if (d3.event.keyCode == 38) {
                tension = tension + 0.05
                if (tension > 1) {
                    tension = 1
                }
            }
            console.log(tension)
            line.tension(tension)
            link.attr("d", line)
        }
    }

}


Circle.prototype._formatData = function(data) {

    // get primary fields
    var nodes = data.nodes
    var level = data.level
    var label = data.label
    var names = data.names
    
    // get colors using top-level label
    data.label = data.label[0]
    retColor = utils.getColorFromData(data)

    // build array of items with their grouping attributes
    var items = []
    _.each(nodes, function(n, i) {
        var entry = {}
        entry["i"] = i
        entry["c"] = retColor[i]
        entry["name"] = names[i] ? names[i] : i
        _.each(level, function(l, j) {
            entry[j] = l[label[j][i]]
        })
        items.push(entry)
    });

    // nest it up
    data.nodes = nester.nest(items, _.range(0, level.length))

    return data

}
