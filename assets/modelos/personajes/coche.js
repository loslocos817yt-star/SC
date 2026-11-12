import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export function crearCoche(scene, textureLoader, obstaculosColisiones) {
    const objLoader = new OBJLoader();
    let cocheMesh = null;

    const carTexture = textureLoader.load('assets/modelos/personajes/car.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });

    objLoader.load('assets/modelos/personajes/Car.obj', (object) => {
        cocheMesh = object;
        // Estacionado cerca de Don Pepe apuntando hacia el muro (-Z)
        cocheMesh.position.set(4.5, 0, -24);
        cocheMesh.rotation.y = Math.PI; // Ajusta si el frente del modelo mira al revés (0 o Math.PI)
        cocheMesh.scale.set(0.8, 0.8, 0.8); // Escala inicial, ajústala si queda muy grande o chico

        cocheMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: carTexture,
                    roughness: 0.4,
                    metalness: 0.2
                });
            }
        });

        scene.add(cocheMesh);

        obstaculosColisiones.push({
            id: 'coche',
            x: 4.5,
            z: -24,
            radio: 2.0
        });
    });

    return {
        getMesh: () => cocheMesh
    };
}

