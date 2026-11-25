import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

function limpiarRootMotion(clip) {
    if (!clip || !Array.isArray(clip.tracks)) return clip;
    clip.tracks = clip.tracks.filter((tr) => !tr.name.endsWith('.position'));
    return clip;
}

export function crearJefeBosque(scene, obstaculos) {
    const loader = new FBXLoader();
    const tex = new THREE.TextureLoader().load('assets/modelos/personajes/Character_Boss.png', (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
    });

    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.5, 0.25, 10),
        new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 0.9 })
    );
    base.position.y = 0.125;
    base.visible = false;
    scene.add(base);

    const bateria = new THREE.Group();
    const cuerpoBat = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.48, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.45, metalness: 0.4 })
    );
    cuerpoBat.position.y = 0.24;
    const tapaBat = new THREE.Mesh(
        new THREE.BoxGeometry(0.67, 0.1, 0.44),
        new THREE.MeshStandardMaterial({ color: 0xc98a14, roughness: 0.4 })
    );
    tapaBat.position.y = 0.48;
    const borne1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b1a1a })
    );
    borne1.position.set(-0.18, 0.58, 0);
    const borne2 = borne1.clone();
    borne2.material = new THREE.MeshStandardMaterial({ color: 0x111111 });
    borne2.position.set(0.18, 0.58, 0);
    bateria.add(cuerpoBat, tapaBat, borne1, borne2);
    bateria.visible = false;
    scene.add(bateria);

    let mixer = null, accRun = null, accAtk = null, accActiva = null;
    let listo = false, activo = false, derrotado = false, bateriaRecogida = false;
    let hp = 12, golpes = 0, cdGolpe = 0, flashDanio = 0, baseOffsetY = 0;
    let modeloMesh = null;
    const mats = [];
    const basePos = new THREE.Vector3();

    function ajustarEscala(obj, alto = 2.45) {
        obj.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(obj);
        const s = new THREE.Vector3();
        b.getSize(s);
        obj.scale.multiplyScalar(alto / (s.y || 1));
        obj.updateMatrixWorld(true);
        const b2 = new THREE.Box3().setFromObject(obj);
        baseOffsetY = -b2.min.y;
        obj.position.set(0, baseOffsetY, 0);
    }

    loader.load('assets/modelos/personajes/Character_Killer_01.Running.fbx', (fbx) => {
        fbx.traverse((c) => {
            if (c.isMesh) {
                const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
                c.material = m;
                mats.push(m);
            }
        });
        ajustarEscala(fbx, 2.45);
        modeloMesh = fbx;
        group.add(fbx);
        mixer = new THREE.AnimationMixer(fbx);
        if (fbx.animations?.[0]) {
            accRun = mixer.clipAction(limpiarRootMotion(fbx.animations[0]));
            accRun.setLoop(THREE.LoopRepeat);
            accRun.play();
            accActiva = accRun;
        }
        listo = true;

        loader.load('assets/modelos/personajes/Character_Killer_01.Attack.fbx', (atk) => {
            if (atk.animations?.[0] && mixer) {
                accAtk = mixer.clipAction(limpiarRootMotion(atk.animations[0]));
                accAtk.setLoop(THREE.LoopRepeat);
            }
        });
    });

    function ponerAccion(a) {
        if (!a || accActiva === a) return;
        if (accActiva) accActiva.fadeOut(0.15);
        a.reset().fadeIn(0.15).play();
        accActiva = a;
    }

    function invocar(bx, bz) {
        basePos.set(bx, 0, bz);
        base.position.set(bx, 0, bz);
        base.visible = true;
        group.position.set(bx, 0, bz);
        group.rotation.set(0, 0, 0);
        if (modeloMesh) modeloMesh.position.set(0, baseOffsetY, 0);
        group.visible = true;
        hp = 12;
        golpes = 0;
        cdGolpe = 0;
        derrotado = false;
        bateriaRecogida = false;
        bateria.visible = false;
        activo = true;
        if (accRun) ponerAccion(accRun);
    }

    function moverLibre(nx, nz) {
        for (const o of obstaculos) {
            if (Math.hypot(nx - o.x, nz - o.z) < (o.radio || 0.9) + 0.65) return false;
        }
        return true;
    }

    function recibirDisparo(origen, dirXZ) {
        if (!activo || derrotado || !group.visible) return { dio: false };
        const vx = group.position.x - origen.x;
        const vz = group.position.z - origen.z;
        const d = Math.hypot(vx, vz);
        if (d > 26 || d < 0.2) return { dio: false };
        const dot = (vx * dirXZ.x + vz * dirXZ.z) / d;
        const lat = Math.abs(vx * dirXZ.z - vz * dirXZ.x);
        if (dot <= 0.85 || lat > 1.05) return { dio: false };

        hp = Math.max(0, hp - 1);
        flashDanio = 0.14;
        if (hp === 0) {
            derrotado = true;
            group.rotation.x = -Math.PI / 2;
            group.position.y = 0.45;
            if (accActiva) accActiva.stop();
            bateria.position.set(group.position.x + 0.9, 0, group.position.z + 0.6);
            bateria.visible = true;
            return { dio: true, murio: true, hp: 0 };
        }
        return { dio: true, murio: false, hp, furioso: hp <= 6 };
    }

    function actualizar(delta, jugPos) {
        if (mixer && activo && !derrotado) {
            mixer.update(delta);
            if (modeloMesh) modeloMesh.position.set(0, baseOffsetY, 0);
        }

        if (flashDanio > 0) {
            flashDanio = Math.max(0, flashDanio - delta);
            const c = flashDanio > 0 ? 0xff5533 : 0xffffff;
            mats.forEach(m => m.color.setHex(c));
        }

        if (bateria.visible && !bateriaRecogida) {
            bateria.rotation.y += delta * 1.5;
        }

        if (!activo || !listo || derrotado) return null;
        if (cdGolpe > 0) cdGolpe = Math.max(0, cdGolpe - delta);

        const dx = jugPos.x - group.position.x;
        const dz = jugPos.z - group.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        group.rotation.y = Math.atan2(dx, dz);

        if (dist > 1.75) {
            ponerAccion(accRun);
            const vel = (hp <= 6 ? 3.55 : 2.75) * delta;
            const nx = group.position.x + (dx / dist) * vel;
            const nz = group.position.z + (dz / dist) * vel;
            if (moverLibre(nx, group.position.z)) group.position.x = nx;
            if (moverLibre(group.position.x, nz)) group.position.z = nz;
        } else {
            ponerAccion(accAtk || accRun);
            if (cdGolpe <= 0) {
                cdGolpe = 1.05;
                golpes++;
                if (golpes >= 2) {
                    golpes = 0;
                    group.position.copy(basePos);
                    return { tipo: 'golpe', noqueado: true };
                }
                return { tipo: 'golpe', noqueado: false, golpes };
            }
        }
        return null;
    }

    return {
        group,
        invocar,
        recibirDisparo,
        actualizar,
        distanciaBateria: (p) => (bateria.visible && !bateriaRecogida) ? Math.hypot(p.x - bateria.position.x, p.z - bateria.position.z) : Infinity,
        recogerBateria: () => {
            if (!bateria.visible || bateriaRecogida) return false;
            bateriaRecogida = true;
            bateria.visible = false;
            return true;
        },
        estaActivo: () => activo,
        estaDerrotado: () => derrotado,
        tieneBateria: () => bateriaRecogida
    };
}
