var THREE = require('three.js');
var _ = require('lodash');
var d3 = require('d3');
var utils = require('lightning-client-utils')
require('three-fly-controls')(THREE);
var inherits = require('inherits');


var Scatter3 = function(selector, data, images, opts) {

    if(!opts) {
        opts = {};
    }

    this.opts = opts
    this.width = (opts.width || $(selector).width());
    this.height = (opts.height || (this.width * 0.6));

    this.data = this._formatData(data)
    this.defaultColor = d3.rgb('#A38EF3')
    this.defaultSize = 6;
    this.selector = selector;
    this._init();

}

inherits(Scatter3, require('events').EventEmitter);


Scatter3.prototype._init = function() {

    var width = this.width;
    var height = this.height;
    var selector = this.selector;
    var data = this.data;
    var opts = this.opts;
    var points = data.points;

    var container, stats;
    var controls;
    var camera, headlight, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
    var mouseX = 0, mouseY = 0;

    var halfWidth = width / 2;
    var halfHeight = height / 2;

    var self = this;

    function init() {

        camera = new THREE.PerspectiveCamera( 50, width / height, 1, 3000 );
        headlight = new THREE.PointLight ( 0xFFFFFF, 1.0 );

        scene = new THREE.Scene();
        geometry = new THREE.Geometry();

        var avgs = [0, 0, 0];

        _.each(data.points, function(p) {
            avgs[0] += p.y;
            avgs[1] += p.z;
            avgs[2] += p.x;
        });

        avgs = _.map(avgs, function(n) { return n / data.points.length; });

        max = d3.max(data.points, function(p) {return Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))})
        
        // setup the graph axis
        //   

        var gridSize = 50 * max;
        var gridStep = max / 4;
        var lightLineMaterial = new THREE.LineBasicMaterial({
            color: 0xcccccc
        });
        var darkLineMaterial = new THREE.LineBasicMaterial({
            color: 0x444444
        });
        
        var lineGeometry, line; 
        // x
        for(var i=0; i<gridSize; i+=gridStep) {
            lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(new THREE.Vector3(0, i, 0));
            lineGeometry.vertices.push(new THREE.Vector3(gridSize, i, 0));
            if(i === 0) {
                line = new THREE.Line(lineGeometry, darkLineMaterial);    
            } else {
                line = new THREE.Line(lineGeometry, lightLineMaterial);    
            }
            
            scene.add(line);
        }
        for(var i=0; i<gridSize; i+=gridStep) {
            lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(new THREE.Vector3(0, 0, i));
            lineGeometry.vertices.push(new THREE.Vector3(gridSize, 0, i));
            if(i === 0) {
                line = new THREE.Line(lineGeometry, darkLineMaterial);    
            } else {
                line = new THREE.Line(lineGeometry, lightLineMaterial);    
            }
            
            scene.add(line);
        }
        for(var i=0; i<gridSize; i+=gridStep) {
            lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(new THREE.Vector3(0, i, 0));
            lineGeometry.vertices.push(new THREE.Vector3(0, i, gridSize));
            if(i === 0) {
                line = new THREE.Line(lineGeometry, darkLineMaterial);    
            } else {
                line = new THREE.Line(lineGeometry, lightLineMaterial);    
            }
            
            scene.add(line);
        }
        for(var i=0; i<gridSize; i+=gridStep) {
            lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(new THREE.Vector3(0, 0, i));
            lineGeometry.vertices.push(new THREE.Vector3(0, gridSize, i));
            if(i === 0) {
                line = new THREE.Line(lineGeometry, darkLineMaterial);    
            } else {
                line = new THREE.Line(lineGeometry, lightLineMaterial);    
            }
            
            scene.add(line);
        }
        for(var i=0; i<gridSize; i+=gridStep) {
            lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(new THREE.Vector3(i, 0, 0));
            lineGeometry.vertices.push(new THREE.Vector3(i, gridSize, 0));
            if(i === 0) {
                line = new THREE.Line(lineGeometry, darkLineMaterial);    
            } else {
                line = new THREE.Line(lineGeometry, lightLineMaterial);    
            }
            
            scene.add(line);
        }
        for(var i=0; i<gridSize; i+=gridStep) {
            lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(new THREE.Vector3(i, 0, 0));
            lineGeometry.vertices.push(new THREE.Vector3(i, 0, gridSize));
            if(i === 0) {
                line = new THREE.Line(lineGeometry, darkLineMaterial);    
            } else {
                line = new THREE.Line(lineGeometry, lightLineMaterial);    
            }
            
            scene.add(line);
        }

        var sphereGeometry, sphereMaterial, sphere, sphereOutline, sphereOutlineMaterial;
        var sphereMaterials = [];
        var sphereTotalGeom = new THREE.Geometry();

        _.each(data.points, function(p, i) {

            var s = p.s || self.defaultSize
            var widthSegments = Math.min(64, Math.max(8, 2 * 0.008 * max * s))
            var heightSegments = Math.min(64, Math.max(6, 2 * 0.008 * max * s))
            sphereGeometry = new THREE.SphereGeometry( 0.008 * max * s, widthSegments, heightSegments);

            var rgb = p.c || self.defaultColor;

            sphereMaterial = new THREE.MeshLambertMaterial( {  color: rgb.toString(), emissive: 0x333333, ambient: rgb.toString(), vertexColors: THREE.FaceColors} ) 

            sphereMaterials.push(sphereMaterial);
            sphereMaterial.opacity = p.a || 1;
            sphereMaterial.transparent = true;
            sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
            sphere.position.set(p.y, p.z, p.x);

            sphere.updateMatrix();
            sphereTotalGeom.merge(sphere.geometry, sphere.matrix, i);

        });

        var totalMaterials = new THREE.MeshFaceMaterial(sphereMaterials);
        var total = new THREE.Mesh(sphereTotalGeom, totalMaterials);
        total.updateMatrix();
        scene.add(total);


        var maxScale = 2.00
        var camPos = max * maxScale;

        camera.position.y = camPos;
        camera.position.x = camPos;
        camera.position.z = camPos;

        camera.lookAt(new THREE.Vector3(0, 0, 0));

        renderer = new THREE.WebGLRenderer({alpha: true, antialias:true});        
        renderer.setSize( width, height );
        $(selector)[0].appendChild( renderer.domElement );

        $('canvas').css('border','1px solid rgb(200,200,200)')
        $('canvas').css('outline','-moz-outline-style: none; ')

        scene.add(headlight);

        self.scene = scene;
        self.parameters = parameters;
        controls = new THREE.FlyControls(camera, $(selector)[0], { movementSpeed: 0.025 * max});

    }

    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    function render() {
        controls.update();
        headlight.position.copy( camera.position );
        renderer.render( scene, camera );
    }

    init();
    animate();

    this.scene = scene;
    this.max = max;

};

