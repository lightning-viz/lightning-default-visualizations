var THREE = require('three.js');
var _ = require('lodash');
require('three-fly-controls')(THREE);

var Volume = function(selector, data, images, opts) {

    images = images || [];
    opts = opts || {};

    var width = $(selector).width();
    var height = width * 0.7;


    var container, stats;
    var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
    var controls;
    var boxMesh, boxGeometry;
    var self = this;
    this.images = [];

    function init() {

        renderer = new THREE.WebGLRenderer({ alpha: true});
        renderer.setSize( width, height );

        $(selector)[0].appendChild( renderer.domElement );

        camera = new THREE.PerspectiveCamera( 50, width / height, 1, 500 );
        camera.position.z = 175;

        scene = new THREE.Scene();
        THREE.ImageUtils.crossOrigin = '';

        // todo - get image size, 
        //        get orientation from options
        
        _.each(images, function(i) {
            self.addImage(i);
        });            

        camera.lookAt(new THREE.Vector3(0,0,175));

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

    this.scene = scene;
    this.opts = opts;
    

};


Volume.prototype.addImage = function(imageData) {
    this.images.push(imageData);
    var i = this.images.length-1;

    var self = this;

    var img = new Image();
    
    img.src = imageData;

    img.onload = function() {

        var geometry = new THREE.PlaneGeometry( img.width, img.height, 1 );
        
        THREE.ImageUtils.crossOrigin = '';
        var texture = THREE.ImageUtils.loadTexture( img.src );
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        var material = new THREE.MeshBasicMaterial( {map: texture, opacity: 0.1, transparent: true, blending: THREE.NormalBlending  } );
        material.side = THREE.DoubleSide;
        

        mesh = new THREE.Mesh( geometry,  material );
        mesh.position.z = i;
        if(self.opts.rotateZ) {
            mesh.rotation.z = Math.PI / 2;
        }
        self.scene.add( mesh );
    }

};

Volume.prototype.appendData = function(data) {
    // can be a single image or an array of images
    
    if(_.isArray(data)) {
        _.each(data, function(image) {
            this.addImage(image);        
        });
    } else {
        this.addImage(data);
    }

};


module.exports = Volume;


