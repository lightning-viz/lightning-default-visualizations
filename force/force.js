'use strict';
var d3 = require('d3');
var inherits = require('inherits');
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
    this.defaultFill = '#68a1e5'
    this._init();

};

inherits(Force, require('events').EventEmitter);

module.exports = Force;

Force.prototype._init = function() {

    var opts = this.opts
    var height = this.height
    var width = this.width
    var selector = this.selector
    var self = this
    var links = this.data.links
    var nodes = this.data.nodes

    // if points are colored use gray, otherwise use our default
    var linkStrokeColor = nodes[0].c ? '#999' : '#A38EF3';

    // set opacity inversely proportional to number of links
    var linkStrokeOpacity = Math.max(1 - 0.0005 * links.length, 0.15)

    var zoom = d3.behavior.zoom()
        .scaleExtent([0.1, 20])
        .on("zoom", zoomed)

    var svg = d3.select(selector)
        .append('svg:svg')
        .attr('class', 'line-plot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('pointer-events', 'all')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoom)
        .on('dblclick.zoom', null)
        .append('svg:g')

    function zoomed() {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    // highlight based on links
    // borrowed from: http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

    // toggle for highlighting
    var toggleOpacity = 0;

    // array indicating links
    var linkedByIndex = {};
    var i
    for (i = 0; i < nodes.length; i++) {
        console.log(i)
        linkedByIndex[i + ',' + i] = 1;
    };
    links.forEach(function (d) {
        linkedByIndex[d.source + "," + d.target] = 1;
    });

    // look up neighbor pairs
    function neighboring(a, b) {
        return linkedByIndex[a.index + "," + b.index];
    }

    function connectedNodesOpacity() {
        console.log(toggleOpacity)
        if (toggleOpacity == 0) {
            // change opacity of all but the neighbouring nodes
            var d = d3.select(this).node().__data__;
            node.style("stroke", function (o) {
                return d.index == o.index ? "rgb(30,30,30)" : "white";
            });
            node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.2;
            });
            link.style("opacity", function (o) {
                return d.index==o.source.index | d.index==o.target.index ? 1 : linkStrokeOpacity / 10;
            });
            toggleOpacity = 1;
        } else {
            // restore properties
            node.style("stroke", "white")
            node.style("opacity", 1)
            link.style("opacity", linkStrokeOpacity);
            toggleOpacity = 0;
        }
    }

    var force = d3.layout.force()
        .size([width, height])
        .charge(-120)
        .linkDistance(30)    
        .nodes(nodes)
        .links(links)
        .start();

    var drag = force.drag()
      .on("dragstart", function(d) {
        d3.event.sourceEvent.stopPropagation();
      });

    var link = svg.selectAll(".link")
        .data(links)
    .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return 1 * Math.sqrt(d.value); })
        .style("stroke", linkStrokeColor)
        .style("stroke-opacity", linkStrokeOpacity);

    var node = svg.selectAll(".node")
        .data(nodes)
    .enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d) { return (d.s ? d.s : self.defaultSize); })
        .style("fill", function(d) { return (d.c ? d.c : self.defaultFill); })
        .style("fill-opacity", 0.9)
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on('dblclick', connectedNodesOpacity)
        .call(drag);

    force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    });

};

Force.prototype._formatData = function(data) {

    var retColor = utils.getColorFromData(data)
    var retSize = data.size || []
    var retName = data.name || []

    data.nodes = data.nodes.map(function (d,i) {
        d = []
        d.i = i
        d.n = retName[i]
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        return d
    });

    data.links = data.links.map(function (d,i) {
        d.source = d[0]
        d.target = d[1]
        d.value = d[2]
        return d
    })

    return data

}