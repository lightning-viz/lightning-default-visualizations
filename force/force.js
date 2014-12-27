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
    var self = this
    var links = this.data.links
    var nodes = this.data.nodes

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
    for (i = 0; i < nodes.length; i++) {
        linkedByIndex[i + "," + i] = 1;
    };
    links.forEach(function (d) {
        linkedByIndex[d.source + "," + d.target] = 1;
    });

    // look up neighbor pairs
    function neighboring(a, b) {
        return linkedByIndex[a.index + "," + b.index];
    }

    function connectedNodesStroke() {
        if (toggleStroke == 0) {
            // change stroke of connecting nodes
            d = d3.select(this).node().__data__;
            node.style("stroke", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? "gray" : "white";
            });
            node.style("stroke-width", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1.5 : 1;
            });
            toggleStroke = 1;
        } else {
            // restore properties
            node.style("stroke-width", 1);
            node.style("stroke", "white")
            toggleStroke = 0;
        }
    }

    function connectedNodesOpacity() {
        console.log(toggleOpacity)
        if (toggleOpacity == 0) {
            // change opacity of all but the neighbouring nodes
            d = d3.select(this).node().__data__;
            node.style("stroke", function (o) {
                return d.index == o.index ? "rgb(30,30,30)" : "white";
            });
            node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.2;
            });
            link.style("opacity", function (o) {
                return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
            });
            toggleOpacity = 1;
        } else {
            // restore properties
            node.style("stroke", "white")
            node.style("opacity", 1)
            link.style("opacity", 1);
            toggleOpacity = 0;
        }
    }

    function reset() {
        if (toggleOpacity == 1) {
            node.style("stroke", "white")
            node.style("opacity", 1)
            link.style("opacity", 1);
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
        .style("stroke-width", function(d) { return Math.sqrt(d.value); })
        .style("stroke", '#999')
        .style("stroke-opacity", 0.9);

    var node = svg.selectAll(".node")
        .data(nodes)
    .enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d) { return (d.s == null ? self.defaultSize : d.s)})
        .style("fill", function(d) { return (d.c == null ? self.defaultFill : d.c);})
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

    var getColorFromData = function(data) {

        // retrieve an array of colors from 'label' or 'color' fields of object data
        // returns an list of lists in the form [[r,g,b],[r,g,b]...]

        if(data.hasOwnProperty('label')) {

            // get bounds and number of labels
            label = data.label
            var mn = d3.min(label, function(d) {return d; });
            var mx = d3.max(label, function(d) {return d; });
            var n = mx - mn + 1
            var colors = utils.getColors(n)

            // get an array of d3 colors
            retColor = label.map(function(d) {return d3.rgb(colors[d - mn])});

        } else if (data.hasOwnProperty('color')) {

            // get an array of d3 colors directly from r,g,b values
            color = data.color
            retColor = color.map(function(d) {return d3.rgb(d[0], d[1], d[2])})

        } else {

            // otherwise return empty
            retColor = []
        }

        return retColor
    };

    var getPropertyFromData = function(data, name) {

        // retrieve property with the given name from a data object
        // if non existing, return empty array

        if (data.hasOwnProperty(name)) {
            ret = data[name]
        } else {
            ret = []
        }
        return ret
    };

    retColor = getColorFromData(data)
    retSize = getPropertyFromData(data, 'size')
    retName = getPropertyFromData(data, 'name')

    data.nodes = data.nodes.map(function (d,i) {
        d = []
        d.i = i
        d.n = retName[i]
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        console.log(i)
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