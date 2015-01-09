'use strict';

var d3 = require('d3');
var _ = require('lodash');
var utils = require('lightning-client-utils')
var colorbrewer = require('colorbrewer')

var L = require('leaflet');
var Color = require('color');
var id = 0;

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
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

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

    this.mid = id++;
    this.markup = '<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css"/><div id="adjacency-map-' + this.mid + '" class="adjacency-map"></div>';

    var matrix = data.matrix;
    var label = data.label;
    var color = utils.getColors(_.uniq(label).length);

    // get min and max of matrix value data
    var zmin = d3.min(data.matrix, function(d) {
        return d3.min(d, function(e) {
            return e.z
        });
    });
    var zmax = d3.max(data.matrix, function(d) {
        return d3.max(d, function(e) {
            return e.z
        });
    });

    // set up opacity scale
    var z = d3.scale.linear().domain([0, zmax/3]).range([0.3,1]).clamp(true);

    // set up x and y scales and ranges
    var nrow = matrix.length
    var ncol = matrix[0].length
    var y = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]);
    var x = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]);
    y.domain(d3.range(nrow).sort(function(a, b) { return label[b] - label[a]; }));
    x.domain(d3.range(ncol).sort(function(a, b) { return label[b] - label[a]; }))
    var maxY = nrow * y.rangeBand();
    var maxX = ncol * x.rangeBand();

    // bounds for the graphic
    var bounds = [[0, 0], [maxY, maxX]];

    // create the graphic as a map
    this.$el = $(selector).first();
    this.$el.append(this.markup);
    this.$el.find('#matrix-map-' + this.mid).width(maxX).height(maxY);

    var map = L.map('matrix-map-' + this.mid, {
        center: [maxX/2, maxY/2],
        attributionControl: false,
        zoomControl: false,
        crs: L.CRS.Simple,
    });

    // set the bounds
    map.fitBounds(bounds);
    map.setMaxBounds(bounds);

    // function for handling opacity
    var buildRGBA = function(fill, opacity) {
        var color = Color(fill);
        color.alpha(opacity);
        return color.rgbString();
    };
    buildRGBA = _.memoize(buildRGBA, function(fill, opacity) {
        return fill + ',' + opacity;
    });

    // render the rectangles
    setTimeout(function() {
        _.each(matrix, function(row, i) {
            _.each(row, function(cell, j) {
                var xPos = x(cell.x);
                var yPos = y(i);
                var b = [[yPos, xPos], [yPos + y.rangeBand(), xPos + x.rangeBand()]];
                if (label[i] == label[j]) {
                    var fillColor = color[label[i]]
                } else {
                    var fillColor = "rgb(50,50,50)"
                }
                if (cell.z > 0) {
                    var cellColor = buildRGBA(fillColor, z(cell.z))
                } else {
                    var cellColor = buildRGBA("rgb(240,240,240)", 1.0)
                }
                L.rectangle(b, {color: cellColor, weight: 0.7, className: "cell"}).addTo(map);
            });
        });    
    }, 0);
    

};

Adjacency.prototype._formatData = function(data) {

    var matrix = [];
    var n = data.nodes.length
    data.nodes.forEach(function(node, i) {
        matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
    });

    data.links.forEach(function(link) {
        matrix[link[0]][link[1]].z = link[2];
        matrix[link[0]][link[0]].z = 1;
        matrix[link[1]][link[1]].z = 1;
    });

    data.matrix = matrix

    data.label = data.label ? data.label : _.times(n, _.constant(0));

    var min = d3.min(data.label);
    data.label = data.label.map(function(d) {return d - min});

    return data

}

module.exports = Adjacency;
