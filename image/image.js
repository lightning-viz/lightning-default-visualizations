'use strict';

var markup = '<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css"/><div id="map"></div>';
var utils = require('lightning-client-utils');
var L = require('leaflet')
var F = require('leaflet.freedraw-browserify')
F(L)

// code adopted from http://kempe.net/blog/2014/06/14/leaflet-pan-zoom-image.html

var ImageViz = function(selector, data, images, opts) {

    var image = images[0];
    var clickCount = 0;

    this.$el = $(selector).first();
    this.$el.append(markup);

    var self = this;

    this.$el.click(function() {
        clickCount++;
        utils.updateSettings(self, {
            clickCount: clickCount
        }, function(err) {
            console.log('saved user data');
        });
    });

    utils.getSettings(this, function(err, settings) {

        console.log(settings);
        if(!err) {
            clickCount = settings.clickCount;
        }
        
    });

    opts = opts || {};

    var maxWidth = this.$el.width();

    // create an image so we can get aspect ratio
    var img = new Image();
    var self = this
    img.src = image

    img.onload = function() {

        // get image dimensions
        var imw = img.width
        var imh = img.height

        // use image dimensions to set css
        var w = maxWidth,
            h = maxWidth * (imh / imw)

        self.$el.find('#map').width(w).height(h)

        //create the map
        var map = L.map('map', {
            minZoom: 1,
            maxZoom: 8,
            center: [w/2, h/2],
            zoom: 1,
            attributionControl: false,
            zoomControl: false,
            crs: L.CRS.Simple,
        });
             
        // calculate the edges of the image, in coordinate space
        var southWest = map.unproject([0, h], 1);
        var northEast = map.unproject([w, 0], 1);
        var bounds = new L.LatLngBounds(southWest, northEast);
         
        // add the image overlay to cover the map
        L.imageOverlay(image, bounds).addTo(map);
         
        // tell leaflet that the map is exactly as big as the image
        map.setMaxBounds(bounds);

        // add free drawing
        var freeDraw = new L.FreeDraw({
          mode: L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.DELETE | L.FreeDraw.MODES.DELETE
        });

        freeDraw.options.attemptMerge = false
        freeDraw.options.setHullAlgorithm('brian3kb/graham_scan_js')
        freeDraw.options.setSmoothFactor(0)

        map.addLayer(freeDraw)

        d3.select('body').on('keydown', keydown).on('keyup', keyup);

        function keydown() {
            if (d3.event.altKey) {
                freeDraw.setMode(L.FreeDraw.MODES.EDIT)
            }
            if (d3.event.metaKey | d3.event.shiftKey) {
                freeDraw.setMode(L.FreeDraw.MODES.VIEW)
            }
        }

        function keyup() {
            freeDraw.setMode(L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.DELETE)
        }


        // test extracting coordinates from regions

        // setInterval(function(d) {
        
        //     var n = freeDraw.memory.states.length
        //     var coords = freeDraw.memory.states[n-1].map( function(d) {
        //         var points = []
        //         d.forEach(function (p) {
        //             var newpoint = map.project(p, 1)
        //             newpoint.x *= (imw / w)
        //             newpoint.y *= (imh / h)
        //             points.push(newpoint)
        //         })
        //         return points
        //     })

        //     console.log(coords)

        // }, 5000)

    }

};


module.exports = ImageViz;


ImageViz.prototype.setImage = function(image) {
    this.img = image;
};


ImageViz.prototype.updateData = function(image) {
    // in this case data should just be an image
    this.setImage(image);
};
