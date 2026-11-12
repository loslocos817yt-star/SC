import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export function crearPollero(scene, textureLoader, mixersAnimaciones, obstaculosColisiones) {
    const fbxLoader = new FBXLoader();

    const polleroTexture = textureLoader.load('assets/modelos/personajes/pollero.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });

    // Cargamos el modelo base (puedes usar Talking.fbx o cambiarlo si tienes un mesh base de idle)
    fbxLoader.load('assets/modelos/animaciones/Talking.fbx', (object) => {
        object.position.set(0, 0, -33.2); // Pegadito al muro de Cocoyole
        object.scale.set(0.002, 0.002, 0.002); // Escala perfecta de 0.002

        // Aplicar material texturizado para que no se camufle con el cielo
        object.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: polleroTexture,
                    roughness: 0.5,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                child.material.needsUpdate = true;
            }
        });

        scene.add(object);

        // Crear el mixer para las animaciones del NPC
        const mixer = new THREE.AnimationMixer(object);

        // Cargamos la animación de IDLE desde su archivo correspondiente
        fbxLoader.load('assets/modelos/animaciones/iddle.fbx', (idleFbx) => {
            if (idleFbx.animations && idleFbx.animations.length > 0) {
                const idleAction = mixer.clipAction(idleFbx.animations[0]);
                idleAction.play(); // Reproducir idle por defecto al inicio
            }
        }, undefined, (err) => {
            console.log("No se pudo cargar iddle.fbx, usando animación por defecto del modelo.");
            if (object.animations && object.animations.length > 0) {
                const defaultAction = mixer.clipAction(object.animations[0]);
                defaultAction.play();
            }
        });

        mixersAnimaciones.push(mixer);

        // Registrar su colisión en el mundo
        obstaculosColisiones.push({
            x: 0, z: -33.2,
            radio: 1.0
        });
    }, undefined, (error) => {
        console.error("Error al cargar el modelo del pollero:", error);
    });
}

