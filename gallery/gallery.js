var d3 = require('d3');
var _ = require('lodash');
var templateHTML = require('./gallery.jade');
var ImageViz = require('../viz/image');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};

var width = 600 - margin.left - margin.right;
var height = 300 - margin.top - margin.bottom;


var GalleryViz = function(selector, data, images, opts) {


    this.$el = $(selector).first();
    this.selector = selector;
    
    this.currentImage = 0;
    this.images = images || [];

    this.$el.append(templateHTML({
        images: this.images,
        currentImage: this.currentImage
    }));

    var self = this;
    this.$el.find('.gallery-thumbnail').click(function() {
        console.log(self.$el.find('.gallery-thumbnail').index(this));
        self.setImage(self.$el.find('.gallery-thumbnail').index(this));
    });

    this.imageViz = new ImageViz(selector + ' .image-container', [], [this.images[0]]);

};


module.exports = GalleryViz;


GalleryViz.prototype.addImage = function(imageData) {
    // this.images.push(imageData);
    // this.$el.find('input.image-slider').attr('max', this.images.length - 1);
    // this.setImage(this.images.length - 1);
};


GalleryViz.prototype.setImage = function(index) {
    this.$el.find('.image-container').html();
    this.imageViz = new ImageViz(this.selector + ' .image-container', [], [this.images[index]]);
};



GalleryViz.prototype.updateData = function(data) {
    // in this case data should just be an image
    this.addImage(data);
};
