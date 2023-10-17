// initializes three.js
import * as THREE from 'three';

// initializes the web audio api
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const analyser = audioContext.createAnalyser();

// handling audio stuff
const audioInput = document.getElementById('audioInput') as HTMLInputElement;

audioInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = async () => {
            const audioBuffer = await audioContext.decodeAudioData(fileReader.result as ArrayBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            source.start();
        };
    }
});

analyser.fftSize = 256;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength); 





// create a scene
const scene = new THREE.Scene();

// create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const directionalLight = new THREE.DirectionalLight(0xffffff, 3); // color, intensity
directionalLight.position.set(1, 1, 10); // x, y, z
scene.add(directionalLight);

// create a renderer and attach it to the HTML body
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//create geometry and material
const greenSphere = new THREE.SphereGeometry(1, 16, 16);

const blueGeo = new THREE.SphereGeometry(0.5, 4, 4);

const material = new THREE.MeshPhongMaterial({ color: 0x00ff00, wireframe: true });

const newmat = new THREE.MeshPhongMaterial({ color: 0x00ffff, wireframe: true });

// create a mesh from geometry and material
const cube = new THREE.Mesh(greenSphere, material);
cube.position.x = -1;
cube.position.y = -1;

const sphere = new THREE.Mesh(blueGeo, newmat);

// new green mesh
const newcube = new THREE.Mesh(greenSphere, material);
newcube.position.x = 1;
newcube.position.y = -1;
scene.add(newcube);

// shaft
const newshaft = new THREE.Mesh(greenSphere, material);
scene.add(newshaft);
newshaft.position.y = 1;


// add cube to the scene
scene.add(cube);
scene.add(sphere);

// animation loop
const animate = () => {
    requestAnimationFrame(animate);

    // cube.rotation.x += 0.01;
    cube.rotation.z += 0.002;
    cube.rotation.y += 0.002;

    newcube.rotation.z += -0.002;
    newcube.rotation.y += -0.002;

    newshaft.rotation.y += 0.005;

    sphere.rotation.z += 0.004;
    sphere.rotation.y += 0.004;


    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    // cube.scale.set(1 + average / 256, 1 + average / 256, 1 + average / 256);
    cube.scale.set(1 + average / 256, 1 + average / 256, 1 + average / 256);
    newcube.scale.set(1 + average / 256, 1 + average / 256, 1 + average / 256);
    newshaft.scale.set(0.7 + average / 256, 2 + average / 256, 1 + average / 256);

    renderer.render(scene, camera);
};

// start the animation
animate();


let intersected: THREE.Mesh | null = null; // to keep track of the intersected object

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to be called whenever the mouse moves
function onMouseMove(event: MouseEvent): void {
    event.preventDefault();
    
    // Convert mouse position to normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Find objects intersected by the raycaster
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        if (intersected !== intersects[0].object) {
            if (intersected && 'color' in intersected.material) {
                (intersected.material as THREE.MeshPhongMaterial).color.set(0x00ff00); // Reset color
            }
            
            intersected = intersects[0].object as THREE.Mesh;
            
            if ('color' in intersected.material) {
                (intersected.material as THREE.MeshPhongMaterial).color.set(0xff0000); // Set to new color
            }
        }
    } else {
        if (intersected && 'color' in intersected.material) {
            (intersected.material as THREE.MeshPhongMaterial).color.set(0x00ff00); // Reset color
        }
        intersected = null;
    }
    
}

// Add event listener for mousemove
window.addEventListener('mousemove', onMouseMove, false);
