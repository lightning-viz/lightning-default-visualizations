var d3 = require('d3');
var _ = require('lodash');
var templateHTML = require('./roi.jade');
var utils = require('lightning-client-utils');


var ROIViz = function(selector, data, images, options) {

    var $el = $(selector).first();
    $el.append(templateHTML());
    this.$el = $el;

    var ScatterPlot = require('../viz/scatter');
    var scatter = new ScatterPlot(selector + ' #scatter-plot', data, null, {width: $(selector).width(), height: Math.min(500, $(selector).width * 0.6)});
    var LineChart = require('../viz/line');
    var line;

    utils.fetchData(this, ['series', 0], function(err, data) {
        if(!err) {
            var series = data
            var newdata = {'series': _.times(series.length, _.constant(0))};
            line = new LineChart(selector + ' #line-chart', newdata, null, {width: $(selector).width(), height: 300, zoomAxes: ['x']});
        } else {
            line = new LineChart(selector + ' #line-chart', [], null, {width: $(selector).width(), height: 300, zoomAxes: ['x']});
        }
    });

    var r;

    var self = this;
    scatter.on('hover', function(d) {
        utils.fetchData(self, ['series', d.i], function(err, data) {
            if(!err) {
                var series = data
                var newdata = {'series': series};
                line.updateData(newdata);   
            }
        });
    });
};

module.exports = ROIViz;
