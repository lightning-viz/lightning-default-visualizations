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

    utils.fetchData(this, ['timeseries', 0], function(err, data) {
        if(!err) {
            line = new LineChart(selector + ' #line-chart', Array.apply(null, new Array(data.length)).map(Number.prototype.valueOf,0), null, {width: $(selector).width(), height: 300, zoomAxes: ['x']});
        } else {
            line = new LineChart(selector + ' #line-chart', [], null, {width: $(selector).width(), height: 300, zoomAxes: ['x']});
        }
    });

    var r;

    var self = this;
    scatter.on('hover', function(d) {
        utils.fetchData(self, ['timeseries', d.i], function(err, data) {
            if(!err) {
                line.updateData(data);   
            }
        });
    });
};

module.exports = ROIViz;
