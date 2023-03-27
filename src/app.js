import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.150.1/+esm";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.150.1/addons/loaders/GLTFLoader.js/+esm";

if (document.getElementById("mobile-warning")) throw new Error();

// Scene and camera setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.y = 5;
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container").appendChild(renderer.domElement);

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

// Ground setup
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  side: THREE.DoubleSide,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2;
scene.add(ground);

// Controls setup
const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") controls.forward = true;
  if (e.key === "ArrowDown") controls.backward = true;
  if (e.key === "ArrowLeft") controls.left = true;
  if (e.key === "ArrowRight") controls.right = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp") controls.forward = false;
  if (e.key === "ArrowDown") controls.backward = false;
  if (e.key === "ArrowLeft") controls.left = false;
  if (e.key === "ArrowRight") controls.right = false;
});

// Loader setup
const loader = new GLTFLoader();

// Load mouse model
let mouse;
loader.load("./src/mm2/scene.gltf", (gltf) => {
  mouse = gltf.scene;
  mouse.scale.set(0.5, 0.5, 0.5);
  mouse.position.y = 1;

  // Traverse the model's materials and modify their roughness and metalness
  mouse.traverse((node) => {
    if (node.isMesh) {
      node.material.roughness = 1; // Adjust as needed (range: 0 to 1)
      node.material.metalness = 0.0; // Adjust as needed (range: 0 to 1)
      node.material.needsUpdate = true; // Update the material
    }
  });

  scene.add(mouse);
});

// Load cat model
let cat;
loader.load("./src/cat/scene.gltf", (gltf) => {
  cat = gltf.scene;
  cat.scale.set(0.8, 0.8, 0.8); // Adjust the scale as needed
  cat.position.set(5, 1, 5); // Set initial position not on top of the mouse

  scene.add(cat);
});

// Speed boost setup
let nextSpeedBoostTime = Date.now() + Math.random() * 5000 + 5000; // Random time between 5 and 10 seconds
let chaseSpeed = 0.05;

const getRandomSpeedBoost = function () {
  return Math.random() * 0.12 + 0.05; // Random speed between 0.05 and 0.17
};

// Cube spawner setup
const spawnedCubes = [];
let nextSpawnTime = Date.now() + 2000; // Start spawning cubes after 2 seconds
let spawnInterval = 2000; // Initial interval between spawns (2 seconds)

const spawnCube = function () {
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

  const randomX = Math.random() * 40 - 20; // Random X position between -20 and 20
  const randomZ = Math.random() * 40 - 20; // Random Z position between -20 and 20
  cube.position.set(randomX, 0.5, randomZ);

  scene.add(cube);
  return cube;
};

const checkPlayerCubeCollision = function () {
  const playerBox = new THREE.Box3().setFromObject(mouse);

  for (const cube of spawnedCubes) {
    const cubeBox = new THREE.Box3().setFromObject(cube);
    if (playerBox.intersectsBox(cubeBox)) return true;
  }

  return false;
};

// Bounds setup
const isPlayerOutOfBounds = function () {
  const groundSize = groundGeometry.parameters.width / 2; // Half of the ground size (50 / 2)
  return (
    mouse.position.x > groundSize ||
    mouse.position.x < -groundSize ||
    mouse.position.z > groundSize ||
    mouse.position.z < -groundSize
  );
};

// Animation & game loop
let gameOver = false;

const animate = function () {
  const speed = 0.15;
  const rotationSpeed = 0.05;

  const oldPosition = mouse.position.clone();

  if (controls.forward) {
    mouse.position.x += Math.sin(mouse.rotation.y) * speed;
    mouse.position.z += Math.cos(mouse.rotation.y) * speed;
  }

  if (controls.backward) {
    mouse.position.x -= Math.sin(mouse.rotation.y) * speed;
    mouse.position.z -= Math.cos(mouse.rotation.y) * speed;
  }

  if (checkPlayerCubeCollision()) {
    mouse.position.copy(oldPosition);
  }

  if (controls.left) {
    mouse.rotation.y += rotationSpeed;
  }

  if (controls.right) {
    mouse.rotation.y -= rotationSpeed;
  }

  // Calculate the distance between the cat and the mouse
  const distance = cat.position.distanceTo(mouse.position);

  // Adjust the camera height based on the distance between the cat and the mouse
  const cameraHeight = Math.max(5, distance);

  // Calculate the midpoint between the cat and the mouse
  const midpoint = new THREE.Vector3()
    .addVectors(cat.position, mouse.position)
    .multiplyScalar(0.5);

  // Update the camera position
  const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraHeight);
  const cameraPosition = midpoint.clone().add(cameraOffset);
  camera.position.lerp(cameraPosition, 0.05);

  // Make the camera look at the midpoint
  camera.lookAt(midpoint);

  // Update the chase speed randomly
  if (Date.now() > nextSpeedBoostTime) {
    chaseSpeed = getRandomSpeedBoost();
    nextSpeedBoostTime = Date.now() + Math.random() * 2500 + 2500; // Set the next random boost time
  }

  // Make the cat chase the mouse
  const direction = new THREE.Vector3()
    .subVectors(mouse.position, cat.position)
    .normalize();
  direction.y = 0; // Ignore the Y-axis component
  cat.position.add(direction.multiplyScalar(chaseSpeed));

  // Check for collision and refresh the page
  if (distance < 1 && !gameOver) {
    gameOver = true;
    location.reload();
  }

  // Spawn cubes over time with an exponential increase in the spawn rate
  if (Date.now() > nextSpawnTime && spawnedCubes.length < 50) {
    spawnedCubes.push(spawnCube());

    if (spawnInterval > 500) {
      spawnInterval *= 0.95; // Decrease the interval by 5% for the next spawn
    }

    nextSpawnTime = Date.now() + spawnInterval;
  }

  // Check if the player is out of bounds and make them fall
  if (isPlayerOutOfBounds()) {
    mouse.position.y -= 0.1;

    if (mouse.position.y < -10 && !gameOver) {
      gameOver = true;
      location.reload();
    }
  } else {
    mouse.position.y = 1;
  }

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
};

const loadInterval = setInterval(() => {
  if (mouse && cat) {
    animate();
    clearInterval(loadInterval);
  }
}, 150);