Scatter3.prototype._formatData = function(data) {

    retColor = utils.getColorFromData(data)
    retSize = data.size || []
    retAlpha = data.alpha || []

    data.points = data.points.map(function(d, i) {
        var p = []
        p.x = d[0]
        p.y = d[1]
        p.z = d[2]
        p.i = i
        p.c = retColor.length > 1 ? retColor[i] : retColor[0]
        p.s = retSize.length > 1 ? retSize[i] : retSize[0]
        p.a = retAlpha.length > 1 ? retAlpha[i] : retAlpha[0]
        return p
    })
    
    return data
}

Scatter3.prototype.appendData = function(newData) {

    newData = this._formatData(newData);

    var sphereGeometry, sphereMaterial, sphere, sphereOutline, sphereOutlineMaterial;
    var sphereMaterials = [];
    var sphereTotalGeom = new THREE.Geometry();

    _.each(data.points, function(p, i) {

        var s = p.s || self.defaultSize
        var widthSegments = Math.min(64, Math.max(8, 2 * 0.008 * max * s))
        var heightSegments = Math.min(64, Math.max(6, 2 * 0.008 * max * s))
        sphereGeometry = new THREE.SphereGeometry( 0.008 * max * s, widthSegments, heightSegments);

        var rgb = p.c || self.defaultColor;

        sphereMaterial = new THREE.MeshLambertMaterial( {  color: rgb.toString(), emissive: 0x333333, ambient: rgb.toString(), vertexColors: THREE.FaceColors} ) 

        sphereMaterials.push(sphereMaterial);
        sphereMaterial.opacity = p.a || 1;
        sphereMaterial.transparent = true;
        sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
        sphere.position.set(p.y, p.z, p.x);

        sphere.updateMatrix();
        sphereTotalGeom.merge(sphere.geometry, sphere.matrix, i);

    });

    var totalMaterials = new THREE.MeshFaceMaterial(sphereMaterials);
    var total = new THREE.Mesh(sphereTotalGeom, totalMaterials);
    total.updateMatrix();
    this.scene.add(total);

}

module.exports = Scatter3;


