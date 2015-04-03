'use strict';

var utils = require('lightning-client-utils');
var inherits = require('inherits');
var d3 = require('d3');
var L = require('leaflet');
var F = require('leaflet.freedraw-browserify');
F(L);

// code adopted from http://kempe.net/blog/2014/06/14/leaflet-pan-zoom-image.html

var Img = function(selector, data, images, opts) {

    this.mid = utils.getUniqueId();
    this.markup = '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css"/><div id="image-map-' + this.mid + '" class="image-map"></div>';

    var image = images[0];
    var coords = [];

    this.$el = $(selector).first();
    this.$el.append(this.markup);

    var self = this;

    opts = opts || {};

    var maxWidth = this.$el.width();

    // create an image so we can get aspect ratio
    this.img = new Image();
    var img = this.img;
    img.src = utils.cleanImageURL(image);

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

    }

};

inherits(Img, require('events').EventEmitter);


module.exports = Img;


Img.prototype.setImage = function(image) {
    this.img.src = image;
};


Img.prototype.updateData = function(image) {
    // in this case data should just be an image
    this.setImage(image);
};
