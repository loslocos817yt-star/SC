import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { crearEdificio } from './edificio.js';
import { crearCasa } from './casa.js';
import { crearMuroFronterizo } from './muroFronterizo.js';
import { crearPollero } from './personajes/pollero.js';
import { crearCoche } from './personajes/coche.js';
import { crearCohete } from './cohete.js';

export function generarMundo(scene) {
    const obstaculosColisiones = [];
    const colisionesParcelaNueva = [];
    const posicionesOcupadas = [];
    const insectos = [];
    let mixersAnimaciones = [];

    const mundoPuebloGroup = new THREE.Group();
    scene.add(mundoPuebloGroup);

    const parcelaNuevaGroup = new THREE.Group();
    let parcelaActiva = false;
    const centroX = 6, centroZ = -220;

    const activarParcelaNueva = (cx = centroX, cz = centroZ) => {
        parcelaNuevaGroup.position.set(0, 0, 0);
        if (!parcelaActiva) {
            scene.add(parcelaNuevaGroup);
            parcelaActiva = true;
        }
        sueloParcela.position.set(cx, -0.02, cz);
    };

    const desactivarParcelaNueva = () => {
        if (parcelaActiva) {
            scene.remove(parcelaNuevaGroup);
            parcelaActiva = false;
        }
    };

    let puebloEnEscena = true, bloqueadoPorLejos = false;
    const descargarPueblo = (lejos = false) => {
        if (lejos) bloqueadoPorLejos = true;
        if (puebloEnEscena) { scene.remove(mundoPuebloGroup); puebloEnEscena = false; }
    };
    const cargarPueblo = () => {
        if (!bloqueadoPorLejos && !puebloEnEscena) { scene.add(mundoPuebloGroup); puebloEnEscena = true; }
    };

    const textureLoader = new THREE.TextureLoader();
    const loadTex = (path, rx, ry) => {
        const t = textureLoader.load(path, (tex) => {
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.NearestFilter;
        });
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rx, ry);
        return t;
    };

    const pastoTexture = loadTex('assets/pasto.png', 60, 120);
    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(260, 320),
        new THREE.MeshStandardMaterial({ color: 0x4ea832, map: pastoTexture, roughness: 0.85 })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(0, 0, -110);
    scene.add(suelo);

    const sueloParcela = new THREE.Mesh(
        new THREE.PlaneGeometry(110, 110),
        new THREE.MeshStandardMaterial({ color: 0xd98a4e, map: pastoTexture, roughness: 0.9 })
    );
    sueloParcela.rotation.x = -Math.PI / 2;
    parcelaNuevaGroup.add(sueloParcela);

    const brickMaterial = new THREE.MeshStandardMaterial({ map: loadTex('assets/ladrillo.png', 3, 6), roughness: 0.7 });
    const houseWallMaterial = new THREE.MeshStandardMaterial({ map: loadTex('assets/ladrillo_Casas.png', 2, 2), roughness: 0.7 });
    const roofMaterial = new THREE.MeshStandardMaterial({ map: loadTex('assets/tejado.png', 2, 2), roughness: 0.6 });

    // muroDestructible ocupa x: [1.5 .. 7.5] (ancho 6 centrado en 4.5)
    // Extendido a [-2000 .. 1.5] a la izquierda y [7.5 .. +2000] a la derecha
    const ANCHO_EXTREMO = 2000;
    const anchoIzq = 1.5 - (-ANCHO_EXTREMO);
    const centroIzq = (-ANCHO_EXTREMO + 1.5) / 2;
    const anchoDer = ANCHO_EXTREMO - 7.5;
    const centroDer = (7.5 + ANCHO_EXTREMO) / 2;

    const muroIzqMat = new THREE.MeshStandardMaterial({
        map: loadTex('assets/muro.png', Math.round(anchoIzq / 3), 1),
        transparent: true, side: THREE.DoubleSide, roughness: 0.5
    });

    const muroDerMat = new THREE.MeshStandardMaterial({
        map: loadTex('assets/muro.png', Math.round(anchoDer / 3), 1),
        transparent: true, side: THREE.DoubleSide, roughness: 0.5
    });

    const muroDestMat = new THREE.MeshStandardMaterial({
        map: loadTex('assets/muro.png', 4, 1),
        transparent: true, side: THREE.DoubleSide, roughness: 0.5
    });

    const muroIzq = crearMuroFronterizo(anchoIzq, muroIzqMat, 0);
    muroIzq.position.set(centroIzq, 0, -34);
    scene.add(muroIzq);

    const muroDer = crearMuroFronterizo(anchoDer, muroDerMat, 0);
    muroDer.position.set(centroDer, 0, -34);
    scene.add(muroDer);

    const muroDestructible = crearMuroFronterizo(6, muroDestMat, 0);
    muroDestructible.position.set(4.5, 0, -34);
    scene.add(muroDestructible);

    crearPollero(scene, textureLoader, mixersAnimaciones, obstaculosColisiones);
    const cocheCtrl = crearCoche(scene, textureLoader, obstaculosColisiones);
    const coheteCtrl = crearCohete(scene, obstaculosColisiones);

    const Z_LIMITE_SUR = -31, Z_LIMITE_NORTE = 28;

    let intentosEd = 0;
    while (posicionesOcupadas.length < 6 && intentosEd < 250) {
        intentosEd++;
        const an = 4 + Math.random() * 2, al = 7 + Math.random() * 6, pr = 4 + Math.random() * 2;
        const px = (Math.random() - 0.5) * 60;
        const pz = Z_LIMITE_SUR + Math.random() * (Z_LIMITE_NORTE - Z_LIMITE_SUR);
        if (pz < Z_LIMITE_SUR || Math.hypot(px, pz) < 8) continue;
        if (posicionesOcupadas.some(p => Math.hypot(px - p.x, pz - p.z) < 12)) continue;
        posicionesOcupadas.push({ x: px, z: pz });
        const ed = crearEdificio(an, al, pr, brickMaterial);
        ed.position.set(px, 0, pz);
        mundoPuebloGroup.add(ed);
        obstaculosColisiones.push({ x: px, z: pz, radio: Math.max(an, pr) / 2 + 0.6 });
    }

    let intentosCasas = 0, casasCreadas = 0;
    while (casasCreadas < 5 && intentosCasas < 250) {
        intentosCasas++;
        const px = (Math.random() - 0.5) * 60;
        const pz = Z_LIMITE_SUR + Math.random() * (Z_LIMITE_NORTE - Z_LIMITE_SUR);
        if (pz < Z_LIMITE_SUR || Math.hypot(px, pz) < 8) continue;
        if (posicionesOcupadas.some(p => Math.hypot(px - p.x, pz - p.z) < 10)) continue;
        casasCreadas++;
        posicionesOcupadas.push({ x: px, z: pz });
        const casa = crearCasa(4.5, 2.5, 5, houseWallMaterial, roofMaterial);
        casa.position.set(px, 0, pz);
        casa.rotation.y = Math.random() * Math.PI * 2;
        mundoPuebloGroup.add(casa);
        obstaculosColisiones.push({ x: px, z: pz, radio: 3.2 });
    }

    const coordsParcela = [
        [-20, -242], [-15, -242], [-10, -242], [-5, -242], [0, -242],
        [5, -242], [10, -242], [15, -242], [20, -242], [25, -242], [30, -242],
        [-14, -228], [24, -226], [-12, -210], [22, -208], [-4, -204], [16, -204]
    ];
    for (const [ax, az] of coordsParcela) {
        colisionesParcelaNueva.push({ x: ax, z: az, radio: 2.1 });
    }

    const crearArbolFallback = (x, z, s) => {
        const g = new THREE.Group();
        const tronco = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 1.6 * s, 6),
            new THREE.MeshStandardMaterial({ color: 0x5c3a21 })
        );
        tronco.position.y = 0.8 * s;
        const copa = new THREE.Mesh(
            new THREE.ConeGeometry(1.3 * s, 3.2 * s, 7),
            new THREE.MeshStandardMaterial({ color: 0x2d7a28 })
        );
        copa.position.y = 2.6 * s;
        g.add(tronco, copa);
        g.position.set(x, 0, z);
        return g;
    };

    const arbolesParcelaMeshes = [];
    for (let i = 0; i < coordsParcela.length; i++) {
        const [ax, az] = coordsParcela[i];
        const s = i < 11 ? 1.8 : 1.4;
        const fb = crearArbolFallback(ax, az, s);
        parcelaNuevaGroup.add(fb);
        arbolesParcelaMeshes.push({ mesh: fb, x: ax, z: az, scale: s * 3.2 });
    }

    const gltfLoader = new GLTFLoader();
    gltfLoader.load('assets/modelos/small_tree_rt_1.glb', (gltf) => {
        const tpl = gltf.scene;
        let creados = 0, intentos = 0;
        while (creados < 20 && intentos < 300) {
            intentos++;
            const px = (Math.random() - 0.5) * 70;
            const pz = Z_LIMITE_SUR + Math.random() * (Z_LIMITE_NORTE - Z_LIMITE_SUR);
            if (pz < Z_LIMITE_SUR || Math.hypot(px, pz) < 6) continue;
            if (posicionesOcupadas.some(p => Math.hypot(px - p.x, pz - p.z) < 4.5)) continue;
            const tree = tpl.clone();
            const sc = 4 + Math.random() * 3;
            tree.position.set(px, 0, pz);
            tree.scale.set(sc, sc, sc);
            tree.rotation.y = Math.random() * Math.PI * 2;
            mundoPuebloGroup.add(tree);
            creados++;
            obstaculosColisiones.push({ x: px, z: pz, radio: 1.2 * (sc / 4) });
        }

        for (const item of arbolesParcelaMeshes) {
            parcelaNuevaGroup.remove(item.mesh);
            const tree = tpl.clone();
            tree.position.set(item.x, 0, item.z);
            tree.scale.set(item.scale, item.scale, item.scale);
            parcelaNuevaGroup.add(tree);
        }
    });

    const insectoGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const insectoMat = new THREE.MeshBasicMaterial({ color: 0xffff55 });
    const crearInsecto = () => {
        const ins = new THREE.Mesh(insectoGeo, insectoMat);
        ins.position.set((Math.random() - 0.5) * 70, 0.2, (Math.random() - 0.5) * 90 - 15);
        scene.add(ins);
        insectos.push(ins);
    };
    for (let i = 0; i < 30; i++) crearInsecto();

    return {
        obstaculosColisiones, colisionesParcelaNueva, insectos, crearInsecto,
        mixersAnimaciones, cocheCtrl, muroDestructible, coheteCtrl,
        mundoPuebloGroup, descargarPueblo, cargarPueblo, activarParcelaNueva, desactivarParcelaNueva
    };
}
