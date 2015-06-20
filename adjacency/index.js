'use strict';

var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils')
var colorbrewer = require('colorbrewer')

var L = require('leaflet');
var Color = require('color');

var margin = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
};

var Adjacency = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts
    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.5)) - margin.top - margin.bottom;

    this.data = this._formatData(data)
    this.selector = selector;
    this._init();

}

Adjacency.prototype._init = function() {

    var width = this.width
    var height = this.height
    var data = this.data
    var selector = this.selector
    var self = this

    var entries = data.entries
    var nrow = data.nrow
    var ncol = data.ncol
    var label = data.label

    // automatically scale stroke width by number of cells
    var strokeWidth = Math.max(1 - 0.00009 * nrow * ncol, 0.1);

    // get min and max of matrix value data
    var zmin = d3.min(entries, function(d) {
        return d.z
    });
    var zmax = d3.max(entries, function(d) {
        return d.z
    });

    // set up x and y scales and ranges
    var y = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]).domain(d3.range(nrow));
    var x = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]).domain(d3.range(ncol));
    var maxY = nrow * y.rangeBand();
    var maxX = ncol * x.rangeBand();

    // sort by label
    y.domain(d3.range(nrow).sort(function(a, b) { return label[a] - label[b]; }));
    x.domain(d3.range(ncol).sort(function(a, b) { return label[a] - label[b]; }))

    // set up colors
    var color = utils.getColors(_.uniq(label).length);

    // set up opacity scale
    var zdomain = [0, zmax]
    var z = d3.scale.linear().domain(zdomain).range([0.3,1]).clamp(true);

    // set up variables to toggle with keypresses
    var scale = 0

    // bounds for the graphic
    var bounds = [[0, 0], [maxY, maxX]];

    // create canvas
    var canvas = d3.select(selector)
        .append('canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .node().getContext("2d")

    // create dummy container for data binding
    var detachedContainer = document.createElement("custom");
    var dataContainer = d3.select(detachedContainer);

    // drawing wrapper to handle binding
    function drawCustom(data) {

        var dataBinding = dataContainer.selectAll("custom.rect")
            .data(data);

        dataBinding
            .attr("fillStyle", function(d) {return d.z > 0 ? buildRGBA(d.c, z(d.z)) : "#eee"});
          
        dataBinding.enter()
            .append("custom")
            .classed("rect", true)
            .attr("x", function(d) {return x(d.x)})
            .attr("y", function(d, i) {return y(d.y)})
            .attr("width", y.rangeBand())
            .attr("height", x.rangeBand())
            .attr("fillStyle", function(d) {return (d.z > 0) ? buildRGBA(d.c, z(d.z)) : "#eee"})
            .attr("strokeStyle", "white")
            .attr("lineWidth", strokeWidth)
  
        drawCanvas();
    
    }

    // function for handling opacity
    var buildRGBA = function(fill, opacity) {
        var color = Color(fill);
        color.alpha(opacity);
        return color.rgbString();
    };

    // draw the matrix
    function drawCanvas() {

      // clear canvas
      canvas.clearRect(0, 0, width, height);
      
      // select nodes and draw their data to canvas
      var elements = dataContainer.selectAll("custom.rect");
      elements.each(function(d) {
        var node = d3.select(this);
        canvas.beginPath();
        canvas.fillStyle = node.attr("fillStyle");
        canvas.strokeStyle = node.attr("strokeStyle");
        canvas.lineWidth = node.attr("lineWidth");
        canvas.rect(node.attr("x"), node.attr("y"), node.attr("height"), node.attr("width"));
        canvas.fill();
        canvas.stroke();
        canvas.closePath();
      })
    }

    // handle key press updates
    d3.select('body').on('keydown', update)

    function update() {
        if (d3.event.keyCode == 38 | d3.event.keyCode == 40) {
            d3.event.preventDefault();
            if (d3.event.keyCode == 38) {
                scale = scale + 0.1
                if (scale > 0.95) {
                    scale = 0.95
                }
            }
            if (d3.event.keyCode == 40) {
                scale = scale - 0.1
                if (scale < -1) {
                    scale = -1
                }
            }
            console.log(zmax - zmax * scale)
            zdomain = [0, zmax - zmax * scale]
            z.domain(zdomain)
            drawCustom(entries);
        }
    }

    drawCustom(entries)
};

Adjacency.prototype._formatData = function(data) {

    var matrix = [];
    var n = data.nodes.length
    var label = data.label ? data.label : _.times(n, _.constant(0));
    var min = d3.min(label);
    label = label.map(function(d) {return d - min});
    var color = utils.getColors(_.uniq(label).length);

    data.nodes.forEach(function(node, i) {
        matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0, c: "black"}; });
    });
    data.links.forEach(function(link) {
        matrix[link[0]][link[1]].z = link[2];
        if (label[link[0]] == label[link[1]]) {
            matrix[link[0]][link[1]].c = color[label[link[0]]];
        }
    });
    var zMin = d3.min(data.links, function(d) {return d[2]})
    console.log(zMin)
    d3.range(n).forEach(function(i) { 
        matrix[i][i].z = zMin
        matrix[i][i].c = color[label[i]]
    })

    var entries = _.flatten(matrix)

    var nrow = matrix.length
    var ncol = matrix[0].length

    return {entries: entries, nrow: nrow, ncol: ncol, label: label}

}

module.exports = Adjacency;
