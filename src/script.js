import * as THREE from 'three'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
};
let water;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
/**
 * Base
 */
// Debug
const gui = new dat.GUI()


// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
/**
 * Model
 */
let model = null;
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)
gltfLoader.load(
    './models/landscape.glb',
    (gltf) =>
    {
        model = gltf.scene
        model.children[0].material = new THREE.MeshStandardMaterial();
        scene.add(model)
    }
)

/**
 * Lights
 */
// Ambient light
// const ambientLight = new THREE.AmbientLight('#ffffff', 0.3)
// scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 0.7)
directionalLight.position.set(1, 2, 3)
scene.add(directionalLight)

/**
 * Objects
 */

/*
  Raycaster
 */

const rayCaster = new THREE.Raycaster();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.y = 1;
camera.position.z = 3;
scene.add(camera)

// Controls
const controls = new PointerLockControls(camera, canvas)
controls.enableDamping = true
scene.add(controls.getObject())


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */

// Sky
const sky = new Sky();
sky.scale.setScalar( 1000 );
scene.add( sky );

const skyUniforms = sky.material.uniforms;

skyUniforms[ 'turbidity' ].value = 10;
skyUniforms[ 'rayleigh' ].value = 2;
skyUniforms[ 'mieCoefficient' ].value = 0.005;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;
const pmremGenerator = new THREE.PMREMGenerator( renderer );

// Sun
let sun = new THREE.Vector3();
let renderTarget;

function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - 15 );
    const theta = THREE.MathUtils.degToRad( 150 );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    if ( renderTarget !== undefined ) renderTarget.dispose();

    renderTarget = pmremGenerator.fromScene( sky );

    scene.environment = renderTarget.texture;

}

// Water

const waterGeometry = new THREE.PlaneGeometry( 100, 100 );

water = new Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( 'textures/water/waternormals.jpg', function ( texture ) {

            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        } ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
    }
);
water.position.y = .26;
water.rotation.x = - Math.PI / 2;
water.material.uniforms.size.value = 10;
scene.add( water );

/*
  Movement Controls
 */
const onKeyDown = function (event) {
    switch (event.code) {
        case 'KeyW':
            movement.forward = true;
            break
        case 'KeyA':
            movement.left = true;
            break
        case 'KeyS':
            movement.backward = true;
            break
        case 'KeyD':
            movement.right = true;
            break
        case 'Space':
            if (movement.jump === true) velocity.y += 150
            movement.jump = false
            break
    }
};
const onKeyUp = function ( event ) {
    switch ( event.code ) {
        case 'KeyW':
            movement.forward = false;
            break
        case 'KeyA':
            movement.left = false;
            break
        case 'KeyS':
            movement.backward = false;
            break
        case 'KeyD':
            movement.right = false;
            break
    }

};
document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );
const blocker = document.getElementById( 'blocker' );
const instructions = document.getElementById( 'instructions' );

instructions.addEventListener( 'click', function () {
    controls.lock();
});

controls.addEventListener( 'lock', function () {

    instructions.style.display = 'none';
    blocker.style.display = 'none';

});

controls.addEventListener( 'unlock', function () {

    blocker.style.display = 'block';
    instructions.style.display = '';

});
let lastCallTime = performance.now()
updateSun();

const tick = () => {
    const origin = new THREE.Vector3( camera.position.x, camera.position.y, camera.position.z);
    const time = performance.now() / 1000
    const delta = time - lastCallTime;
    lastCallTime = time

    const raycaster = new THREE.Raycaster();

    const direction = new THREE.Vector3(
        camera.position.x,
        camera.position.y - 5,
        camera.position.z)
        raycaster.set(origin, direction)

    if (controls.isLocked === true) {
        if (model) {
            const intersect = raycaster.intersectObject(model)
            if (intersect.length) {
                camera.position.y = intersect[0].point.y + .5
            }
        }

        camera.position.copy(controls.getObject().position);
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= (9.8 * 70.0 * delta);

        direction.z = Number(movement.forward) - Number(movement.backward);
        direction.x = Number(movement.right) - Number(movement.left);
        direction.normalize(); // this ensures consistent movements in all directions

        if (movement.forward || movement.backward) velocity.z -= direction.z * 100.0 * delta;
        if (movement.left || movement.right) velocity.x -= direction.x * 100.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        water.material.uniforms[ 'time' ].value += .5 / 60.0;
    }
    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()