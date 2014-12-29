'use strict';
var d3 = require('d3');
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

    this.data = this._formatData(data);
    this.images = images || [];
    this.selector = selector;
    this.defaultFill = '#68a1e5';
    this.defaultSize = 8;
    this._init();

};

inherits(Graph, require('events').EventEmitter);

module.exports = Graph;

Graph.prototype._init = function() {

    var data = this.data;
    var images = this.images;
    var width = this.width;
    var opts = this.opts;
    var selector = this.selector;
    var self = this;

    var nodes = data.nodes;
    var links = data.links;

    // if points are colored use gray, otherwise use our default
    var linkStrokeColor = nodes[0].c ? '#999' : '#A38EF3';

    // set opacity inversely proportional to number of links
    var linkStrokeOpacity = Math.max(1 - 0.0005 * links.length, 0.15);

    var xDomain = d3.extent(nodes, function(d) {
        return d.x;
    });

    var yDomain = d3.extent(nodes, function(d) {
        return d.y;
    });

    var imageCount = images.length;

    var ratio = [];

    if (imageCount > 0) {
        var imwidth = (opts.imwidth || xDomain[1]);
        var imheight = (opts.imheight || yDomain[1]);
        ratio = imwidth / imheight;
        self.defaultFill = 'white';
        self.lineStrokeColor = 'white';
        xDomain = [0, imwidth];
        yDomain = [0, imheight];
    } else {
        ratio = Math.sqrt(2);
    }

    var height = width / ratio;
    
    var x = d3.scale.linear()
        .domain(xDomain)
        .range([width - 10, 0 + 10]);

    var y = d3.scale.linear()
        .domain(yDomain)
        .range([height - 10, 0 + 10]);

    nodes = _.map(nodes, function(n) {
        n.x = x(n.x);
        n.y = y(n.y);
        return n;
    });

    var zoom = d3.behavior.zoom()
        .x(x)
        .y(y)
        .on('zoom', zoomed);

    var svg = d3.select(selector)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .call(zoom)
        .on('dblclick.zoom', null)
        .append('g');

    svg.append('rect')
        .attr('class', 'overlay')
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    function zoomed() {
        svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
    }

    if (imageCount > 0) {
        svg.append('svg:image')
            .attr('width', width)
            .attr('height', height);
        
        svg.select('image')
            .attr('xlink:href', utils.getThumbnail(images));
    }

    var line = d3.svg.line()
        .x(function(d){return d.x;})
        .y(function(d){return d.y;})
        .interpolate('linear');

    var link = svg.selectAll('.link')
        .data(links)
      .enter().append('path')
        .attr('d', function(d) { return line([nodes[d.source], nodes[d.target]]); })
        .style('stroke-width', function(d) {return 1 * Math.sqrt(d.value)})
        .style('stroke', linkStrokeColor)
        .style('fill', 'none')
        .style('opacity', linkStrokeOpacity);

    console.log(link)

    // highlight based on links
    // borrowed from: http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

    // toggle for highlighting
    var toggleOpacity = 0;

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
        return linkedByIndex[a.i + ',' + b.i];
    }

    function selectedNodeOpacityIn() {
        d3.select(this).transition().duration(100).style("stroke", "rgb(30,30,30)")
    }

    function selectedNodeOpacityOut() {
        d3.select(this).transition().duration(50).style("stroke", "white")
    }

    function connectedNodesOpacity() {

        if (toggleOpacity == 0) {
            // change opacity of all but the neighbouring nodes
            var d = d3.select(this).node().__data__;
            node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.2;
            });
            link.style("opacity", function (o) {
                 return d.i==o.source | d.i==o.target ? 0.9 : linkStrokeOpacity / 10;
            });
            toggleOpacity = 1;
        } else {
            // restore properties
            node.style("opacity", 1)
            link.style("opacity", linkStrokeOpacity);
            toggleOpacity = 0;
        }
    }

    //draw nodes
    var node = svg.selectAll('.node')
       .data(nodes)
      .enter()
       .append('circle')
       .classed('node', true)
       .attr('r', function(d) { return (d.s ? d.s : self.defaultSize); })
       .style('fill', function(d) { return (d.c ? d.c : self.defaultFill); })
       .attr('fill-opacity',0.9)
       .attr('stroke', 'white')
       .attr('stroke-width', 1)
       .attr('cx', function(d){ return d.x;})
       .attr('cy', function(d){ return d.y;})
       .on('click', connectedNodesOpacity)
       .on('mouseenter', selectedNodeOpacityIn)
       .on('mouseleave', selectedNodeOpacityOut)

};

Graph.prototype._formatData = function(data) {

    var retColor = utils.getColorFromData(data);
    var retSize = data.size || [];
    var retName = data.name || [];

    data.nodes = data.nodes.map(function (d,i) {
        d.x = d[0];
        d.y = d[1];
        d.i = i
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
