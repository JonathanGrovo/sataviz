// initializes three.js
import * as THREE from 'three';

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
analyser.fftSize = 256;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength); 


// -------------- VISUAL STUFF ----------------

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



let prevLowerAvg = 0;
const rateThreshold = 10; // threshold for rate of change


// const threshold = 50; // adjustable value
// const decayRate = 0.95; // adjustable value

let currentScale = 1.0; // current scale of inner mesh
let targetScale = 1.0; // scane we want to reach
const lerpFactor = 0.1; //speed at which we lerp between currentScale and targetScale

let freqThreshold = 200; // define a frequency threshold for lower frequencies

// animation loop
const animate = () => {
    requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    // segment dataArray for low and high frequencies
    // const lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
    const lowerHalfArray = dataArray.slice(0, 3);
    const upperHalfArray = dataArray.slice(dataArray.length / 2, dataArray.length - 1);

    // calculate average frequency values for low and high frequencies
    const lowerAvg = lowerHalfArray.reduce((a, b) => a + b) / lowerHalfArray.length;
    const upperAvg = upperHalfArray.reduce((a, b) => a + b) / upperHalfArray.length;

    // apply the values to outer and inner meshes
    const upperScale = 1 + upperAvg / 256;
    outer.scale.set(upperScale, upperScale, upperScale);
    // inner.scale.set(1 + lowerAvg / 256, 1 + lowerAvg / 256, 1 + lowerAvg / 256);

    const rateOfChange = lowerAvg - prevLowerAvg;

    // // if we pass rate of change threshold
    // if (Math.abs(rateOfChange) > rateThreshold) {
    //     targetScale = 1 + lowerAvg / 128;
    //     console.log(rateOfChange);
    // } else {
    //     targetScale  = 1.0 // reset to original scale
    // }

    if (lowerAvg > freqThreshold) {
        targetScale = 1 + lowerAvg / 128; // set a new target scale based on lowerAvg
        console.log(`Threshold crossed: ${lowerAvg}`);
    } else {
        targetScale = 1.0; // reset to original scale
    }

    // lerp between currentScale and targetScale
    currentScale += (targetScale - currentScale) * lerpFactor;

    inner.scale.set(currentScale, currentScale, currentScale);

    // prevLowerAvg = lowerAvg;

    // rotation that automatically occurs
    outer.rotation.z += 0.002;
    outer.rotation.y += 0.002;

    inner.rotation.z += 0.004;
    inner.rotation.y += 0.004;

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
