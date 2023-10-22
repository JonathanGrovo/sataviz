// initializes three.js
import * as THREE from 'three';

// imports the visualizers from separate files
// import { visualizerType1 } from './visualizerType1';
// import { visualizerType2 } from './visualizerType2';

// ----------- AUDIO STUFF ---------------

// initializes the web audio api
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

// analyzer node that can be used to expose audio time and frequency data
const analyser = audioContext.createAnalyser();

// gets the element with audioInput ID in html
const audioInput = document.getElementById('audioInput') as HTMLInputElement;

// when user slects a file via audioInput element
audioInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    
    // if a file is selected, FileReader object is instantiated
    if (file) {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);

        // decoding of the audio data
        fileReader.onload = async () => {
            const audioBuffer = await audioContext.decodeAudioData(fileReader.result as ArrayBuffer);
            
            // node that hosts the decoded audio data
            const source = audioContext.createBufferSource();

            // routes audio to ensure playback
            source.buffer = audioBuffer;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            source.start();
        };
    }
});

// frequency domain setup
analyser.fftSize = 1024;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength); 


// -------------- VISUAL STUFF ----------------

let currentVisualizer: (() => void) | null = null;

function visualizerType1() {
    analyser.getByteFrequencyData(dataArray);

    // segment dataArray for low and high frequencies
    const upperHalfArray = dataArray.slice(dataArray.length / 2, dataArray.length - 1);
    const bassBins = dataArray.slice(2, 5);
    const bassLevel = bassBins.reduce((a, b) => a + b) / bassBins.length;


    // calculate average frequency values for low and high frequencies
    const upperAvg = upperHalfArray.reduce((a, b) => a + b) / upperHalfArray.length;
    
    // envelope follower for upperAvg
    if (upperAvg > outerEnvelope) {
        outerEnvelope = (1 - outerAttackRate * 2) * outerEnvelope + outerAttackRate * 2 * upperAvg;
    } else {
        outerEnvelope = (1 - outerReleaseRate * 2) * outerEnvelope;
    }
    
    // damping when treble is not loud
    if (outerEnvelope < outerFreqThreshold) {
        outerEnvelope *= outerDampingFactor;
    }
    
    let outerTargetScale = 1 + outerEnvelope / 256; // scaling factor can be adjusted
    
    
    // envelope follower for bassLevel
    if (bassLevel > envelope) {
        envelope = (1 - attackRate) * envelope + attackRate * bassLevel;
    } else {
        envelope = (1 - releaseRate) * envelope;
    }

    // damping when bass is not loud
    if (envelope < freqThreshold) {
        envelope *= dampingFactor;
    }

    // calculate target scale based on envelope follower
    targetScale = 1 + envelope / 256; // scaling factor can be adjusted

    // lerp between currentScale and targetScale
    currentScale += (targetScale - currentScale) * lerpFactor;

    inner.scale.set(currentScale, currentScale, currentScale);

    // lerp between currentScale and targetScale for the outer mesh
    outerCurrentScale += (outerTargetScale - outerCurrentScale) * outerLerpFactor;
    outer.scale.set(outerCurrentScale, outerCurrentScale, outerCurrentScale);

    // rotation that automatically occurs
    outer.rotation.z += 0.002;
    outer.rotation.y += 0.002;

    inner.rotation.z += 0.004;
    inner.rotation.y += 0.004;

    renderer.render(scene, camera);
}

function visualizerType2() {
    console.log('gaming');
}

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
const greenGeo = new THREE.SphereGeometry(1, 4, 4);

const blueGeo = new THREE.SphereGeometry(0.5, 4, 4);

const greenMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, wireframe: true });

const blueMat = new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: true });

// create a mesh from geometry and material
const outer = new THREE.Mesh(greenGeo, greenMat);

const inner = new THREE.Mesh(blueGeo, blueMat);



// add cube to the scene
scene.add(outer);
scene.add(inner);

let currentScale = 1.0; // current scale of inner mesh
let targetScale = 1.0; // scane we want to reach
const lerpFactor = 0.1; //speed at which we lerp between currentScale and targetScale

let freqThreshold = 300; // define a frequency threshold for lower frequencies

// variables for envelope follower
let attackRate = 0.1;
let releaseRate = 0.1;
let envelope = 0;

let dampingFactor = 0.95; // for smoother transitions

let outerEnvelope = 0;

let outerAttackRate = 0.1;
let outerReleaseRate = 0.1;
let outerDampingFactor = 0.95; // for smoother transitions
let outerFreqThreshold = 300; // frequnecy threshold for higher frequencies

const outerLerpFactor = 0.1; // speed at which we lerp between current and target scale for outer mesh
let outerCurrentScale = 1.0; // current scale of outer mesh

// animation loop
const animate = () => {
    requestAnimationFrame(animate);

    if (currentVisualizer) {
        currentVisualizer();
    }
};

document.addEventListener('keydown', function(event) {
    if (event.key === '1') {
      currentVisualizer = visualizerType1;
    } else if (event.key === '2') {
      currentVisualizer = visualizerType2;
    }
  });
  

// start the animation
currentVisualizer = visualizerType1;
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
