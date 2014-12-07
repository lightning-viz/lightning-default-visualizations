var THREE = require('three.js');
var _ = require('lodash');


var ThreeVolume = function(selector, data, images, opts) {

    images = images || [];
    opts = opts || {};

    var width = $(selector).width();
    var height = width * 0.7;


    var container, stats;
    var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
    var boxMesh, boxGeometry;
    var self = this;

    function init() {

        renderer = new THREE.WebGLRenderer();
        renderer.setSize( width, height );

        $(selector)[0].appendChild( renderer.domElement );

        camera = new THREE.PerspectiveCamera( 70, width / height, 1, 1000 );
        camera.position.z = 175;

        scene = new THREE.Scene();
        THREE.ImageUtils.crossOrigin = '';

        // todo - get image size, 
        //        get orientation from options
        var numImages = 41;
        var zFactor = 1.5;

        var img = new Image();
        img.src = images[0];

        img.onload = function() {

            geometry = new THREE.PlaneGeometry( img.width / 6, img.height / 6 );
        
            _.each(images, function(img) {
                var texture = THREE.ImageUtils.loadTexture( img );

                var material = new THREE.MeshBasicMaterial( { map: texture, opacity: 0.10, transparent: true, depthTest: false, blending: THREE.AdditiveBlending } );
                material.side = THREE.DoubleSide;
                mesh = new THREE.Mesh( geometry,  material );
                mesh.position.y = (numImages*zFactor / 2) - i * zFactor;
                mesh.rotation.x = Math.PI / 2;

                if(opts.rotateZ) {
                    mesh.rotation.z = Math.PI / 2;
                }
                scene.add( mesh );
            });            
        }

    }
    
    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    function render() {
        for ( i = 0; i < scene.children.length; i ++ ) {
            var object = scene.children[ i ];
                // object.rotation.y += 0.005;
                object.rotation.x -= 0.001;
        }

        renderer.render( scene, camera );
    }
 

    init();
    animate();

};





module.exports = ThreeVolume;


