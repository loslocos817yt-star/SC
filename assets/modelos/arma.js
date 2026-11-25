import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export function crearArmaM16(scene, camera) {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const pickupGroup = new THREE.Group();
    pickupGroup.visible = false;
    scene.add(pickupGroup);

    const viewGroup = new THREE.Group();
    viewGroup.visible = false;
    camera.add(viewGroup);

    // Destello en la boca del cañón (vista en cámara)
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
    });
    const flashMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), flashMat);
    flashMesh.scale.set(1.3, 1.3, 2.2);
    flashMesh.position.set(0.28, -0.22, -0.92);
    flashMesh.visible = false;
    viewGroup.add(flashMesh);

    // Trazador en espacio de mundo
    const trazadores = [];
    const trazadorGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);

    let pickupMesh = null;
    let viewMesh = null;
    let equipada = false;
    let retroceso = 0;
    let cooldown = 0;
    let flashTimer = 0;

    const posSuelo = new THREE.Vector3();

    const tex1 = texLoader.load('assets/modelos/arma/M16A1(1).png', (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
    });
    const tex2 = texLoader.load('assets/modelos/arma/M16A1(2).png', (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
    });

    function escalarRifle(obj, tamanoDeseado) {
        obj.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        obj.scale.multiplyScalar(tamanoDeseado / maxDim);
    }

    loader.load(
        'assets/modelos/arma/M16A1.fbx',
        (fbx) => {
            let idx = 0;
            fbx.traverse((child) => {
                if (child.isMesh) {
                    const matTex = (idx++ % 2 === 0) ? tex1 : tex2;
                    child.material = new THREE.MeshStandardMaterial({
                        map: matTex,
                        roughness: 0.65,
                        metalness: 0.25
                    });
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            pickupMesh = fbx.clone();
            escalarRifle(pickupMesh, 1.55);
            pickupMesh.rotation.order = 'YXZ';
            pickupMesh.rotation.set(Math.PI / 2, 0, Math.PI / 2);
            pickupMesh.position.y = 0.32;
            pickupGroup.add(pickupMesh);

            viewMesh = fbx;
            escalarRifle(viewMesh, 0.78);
            viewMesh.rotation.order = 'YXZ';
            viewMesh.position.set(0.28, -0.25, -0.44);
            viewMesh.rotation.set(0, Math.PI / 2, 0);
            viewGroup.add(viewMesh);
        },
        undefined,
        () => {
            const pGeo = new THREE.BoxGeometry(0.14, 0.16, 1.25);
            const pMat = new THREE.MeshStandardMaterial({ color: 0x222222, map: tex1 });
            pickupMesh = new THREE.Mesh(pGeo, pMat);
            pickupMesh.position.y = 0.3;
            pickupGroup.add(pickupMesh);

            viewMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.12, 0.85),
                new THREE.MeshStandardMaterial({ color: 0x222222, map: tex1 })
            );
            viewMesh.position.set(0.28, -0.25, -0.44);
            viewGroup.add(viewMesh);
        }
    );

    function colocarEnBosque(x, z) {
        posSuelo.set(x, 0, z);
        pickupGroup.position.set(x, 0, z);
        pickupGroup.visible = !equipada;
        viewGroup.visible = equipada;
    }

    function ocultarTodo() {
        pickupGroup.visible = false;
        viewGroup.visible = false;
        flashMesh.visible = false;
    }

    function distanciaJugador(jugPos) {
        if (equipada || !pickupGroup.visible) return Infinity;
        return Math.hypot(jugPos.x - posSuelo.x, jugPos.z - posSuelo.z);
    }

    function recoger() {
        if (equipada) return false;
        equipada = true;
        pickupGroup.visible = false;
        viewGroup.visible = true;
        return true;
    }

    function spawnTrazador(origen, destino) {
        const mat = new THREE.LineBasicMaterial({
            color: 0xffcc66,
            transparent: true,
            opacity: 0.85
        });
        const linea = new THREE.Line(trazadorGeo, mat);
        const dir = new THREE.Vector3().subVectors(destino, origen);
        const largo = Math.max(0.5, dir.length());
        linea.position.copy(origen);
        linea.lookAt(destino);
        linea.scale.set(1, 1, largo);
        scene.add(linea);
        trazadores.push({ linea, mat, vida: 0.09, maxVida: 0.09 });
    }

    function disparar(origenMundo, dirXZ, distanciaImpacto = 22) {
        if (!equipada || cooldown > 0) return false;
        cooldown = 0.16;
        retroceso = 0.09;
        flashTimer = 0.065;
        flashMesh.visible = true;
        flashMesh.rotation.z = Math.random() * Math.PI * 2;

        if (origenMundo && dirXZ) {
            const inicio = new THREE.Vector3(
                origenMundo.x + dirXZ.x * 0.65,
                origenMundo.y + 1.05,
                origenMundo.z + dirXZ.z * 0.65
            );
            const fin = new THREE.Vector3(
                inicio.x + dirXZ.x * distanciaImpacto,
                inicio.y,
                inicio.z + dirXZ.z * distanciaImpacto
            );
            spawnTrazador(inicio, fin);
        }
        return true;
    }

    function actualizar(delta, enParcelaNueva) {
        if (cooldown > 0) cooldown = Math.max(0, cooldown - delta);
        if (retroceso > 0) retroceso = Math.max(0, retroceso - delta * 0.75);

        if (flashTimer > 0) {
            flashTimer = Math.max(0, flashTimer - delta);
            flashMesh.visible = equipada && enParcelaNueva && flashTimer > 0;
        } else {
            flashMesh.visible = false;
        }

        for (let i = trazadores.length - 1; i >= 0; i--) {
            const t = trazadores[i];
            t.vida -= delta;
            if (t.vida <= 0) {
                scene.remove(t.linea);
                t.mat.dispose();
                trazadores.splice(i, 1);
            } else {
                t.mat.opacity = Math.max(0, (t.vida / t.maxVida) * 0.85);
            }
        }

        if (!enParcelaNueva) {
            ocultarTodo();
            return;
        }

        pickupGroup.visible = !equipada;
        viewGroup.visible = equipada;

        if (!equipada && pickupMesh) {
            pickupMesh.rotation.y += delta * 1.1;
            pickupMesh.position.y = 0.32 + Math.sin(performance.now() * 0.004) * 0.05;
        }

        if (equipada && viewMesh) {
            viewMesh.position.z = -0.44 + retroceso;
            viewMesh.rotation.x = retroceso * 1.2;
        }
    }

    return {
        colocarEnBosque,
        ocultarTodo,
        distanciaJugador,
        recoger,
        disparar,
        actualizar,
        estaEquipada: () => equipada
    };
}
