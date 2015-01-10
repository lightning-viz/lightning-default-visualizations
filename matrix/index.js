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

    this.mid = utils.getUniqueId();

    this.markup = '<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css"/><div id="matrix-map-' + this.mid + '" class="matrix-map"></div>';

    var matrix = data.matrix;

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

    // set up color brewer
    // TODO add ability to select scale and update dynamically
    var cbrewn = 9
    var color = data.colormap ? colorbrewer[data.colormap][cbrewn] : colorbrewer[self.defaultColormap][cbrewn]
    var zdomain = d3.range(cbrewn).map(function(d) {return d * (zmax - zmin) / (cbrewn - 1) + zmin})
    var z = d3.scale.linear().domain(zdomain).range(color);

    // set up x and y scales and ranges
    var nrow = matrix.length
    var ncol = matrix[0].length
    var y = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]);
    var x = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]);
    y.domain(d3.range(nrow));
    x.domain(d3.range(ncol))
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

    // render the rectangles
    setTimeout(function() {
        _.each(matrix, function(row, i) {
            _.each(row, function(cell) {
                var xPos = x(cell.x);
                var yPos = y(i);
                var b = [[yPos, xPos], [yPos + y.rangeBand(), xPos + x.rangeBand()]];
                L.rectangle(b, {color: z(cell.z), weight: 0.7, smoothFactor: 1.0, className: "cell"}).addTo(map);
            });
        });    
    }, 0);
    

};

Matrix.prototype._formatData = function(data) {

    data.matrix = _.map(data.matrix, function(d, i) {
        return _.map(d, function(e, j) {
            var p = []
            p.x = j
            p.y = i
            p.z = e
            return p
        })
    });

    return data

}

module.exports = Matrix;
