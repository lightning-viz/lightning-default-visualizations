'use strict';

var d3 = require('d3');
var _ = require('lodash');

var L = require('leaflet');
var Color = require('color');
var id = 0;


var margin = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
};


var Matrix = function(selector, data, images, opts) {

    this.mid = id++;
    this.markup = '<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css"/><div id="matrix-map-' + this.mid + '" class="matrix-map"></div>';

    opts = opts || {};

    var width = (opts.width || $(selector).width()) - margin.left - margin.right;
    var height = (opts.height || (width * 0.6)) - margin.top - margin.bottom;

    var matrix = [];
    var nodes = data.nodes;
    var n = nodes.length;
    var color = d3.scale.category10().domain(d3.range(10));
    
    var x = d3.scale.ordinal().rangeBands([0, Math.min(width, height)]);

    var zrng = d3.extent(data.links, function(d) {
            return d.value;
        });
    var z = d3.scale.linear().domain([zrng[0], zrng[1]]).clamp(true);

    nodes.forEach(function(node, i) {
        node.index = i;
        matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
    });

    data.links.forEach(function(link) {
        matrix[link.source][link.target].z += link.value;
    });


    x.domain(d3.range(n).sort(function(a, b) { return nodes[b].group - nodes[a].group; }));

    var buildRGBA = function(fill, opacity) {
        var color = Color(fill);
        color.alpha(opacity);
        return color.rgbString();
    };

    buildRGBA = _.memoize(buildRGBA, function(fill, opacity) {
        return fill + ',' + opacity;
    });

    var maxX = matrix.length * x.rangeBand();
    var maxY = matrix[0].length * x.rangeBand();

    var bounds = [[0, 0], [maxX, maxY]];


    this.$el = $(selector).first();
    this.$el.append(this.markup);

    this.$el.find('#matrix-map-' + this.mid).width(maxX).height(maxY);

    var map = L.map('matrix-map-' + this.mid, {
        center: [maxX/2, maxY/2],
        attributionControl: false,
        zoomControl: false,
        crs: L.CRS.Simple,
    });

    map.fitBounds(bounds);
    map.setMaxBounds(bounds);


    setTimeout(function() {
        _.each(matrix, function(row, i) {
            _.each(row, function(cell) {

                var xPos = x(cell.x);
                var yPos = x(i);
                var b = [[xPos, yPos], [xPos + x.rangeBand(), yPos + x.rangeBand()]];
                var fillColor = nodes[cell.x].group === nodes[cell.y].group ? color(nodes[cell.x].group) : null;
                L.rectangle(b, {color: buildRGBA(fillColor, z(cell.z)), weight: 1}).addTo(map);

            });
        });    
    }, 0);
    

};


module.exports = Matrix;
