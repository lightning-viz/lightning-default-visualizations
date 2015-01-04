var d3 = require('d3');
var _ = require('lodash');
var templateHTML = require('./gallery.jade');
var Img = require('../viz/image');


var Gallery = function(selector, data, images, opts) {
    this.$el = $(selector).first();
    this.selector = selector;
    this.images = images || [];
    this._init();
};

Gallery.prototype._init = function() {

    this.currentImage = 0;

    this.$el.html(templateHTML({
        images: this.images,
        currentImage: this.currentImage
    }));

    var self = this;
    this.$el.find('.gallery-thumbnail').unbind().click(function() {
        self.setImage(self.$el.find('.gallery-thumbnail').index(this));
    });


    this.imageViz = new Img(this.selector + ' .image-container', [], [this.images[0]], {width: this.$el.width() || 400});    
};


module.exports = Gallery;


Gallery.prototype.addImage = function(imageData) {
    this.images.push(imageData);
    this.$el.find('.gallery-container').append('<div class="gallery-thumbnail"><img src="' + imageData + '_small" /></div>');
};


Gallery.prototype.setImage = function(index) {
    this.imageViz.setImage(this.images[index]);
};



Gallery.prototype.updateData = function(data) {
    this.images = data;
    this._init();
};

Gallery.prototype.appendData = function(data) {
    // can be a single image or an array of images
    
    if(_.isArray(data)) {
        _.each(data, function(image) {
            this.addImage(image);        
        });
    } else {
        this.addImage(data);
    }

};
