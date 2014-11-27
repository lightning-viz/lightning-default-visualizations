var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils');


var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};


module.exports = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }
    
    var nodes = data.points || data.nodes;

    var xDomain = d3.extent(nodes, function(d) {
        return d.x;
    });

    var yDomain = d3.extent(nodes, function(d) {
        return d.y;
    });

    this.images = images || [];
    imageCount = this.images.length;

    if (imageCount > 0) {
        var colors = ['white','white'];
        var imwidth = (opts.imwidth || xDomain[1]);
        var imheight = (opts.imheight || yDomain[1]);
        var ratio = imwidth / imheight;
        xDomain = [0, imwidth];
        yDomain = [0, imheight];
    } else {
        var colors = utils.getColors(2);
        var ratio = Math.sqrt(2);
    }

    var width = $(selector).width() - margin.left - margin.right;
    var height = width / ratio;
    
    var x = d3.scale.linear()
        .domain(xDomain)
        .range([width, 0]);

    var y = d3.scale.linear()
        .domain(yDomain)
        .range([height, 0]);

    nodes = _.map(nodes, function(n) {
        return {
            x: x(n.x),
            y: y(n.y)
        }
    });


    nodes = _.object(_.range(nodes.length), nodes);


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
            .style('stroke-width', 1)
            .style('stroke', colors[0])
            .style('fill', 'none')
            .style('stroke-opacity',0.05); //use opacity as blending
    })


    //draw nodes
    svg.selectAll('.node')
       .data(d3.entries(nodes))
       .enter()
       .append('circle')
       .classed('node', true)
       .attr({'r': 3.5, 'fill': colors[1]})
       .attr('fill-opacity',0.5)
       .attr('stroke','white')
       .attr('cx', function(d){ return d.value.x;})
       .attr('cy', function(d){ return d.value.y;});


};

