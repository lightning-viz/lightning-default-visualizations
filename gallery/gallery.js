var d3 = require('d3');
var _ = require('lodash');
var templateHTML = require('./gallery.jade');
var ImageViz = require('../viz/image');


var GalleryViz = function(selector, data, images, opts) {
    this.$el = $(selector).first();
    this.selector = selector;
    this.images = images || [];
    this._init();
};

GalleryViz.prototype._init = function() {

    this.currentImage = 0;

    this.$el.html(templateHTML({
        images: this.images,
        currentImage: this.currentImage
    }));

    var self = this;
    this.$el.find('.gallery-thumbnail').unbind().click(function() {
        self.setImage(self.$el.find('.gallery-thumbnail').index(this));
    });


    this.imageViz = new ImageViz(selector + ' .image-container', [], [this.images[0]], {width: this.$el.width() || 400});    
};


module.exports = GalleryViz;


GalleryViz.prototype.addImage = function(imageData) {
    this.images.push(imageData);
    this.$el.find('.gallery-container').append('<div class="gallery-thumbnail"><img src="' + imageData + '_small" /></div>');
};


GalleryViz.prototype.setImage = function(index) {
    
    this.imageViz = new ImageViz(this.selector + ' .image-container', [], [this.images[index]], {width: this.$el.width()});
    this.$el.find('.image-viz:gt(0)').remove();
};



GalleryViz.prototype.updateData = function(data) {
    this.images = data;
    this._init();
};

GalleryViz.prototype.appendData = function(data) {
    // in this case data should just be an image
    this.addImage(data);
};
