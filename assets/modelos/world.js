import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { crearEdificio } from './edificio.js';
import { crearCasa } from './casa.js';
import { crearMuroFronterizo } from './muro.js';
import { crearPollero } from './personajes/pollero.js';
import { crearCoche } from './personajes/coche.js';

export function generarMundo(scene) {
    const obstaculosColisiones = [];
    const posicionesOcupadas = [];
    const insectos = [];
    let mixersAnimaciones = [];

    const textureLoader = new THREE.TextureLoader();

    // 1. Suelo (lo extendemos un poco más hacia el norte para poder cruzar)
    const pastoTexture = textureLoader.load('assets/pasto.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });
    pastoTexture.wrapS = THREE.RepeatWrapping;
    pastoTexture.wrapT = THREE.RepeatWrapping;
    pastoTexture.repeat.set(35, 50);

    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(70, 100),
        new THREE.MeshStandardMaterial({ map: pastoTexture, roughness: 0.8 })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.z = -15;
    scene.add(suelo);

    // 2. Materiales
    const ladrilloTexture = textureLoader.load('assets/ladrillo.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });
    ladrilloTexture.wrapS = THREE.RepeatWrapping;
    ladrilloTexture.wrapT = THREE.RepeatWrapping;
    ladrilloTexture.repeat.set(3, 6);
    const brickMaterial = new THREE.MeshStandardMaterial({ map: ladrilloTexture, roughness: 0.7 });

    const ladrilloCasasTexture = textureLoader.load('assets/ladrillo_Casas.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });
    ladrilloCasasTexture.wrapS = THREE.RepeatWrapping;
    ladrilloCasasTexture.wrapT = THREE.RepeatWrapping;
    ladrilloCasasTexture.repeat.set(2, 2);
    const houseWallMaterial = new THREE.MeshStandardMaterial({ map: ladrilloCasasTexture, roughness: 0.7 });

    const tejadoTexture = textureLoader.load('assets/tejado.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });
    tejadoTexture.wrapS = THREE.RepeatWrapping;
    tejadoTexture.wrapT = THREE.RepeatWrapping;
    tejadoTexture.repeat.set(2, 2);
    const roofMaterial = new THREE.MeshStandardMaterial({ map: tejadoTexture, roughness: 0.6 });

    // 3. Muro Fronterizo Dividido (Para poder tumbar la sección del coche)
    const muroTexture = textureLoader.load('assets/muro.png', (tex) => {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
    });
    muroTexture.wrapS = THREE.RepeatWrapping;
    muroTexture.wrapT = THREE.RepeatWrapping;
    muroTexture.repeat.set(9, 1);
    const muroMaterial = new THREE.MeshStandardMaterial({
        map: muroTexture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.5
    });

    // Muro Izquierdo
    const muroIzq = crearMuroFronterizo(36.5, muroMaterial);
    muroIzq.position.set(-16.75, 0, -34);
    scene.add(muroIzq);

    // Muro Derecho
    const muroDer = crearMuroFronterizo(27.5, muroMaterial);
    muroDer.position.set(21.25, 0, -34);
    scene.add(muroDer);

    // SECCIÓN DESTRUCTIBLE (Justo en X = 4.5, ancho 6)
    const muroDestructibleMat = muroMaterial.clone();
    const muroDestructible = crearMuroFronterizo(6, muroDestructibleMat);
    muroDestructible.position.set(4.5, 0, -34);
    scene.add(muroDestructible);

    // --- NPC Y COCHE ---
    crearPollero(scene, textureLoader, mixersAnimaciones, obstaculosColisiones);
    const cocheCtrl = crearCoche(scene, textureLoader, obstaculosColisiones);

    // 4. Sembrar Edificios
    let intentosEd = 0;
    while (posicionesOcupadas.length < 5 && intentosEd < 100) {
        intentosEd++;
        const ancho = 4 + Math.random() * 2;
        const alto = 7 + Math.random() * 6;
        const profundidad = 4 + Math.random() * 2;

        const posX = (Math.random() - 0.5) * 50;
        const posZ = (Math.random() - 0.5) * 45;

        if (Math.hypot(posX, posZ) < 9.0) continue;
        if (Math.hypot(posX - 4.5, posZ - (-24)) < 8.0) continue; // No estorbar al coche

        let muyCerca = false;
        for (let pos of posicionesOcupadas) {
            if (Math.hypot(posX - pos.x, posZ - pos.z) < 12.0) { muyCerca = true; break; }
        }

        if (!muyCerca) {
            posicionesOcupadas.push({ x: posX, z: posZ });
            const edificio = crearEdificio(ancho, alto, profundidad, brickMaterial);
            edificio.position.set(posX, 0, posZ);
            scene.add(edificio);

            obstaculosColisiones.push({
                x: posX, z: posZ,
                radio: Math.max(ancho, profundidad) / 2 + 0.6
            });
        }
    }

    // 5. Sembrar Casas
    let intentosCasas = 0;
    let casasCreadas = 0;
    while (casasCreadas < 5 && intentosCasas < 100) {
        intentosCasas++;
        const anchoCasa = 4.5;
        const altoParedes = 2.5;
        const profCasa = 5.0;

        const posX = (Math.random() - 0.5) * 52;
        const posZ = (Math.random() - 0.5) * 45;

        if (Math.hypot(posX, posZ) < 8.0) continue;
        if (Math.hypot(posX - 4.5, posZ - (-24)) < 8.0) continue;

        let muyCerca = false;
        for (let pos of posicionesOcupadas) {
            if (Math.hypot(posX - pos.x, posZ - pos.z) < 9.0) { muyCerca = true; break; }
        }

        if (!muyCerca) {
            casasCreadas++;
            posicionesOcupadas.push({ x: posX, z: posZ });

            const casa = crearCasa(anchoCasa, altoParedes, profCasa, houseWallMaterial, roofMaterial);
            casa.position.set(posX, 0, posZ);
            casa.rotation.y = Math.random() * Math.PI * 2;
            scene.add(casa);

            obstaculosColisiones.push({
                x: posX, z: posZ,
                radio: 3.2
            });
        }
    }

    // 6. Cargar Árboles (.glb)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('assets/modelos/small_tree_rt_1.glb', (gltf) => {
        const treeTemplate = gltf.scene;

        for (let i = 0; i < 18; i++) {
            const posX = (Math.random() - 0.5) * 60;
            const posZ = (Math.random() - 0.5) * 55;

            if (Math.hypot(posX, posZ) < 6.0) continue;
            if (Math.hypot(posX - 4.5, posZ - (-24)) < 7.0) continue;

            let chocaAlgo = false;
            for (let pos of posicionesOcupadas) {
                if (Math.hypot(posX - pos.x, posZ - pos.z) < 4.5) { chocaAlgo = true; break; }
            }
            if (chocaAlgo) continue;

            const tree = treeTemplate.clone();
            tree.position.set(posX, 0, posZ);
            const scale = 4.0 + Math.random() * 3.0;
            tree.scale.set(scale, scale, scale);
            tree.rotation.y = Math.random() * Math.PI * 2;

            scene.add(tree);

            obstaculosColisiones.push({
                x: posX, z: posZ,
                radio: 1.2 * (scale / 4)
            });
        }
    });

    // 7. Insectos
    const insectoGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const insectoMat = new THREE.MeshBasicMaterial({ color: 0xffff55 });

    function crearInsecto() {
        const ins = new THREE.Mesh(insectoGeo, insectoMat);
        ins.position.set((Math.random() - 0.5) * 56, 0.2, (Math.random() - 0.5) * 50);
        scene.add(ins);
        insectos.push(ins);
    }

    for (let i = 0; i < 20; i++) crearInsecto();

    return { 
        obstaculosColisiones, 
        insectos, 
        crearInsecto, 
        mixersAnimaciones, 
        cocheCtrl, 
        muroDestructible 
    };
}

