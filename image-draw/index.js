'use strict';

var utils = require('lightning-client-utils');
var inherits = require('inherits');
var d3 = require('d3');
var validator = require("geojson-validation");
var L = require('leaflet');
var F = require('leaflet.freedraw-browserify');
F(L);

// code adopted from http://kempe.net/blog/2014/06/14/leaflet-pan-zoom-image.html

var ImgDraw = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts

    this.data = this._formatData(data)
    this.images = images
    this.selector = selector;

    this._init();
}

inherits(ImgDraw, require('events').EventEmitter);

module.exports = ImgDraw;

ImgDraw.prototype._init = function() {

    var opts = this.opts;
    var data = this.data;
    var images = this.images;
    var selector = this.selector;
    var self = this;

    this.mid = utils.getUniqueId();
    this.markup = '<link rel="stylesheet" href="https://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css"/><div id="image-map-' + this.mid + '" class="image-map"></div>';

    var image = images[0];
    var coords = [];

    this.$el = $(selector).first();
    this.$el.append(this.markup);

    var maxWidth = this.$el.width();

    // create an image so we can get aspect ratio
    this.img = new Image();
    var img = this.img;
    img.src = (window.lightning && window.lightning.host) ? window.lightning.host + image : image;

    img.onload = function() {

        // get image dimensions
        var imw = img.width;
        var imh = img.height;

        // use image dimensions to set css
        var w = maxWidth,
            h = maxWidth * (imh / imw);

        self.$el.find('#image-map-' + self.mid).width(w).height(h);

        //create the map
        if(self.map) {
            self.map.remove();    
        }
        self.map = L.map('image-map-' + self.mid, {
            minZoom: 1,
            maxZoom: 8,
            center: [w/2, h/2],
            zoom: 1,
            attributionControl: false,
            zoomControl: false,
            crs: L.CRS.Simple,
        });
        
        var map = self.map;
             
        // calculate the edges of the image, in coordinate space
        var southWest = map.unproject([0, h], 1);
        var northEast = map.unproject([w, 0], 1);
        var bounds = new L.LatLngBounds(southWest, northEast);
         
        // add the image overlay to cover the map
        L.imageOverlay(img.src, bounds).addTo(map);
         
        // tell leaflet that the map is exactly as big as the image
        map.setMaxBounds(bounds);

        // add free drawing
        var freeDraw = new L.FreeDraw({
          mode: L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.DELETE | L.FreeDraw.MODES.DELETE,
        });

        // set free drawing options
        freeDraw.options.attemptMerge = false;
        freeDraw.options.setHullAlgorithm('brian3kb/graham_scan_js');
        freeDraw.options.setSmoothFactor(0);
        
        // add the free drawing layer
        map.addLayer(freeDraw);

        // initialize with any polygons from the data
        var polygons = data.polygons

        polygons = polygons.map(function (g) {
            var converted = []
            g.map(function (p) {
                var newp = new L.point(p[0] / (imw / w), p[1] / (imh / h), false)
                var newpoint = map.unproject(newp, 1)
                converted.push(newpoint)
            })
            return converted
        })

        console.log(polygons)

        //freeDraw.createPolygon([new L.LatLng(-120, 175.5), new L.LatLng(-150, 132.5), new L.LatLng(-110.5, 135.5), new L.LatLng(-103.5, 172)])

        freeDraw.options.simplifyPolygon = false;
        polygons.forEach(function (g) {
            freeDraw.createPolygon(g, true)
        })
        freeDraw.options.simplifyPolygon = true;

        d3.select('body').on('keydown', keydown).on('keyup', keyup);

        var clist = ["rgb(255,255,255)", "rgb(240,30,110)", "rgb(46,170,275)"]
        var cindex = 0

        function updateStyles() {
            var base = d3.hsl(clist[cindex])
            var fill = d3.hsl(clist[cindex])
            fill.l = fill.l * 1.3
            self.$el.find(".image-map g path").css("stroke", base)
            self.$el.find(".image-map g path").css("fill", fill.toString())
        }

        function keydown() {
            if (d3.event.altKey) {
                freeDraw.setMode(L.FreeDraw.MODES.EDIT)
            }
            if (d3.event.metaKey | d3.event.shiftKey) {
                freeDraw.setMode(L.FreeDraw.MODES.VIEW)
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
                updateStyles()
            }
        }

        function keyup() {
            freeDraw.setMode(L.FreeDraw.MODES.CREATE | L.FreeDraw.MODES.DELETE)
        }

        self.emit('image:loaded');

        self.$el.unbind().click(function() {

            // extract coordinates from regions
            var n = freeDraw.memory.states.length;
            var coords = freeDraw.memory.states[n-1].map( function(d) {
                var points = [];
                d.forEach(function (p) {
                    var newpoint = map.project(p, 1);
                    newpoint.x *= (imw / w);
                    newpoint.y *= (imh / h);
                    points.push([newpoint.x, newpoint.y]);
                });
                return points;
            });

            utils.updateSettings(self, {
                coords: coords
            }, function(err) {
                console.log('saved user data');
                console.log(coords);
            });
        });

        utils.getSettings(self, function(err, settings) {

            console.log(settings);
            if(!err) {
                coords = settings.coords;
            }
            
        });

    }

};


ImgDraw.prototype._formatData = function(data) {

    var polygons = []

    if (validator.isFeatureCollection(data)) {
        data.features.forEach(function(d) {
            if (validator.isFeature(d)) {
                if (validator.isPolygon(d.geometry)) {
                    polygons.push(d.geometry.coordinates[0])
                }
            }
        })
    } else if (data.features) {
        data.features.forEach(function(d) {
            polygons.push(d.coordinates)
        })
    } else {
        throw "Input data not understood"
    }

    data.polygons = polygons
    return data
}


ImgDraw.prototype.setImage = function(image) {
    this.img.src = image;
};


ImgDraw.prototype.updateData = function(image) {
    // in this case data should just be an image
    this.setImage(image);
};
