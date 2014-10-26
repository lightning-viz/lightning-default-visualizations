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

    // get the data
    var nodes = data.points || data.nodes;
    this.images = images || [];

    // get domains in x and y
   var xDomain = d3.extent(nodes, function(d) {
        return d.x;
    });

   var yDomain = d3.extent(nodes, function(d) {
        return d.y;
    });

    // load an image to get dimensions
    var img = new Image();
    img.src = utils.getThumbnail(this.images);
    imwidth = img.width;
    imheight = img.height;
    img.load

    // preloading (combine with previous step?)
    utils.preloadImage(_.map(images, utils.getThumbnail));
    
    // set ratio based on dimensions so image and points match
    ratio = imwidth / imheight;

    var width = $(selector).width() - margin.left - margin.right;
    var height = width / ratio;

    var x = d3.scale.linear()
        .domain([0, imwidth])
        .range([width, 0]);

    var y = d3.scale.linear()
        .domain([0, imheight])
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
        .append('svg:g')
        .call(zoom);


    function zoomed() {
        svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
    }


    var line = d3.svg.line()
                    .x(function(d){return d.x;})
                    .y(function(d){return d.y;})
                    .interpolate('linear');

    svg.append('svg:image')
        .attr('width', width)
        .attr('height', height);

    _.each(data.links, function(link) {
        svg.append('path').attr('d', line([nodes[link.source], nodes[link.target]]))
            .style('stroke-width', 1)
            .style('stroke', "white")
            .style('fill', 'none')
            .style('stroke-opacity',0.1); //use opacity as blending
    })

    //draw nodes
    svg.selectAll('.node')
       .data(d3.entries(nodes))
       .enter()
       .append('circle')
       .classed('node', true)
       .attr({'r': 4, 'fill': "white"})
       .attr('fill-opacity',0.25)
       .attr('stroke','white')
       .attr('cx', function(d){ return d.value.x;})
       .attr('cy', function(d){ return d.value.y;});

    svg.select('image')
            .attr('xlink:href', utils.getThumbnail(this.images));

};

