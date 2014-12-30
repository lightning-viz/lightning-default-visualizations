var d3 = require('d3');
var _ = require('lodash');
var templateHTML = require('./scatter-line.jade');
var utils = require('lightning-client-utils');


var ScatterLine = function(selector, data, images, options) {

    var $el = $(selector).first();
    $el.append(templateHTML());
    this.$el = $el;

    var Scatter = require('../viz/scatter');
    var scatter = new Scatter(selector + ' #scatter-plot', data, null, {width: $(selector).width(), height: Math.min(500, $(selector).width * 0.6)});
    var Line = require('../viz/line');
    var line;

    utils.fetchData(this, ['series', 0], function(err, data) {
        if(!err) {
            var series = data
            var newdata = {'series': _.times(series.length, _.constant(0))};
            line = new Line(selector + ' #line-chart', newdata, null, {width: $(selector).width(), height: 300, zoomAxes: ['x']});
        } else {
            line = new Line(selector + ' #line-chart', [], null, {width: $(selector).width(), height: 300, zoomAxes: ['x']});
        }
    });

    var r;

    var self = this;
    scatter.on('hover', function(d) {
        utils.fetchData(self, ['series', d.i], function(err, data) {
            if(!err) {
                var series = data
                var newdata = {'series': series};
                if (d.c) {
                    newdata.color = [[d.c.r, d.c.g, d.c.b]]
                }
                line.updateData(newdata);   
            }
        });
    });
};

module.exports = ScatterLine;
