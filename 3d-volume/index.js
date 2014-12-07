var THREE = require('three.js');
var _ = require('lodash');
require('three-fly-controls')(THREE);



var ThreeVolume = function(selector, data, images, opts) {

    images = images || [];
    opts = opts || {};

    var width = $(selector).width();
    var height = width * 0.7;


    var container, stats;
    var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
    var controls;
    var boxMesh, boxGeometry;
    var self = this;

    function init() {

        renderer = new THREE.WebGLRenderer();
        renderer.setSize( width, height );

        $(selector)[0].appendChild( renderer.domElement );

        camera = new THREE.PerspectiveCamera( 50, width / height, 1, 500 );
        camera.position.z = 175;

        scene = new THREE.Scene();
        THREE.ImageUtils.crossOrigin = '';

        // todo - get image size, 
        //        get orientation from options
        var zFactor = 2;

        var img = new Image();
        img.src = images[0];

        img.onload = function() {

            geometry = new THREE.PlaneGeometry( img.width / 6, img.height / 6, zFactor );
        
            _.each(images, function(img, i) {
                var texture = THREE.ImageUtils.loadTexture( img );
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                var material = new THREE.MeshBasicMaterial( { map: texture, opacity: 0.05, transparent: true, blending: THREE.AdditiveBlending } );
                material.side = THREE.DoubleSide;

                _.each(_.range(zFactor), function(j) {
                    mesh = new THREE.Mesh( geometry,  material );
                    mesh.position.z = i * zFactor + j;
                    if(opts.rotateZ) {
                        mesh.rotation.z = Math.PI / 2;
                    }
                    scene.add( mesh );
                })

            });            
        }


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
    

};





module.exports = ThreeVolume;


