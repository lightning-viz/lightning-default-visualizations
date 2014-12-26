var d3 = require('d3');

var inherits = require('inherits');
var utils = require('lightning-client-utils');

var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 45
};


var ScatterPlot = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = (opts.height || (this.width * 0.6)) - margin.top - margin.bottom;

    this.data = this._formatData(data)
    this.selector = selector;
    this.defaultFill = '#deebfa'
    this.defaultStroke = '#68a1e5'
    this.defaultSize = 8
    this.defaultAlpha = 0.9
    this._init();

};

inherits(ScatterPlot, require('events').EventEmitter);

module.exports = ScatterPlot;

ScatterPlot.prototype._init = function() {

    var data = this.data
    var height = this.height
    var width = this.width
    var opts = this.opts
    var selector = this.selector
    var self = this

    var xDomain = d3.extent(data, function(d) {
            return d.x;
        });
    var yDomain = d3.extent(data, function(d) {
            return d.y;
        });

    this.x = d3.scale.linear()
        .domain([xDomain[0] - 1, xDomain[1] + 1])
        .range([0, width]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - 1, yDomain[1] + 1])
        .range([height, 0]);

    var zoom = d3.behavior.zoom()
        .x(this.x)
        .y(this.y)
        .on('zoom', zoomed);

    var svg = d3.select(selector)
        .append('svg')
        .attr('class', 'scatter-plot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoom);

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'plot');

    var makeXAxis = function () {
        return d3.svg.axis()
            .scale(self.x)
            .orient('bottom')
            .ticks(5);
    };

    var makeYAxis = function () {
        return d3.svg.axis()
            .scale(self.y)
            .orient('left')
            .ticks(5);
    };

    this.xAxis = d3.svg.axis()
        .scale(self.x)
        .orient('bottom')
        .ticks(5);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(self.xAxis);

    this.yAxis = d3.svg.axis()
        .scale(self.y)
        .orient('left')
        .ticks(5);

    svg.append('g')
        .attr('class', 'y axis')
        .call(self.yAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));

    svg.append('g')
        .attr('class', 'y grid')
        .call(makeYAxis()
                .tickSize(-width, 0, 0)
                .tickFormat(''));

    function darken(d, i) {
        var point = d3.select(this)
        var newcolor = d3.hsl(point.style('fill')).darker(0.5)
        point.style('fill', d3.rgb(newcolor))
        self.emit('hover', d);
        console.log('in: ' + i);
    }

    function brighten(d, i) {
        var point = d3.select(this)
        var newcolor = d3.hsl(point.style('fill')).brighter(0.5)
        point.style('fill', d3.rgb(newcolor))
        console.log('out: ' + i);
    }

    svg.selectAll('.dot')
        .data(data)
      .enter().append('circle')
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s == null ? self.defaultSize : d.s)})
        .attr('transform', function(d) {
            return 'translate(' + self.x(d.x) + ',' + self.y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c == null ? self.defaultFill : d.c);})
        .style('stroke',function(d) { return (d.c == null ? self.defaultStroke : d.c.darker(0.75));})
        .style('fill-opacity',function(d) { return (d.a == null ? self.defaultAlpha : d.a);})
        .style('stroke-opacity',function(d) { return (d.a == null ? self.defaultAlpha : d.a);})
        .on('mouseover', darken)
        .on('mouseout', brighten);

    function zoomed() {
        svg.select('.x.axis').call(self.xAxis);
        svg.select('.y.axis').call(self.yAxis);
        svg.select('.x.grid')
            .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));
        svg.select('.y.grid')
            .call(makeYAxis()
                    .tickSize(-width, 0, 0)
                    .tickFormat(''));

        svg.selectAll('circle')
            .attr('transform', function(d) {
                return 'translate(' + self.x(d.x) + ',' + self.y(d.y) + ')';
            });
    }
    
    this.brighten = brighten;
    this.darken = darken;
    this.svg = svg;

}

