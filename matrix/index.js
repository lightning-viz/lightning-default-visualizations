'use strict';

var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils')
var colorbrewer = require('colorbrewer')
var Color = require('color');

var margin = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
};

var Matrix = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts
    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data)
    this.selector = selector;
    this.defaultColormap = 'Purples';
    this._init();

}

Matrix.prototype._init = function() {

    var width = this.width
    var height = this.height
    var data = this.data
    var selector = this.selector
    var self = this

    var entries = data.entries;
    var nrow = data.nrow
    var ncol = data.ncol

    // automatically scale stroke width by number of cells
    var strokeWidth = Math.max(1 - 0.00009 * nrow * ncol, 0.1);

    // get min and max of matrix value data
    var zmin = d3.min(entries, function(d) {
        return d.z
    });
    var zmax = d3.max(entries, function(d) {
        return d.z
    });

    // create colormap
    function colormap(name) {
        var color
        if (name == "Lightning") {
            color = ['#A38EF3', '#DBB1F2', '#7ABFEA', '#5BC69F', '#AADA90', '#F0E86B', '#F9B070', '#F19A9A', '#E96B88']
        } else {
            color = colorbrewer[name][9]
        }
        return color
    }

    // set up colormap
    var name = data.colormap ? data.colormap : self.defaultColormap
    var color = colormap(name)
    var zdomain = utils.linspace(zmin, zmax, 9)
    var z = d3.scale.linear().domain(zdomain).range(color);

    // set up x and y scales and ranges
    var y = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]).domain(d3.range(nrow));
    var x = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]).domain(d3.range(ncol));
    var maxY = nrow * y.rangeBand();
    var maxX = ncol * x.rangeBand();

    // set up variables to toggle with keypresses
    var clist = ['Purples', 'Blues', 'Greens', 'Oranges', 'Reds', 'Greys', 'Lightning']
    var cindex = 0
    var scale = 0

    // create canvas
    var canvas = d3.select(selector)
        .append('canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .node().getContext("2d")

    // add keydown events
    d3.select('body').on('keydown', update)

    // create dummy container for data binding
    var detachedContainer = document.createElement("custom");
    var dataContainer = d3.select(detachedContainer);

    // drawing wrapper to handle binding
    function drawCustom(data) {

        var dataBinding = dataContainer.selectAll("custom.rect")
            .data(data);

        dataBinding
            .attr("fillStyle", function(d) {return z(d.z)});
          
        dataBinding.enter()
            .append("custom")
            .classed("rect", true)
            .attr("x", function(d) {return x(d.x)})
            .attr("y", function(d, i) {return y(d.y)})
            .attr("width", y.rangeBand())
            .attr("height", x.rangeBand())
            .attr("fillStyle", function(d) {return z(d.z)})
            .attr("strokeStyle", "white")
            .attr("lineWidth", strokeWidth)
  
        drawCanvas();
    
    }

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

    // update event for keypresses
    // TODO supplement with a window
    function update() {
        if (d3.event.keyCode == 38 | d3.event.keyCode == 40) {
            d3.event.preventDefault();
            if (d3.event.keyCode == 38) {
                scale = scale + 0.05
                if (scale > 0.4) {
                    scale = 0.4
                }
            }
            if (d3.event.keyCode == 40) {
                scale = scale - 0.05
                if (scale < -3) {
                    scale = -3
                }
            }
            var extent = zmax - zmin
            zdomain = utils.linspace(zmin + extent * scale, zmax - extent * scale, 9)
            z.domain(zdomain)
            drawCustom(entries);
        }
        if (d3.event.keyCode == 37 | d3.event.keyCode == 39) {
            d3.event.preventDefault();
            if (d3.event.keyCode == 37) {
                cindex = cindex - 1
                if (cindex < 0) {
                    cindex = clist.length - 1
                }
            }
            if (d3.event.keyCode == 39) {
                cindex = cindex + 1
                if (cindex > clist.length - 1) {
                    cindex = 0
                }
            }
            color = colormap(clist[cindex])
            z.range(color)
            drawCustom(entries);
        }
    }

    drawCustom(entries)

};

Matrix.prototype._formatData = function(data) {

    var entries = []
    _.each(data.matrix, function(d, i) {
        _.each(d, function(e, j) {
            var p = {}
            p.x = j
            p.y = i
            p.z = e
            entries.push(p)
        })
    });

    var nrow = data.matrix.length
    var ncol = data.matrix[0].length

    return {entries: entries, nrow: nrow, ncol: ncol, colormap: data.colormap}

}

module.exports = Matrix;
