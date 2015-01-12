var THREE = require('three.js');
var _ = require('lodash');
var d3 = require('d3');
var utils = require('lightning-client-utils')
require('three-fly-controls')(THREE);

var Particles = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts
    this.width = (opts.width || $(selector).width());
    this.height = (opts.height || (this.width * 0.6));

    this.data = this._formatData(data)
    this.defaultColor = d3.rgb('#A38EF3')
    this.selector = selector;
    this._init();

}

Particles.prototype._init = function() {

    var width = this.width;
    var height = this.height;
    var selector = this.selector;
    var data = this.data;
    var points = data.points;

    var container, stats;
    var controls;
    var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
    var mouseX = 0, mouseY = 0;

    var halfWidth = width / 2;
    var halfHeight = height / 2;

    var self = this;

    function init() {

        camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 3000 );
        
        scene = new THREE.Scene();
        //scene.fog = new THREE.FogExp2( 0x000000, 0.001 );
        geometry = new THREE.Geometry();

        var avgs = [0, 0, 0];

        _.each(data.points, function(p) {
            avgs[0] += p.y;
            avgs[1] += p.z;
            avgs[2] += p.x;
        });

        avgs = _.map(avgs, function(n) { return n / data.points.length; });

        max = d3.max(data.points, function(p) {return p.z})

        var colors = [];

        _.each(data.points, function(p, i) {
            var vertex = new THREE.Vector3();
            vertex.x = p.y - avgs[0];
            vertex.y = p.z - avgs[1];
            vertex.z = p.x - avgs[2];
            geometry.vertices.push( vertex );
            colors[i] = new THREE.Color();
            var rgb = p.c || self.defaultColor;
            colors[i].setRGB(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        });

        THREE.ImageUtils.crossOrigin = '';
        var sprite = THREE.ImageUtils.loadTexture( "http://i.gif.fm/janelia-images/textures/disc.png" );

        geometry.colors = colors

        camera.position.y = 0;
        camera.position.x = -max*1.75;
        camera.position.z = 1;
        
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        var material = new THREE.PointCloudMaterial({ 
            size: 25,
            map: sprite,
            transparent: true,
            sizeAttenuation: false,
            vertexColors: THREE.VertexColors,
            opacity: 0.9
        });
        
        particles = new THREE.PointCloud( geometry, material );
        particles.sortParticles = true;
        scene.add( particles );

        renderer = new THREE.WebGLRenderer({alpha: true});        
        renderer.setSize( width, height );
        $(selector)[0].appendChild( renderer.domElement );

        $('canvas').css('border','1px solid rgb(200,200,200)')
        $('canvas').css('outline','-moz-outline-style: none; ')

        self.scene = scene;
        self.parameters = parameters;
        controls = new THREE.FlyControls(camera, $(selector)[0]);

    }

    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    function render() {
        controls.update();
        renderer.render( scene, camera );
    }

    init();
    animate();

};

Particles.prototype._formatData = function(data) {

    retColor = utils.getColorFromData(data)

    data.points = data.points.map(function(d, i) {
        var p = []
        p.x = d[0]
        p.y = d[1]
        p.z = d[2]
        p.i = i
        p.c = retColor.length > 1 ? retColor[i] : retColor[0]
        return p
    })

    return data

}

module.exports = Particles;