ScatterPlot.prototype._formatData = function(data) {

    var getColorFromData = function(data) {

        if(data.hasOwnProperty('label')) {

            // get bounds and number of labels
            label = data.label
            var mn = d3.min(label, function(d) {return d; });
            var mx = d3.max(label, function(d) {return d; });
            var n = mx - mn + 1
            var colors = utils.getColors(n)

            // get an array of d3 colors
            retColor = label.map(function(d) {return d3.rgb(colors[d - mn])});

        } else if (data.hasOwnProperty('color')) {

            // get an array of d3 colors directly from r,g,b values
            color = data.color
            retColor = color.map(function(d) {return d3.rgb(d[0], d[1], d[2])})

        } else {

            // otherwise return empty
            retColor = []
        }

        return retColor
    }

    var getPropertyFromData = function(data, name) {

        if (data.hasOwnProperty(name)) {
            ret = data[name]
        } else {
            ret = []
        }
        return ret
    }

    retColor = getColorFromData(data)
    retSize = getPropertyFromData(data, 'size')
    retAlpha = getPropertyFromData(data, 'alpha')

    if (data.hasOwnProperty('points')) {
        points = data.points
    } else {
        points = data
    }

    return points.map(function(d, i) {
        d.x = d[0]
        d.y = d[1]
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        d.a = retAlpha.length > 1 ? retAlpha[i] : retAlpha[0]
        return d
    })

};

ScatterPlot.prototype.updateData = function(data) {
    
    // update existing points, add new ones
    // and delete old ones
   
    self = this
    var x = this.x
    var y = this.y

    var newdat = this.svg.selectAll('circle')
        .data(this._formatData(data))
        
    newdat.transition().ease('linear')
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s == null ? self.defaultSize : d.s)})
        .attr('transform', function(d) {
            return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c == null ?  self.defaultFill : d.c);})
        .style('stroke',function(d) { return (d.c == null ? self.defaultStroke : d.c.darker(0.75));})
        .style('fill-opacity',function(d) { return (d.a == null ? self.defaultAlpha : d.a);})
        .style('stroke-opacity',function(d) { return (d.a == null ? self.defaultAlpha : d.a);})

    newdat.enter()
        .append('circle')
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
        .style('opacity', 0.0)
        .attr('class','dot')
        .attr('r', function(d) { return (d.s == null ? self.defaultSize : d.s)})
        .attr('transform', function(d) {return 'translate(' + x(d.x) + ',' + y(d.y) + ')';})
        .style('fill',function(d) { return (d.c == null ? self.defaultFill : d.c);})
        .style('stroke',function(d) { return (d.c == null ? self.defaultStroke : d.c.darker(0.75));})
        .style('fill-opacity', function(d) { return (d.a == null ? self.defaultOpacity : d.a)})
        .style('stroke-opacity',function(d) { return (d.a == null ? self.defaultAlpha : d.a);})
      .transition().ease('linear')
        .duration(300)
        .style('opacity', 1.0)
        
    newdat.exit().transition().ease('linear')
        .style('opacity', 0.0).remove()
    
};

ScatterPlot.prototype.appendData = function(data) {
    
    // add new points to existing points
   
    this.data = this.data.concat(this._formatData(data))
    data = this.data

    self = this
    var x = this.x
    var y = this.y
    
    this.svg.selectAll('circle')
        .data(data)
      .enter().append('circle')
        .style('opacity', 0.0)
        .attr('class', 'dot')
        .attr('r',6)
        .attr('transform', function(d) {return 'translate(' + x(d.x) + ',' + y(d.y) + ')';})
        .style('fill',function(d) { return (d.c == null ? self.defaultFill : d.c);})
        .style('stroke',function(d) { return (d.c == null ? self.defaultStroke : d.c.darker(0.75));})
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
      .transition()
        .ease('linear')
        .duration(300)
        .style('opacity', 1.0)
};