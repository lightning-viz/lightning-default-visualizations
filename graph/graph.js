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

    this.opts = opts

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;

    this.data = this._formatData(data)
    this.images = images || []
    this.selector = selector;
    this.defaultFill = '#68a1e5'
    this.defaultSize = 8
    this._init();

};

inherits(Graph, require('events').EventEmitter);

module.exports = Graph;

Graph.prototype._init = function() {

    var data = this.data
    var images = this.images
    var width = this.width
    var opts = this.opts
    var selector = this.selector
    var self = this

    var nodes = data.nodes
    var links = data.links

    // if points are colored use gray, otherwise use our default
    var linkStrokeColor = nodes[0].c == null ? '#A38EF3' : '#999'

    // set opacity inversely proportional to number of links
    var linkStrokeOpacity = Math.max(1 - 0.0005 * links.length, 0.15)

    var xDomain = d3.extent(nodes, function(d) {
        return d.x;
    });

    var yDomain = d3.extent(nodes, function(d) {
        return d.y;
    });

    var imageCount = images.length

    if (imageCount > 0) {
        var imwidth = (opts.imwidth || xDomain[1]);
        var imheight = (opts.imheight || yDomain[1]);
        var ratio = imwidth / imheight;
        self.defaultFill = 'white'
        self.lineStroke = 'white'
        xDomain = [0, imwidth];
        yDomain = [0, imheight];
    } else {
        var colors = utils.getColors(2);
        var ratio = Math.sqrt(2);
    }

    var height = width / ratio;
    
    var x = d3.scale.linear()
        .domain(xDomain)
        .range([width, 0]);

    var y = d3.scale.linear()
        .domain(yDomain)
        .range([height, 0]);

    nodes = _.map(nodes, function(n) {
        n.x = x(n.x)
        n.y = y(n.y)
        return n
    });

    var zoom = d3.behavior.zoom()
        .x(x)
        .y(y)
        .on('zoom', zoomed);

    var svg = d3.select(selector)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append("g")
        .call(zoom)
        .append("g");

    svg.append("rect")
        .attr("class", "overlay")
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    function zoomed() {
        svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
    }

    if (imageCount > 0) {
        svg.append('svg:image')
            .attr('width', width)
            .attr('height', height);
        
        svg.select('image')
            .attr('xlink:href', utils.getThumbnail(this.images));
    }

    var line = d3.svg.line()
        .x(function(d){return d.x;})
        .y(function(d){return d.y;})
        .interpolate('linear');

    _.each(data.links, function(link) {
        svg.append('path').attr('d', line([nodes[link.source], nodes[link.target]]))
            .style('stroke-width', 1 * Math.sqrt(link.value))
            .style('stroke', linkStrokeColor)
            .style('fill', 'none')
            .style('stroke-opacity', linkStrokeOpacity); //use opacity as blending
    })

    //draw nodes
    svg.selectAll('.node')
       .data(nodes)
      .enter()
       .append('circle')
       .classed('node', true)
       .attr("r", function(d) { return (d.s == null ? self.defaultSize : d.s)})
       .style("fill", function(d) { return (d.c == null ? self.defaultFill : d.c);})
       .attr('fill-opacity',0.9)
       .attr('stroke', 'white')
       .attr('stroke-width', 1)
       .attr('cx', function(d){ return d.x;})
       .attr('cy', function(d){ return d.y;});

};

Graph.prototype._formatData = function(data) {

    retColor = utils.getColorFromData(data)
    retSize = data.size || []
    retName = data.name || []

    data.nodes = data.nodes.map(function (d,i) {
        d.x = d[0]
        d.y = d[1]
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
