import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

function quitarRootPosition(clip) {
    if (!clip || !Array.isArray(clip.tracks)) return clip;
    clip.tracks = clip.tracks.filter((track) => !track.name.endsWith('.position'));
    clip.resetDuration();
    return clip;
}

function elegirMejorClip(animations) {
    if (!Array.isArray(animations) || animations.length === 0) return null;
    let mejor = animations[0];
    for (const anim of animations) {
        if ((anim.tracks?.length || 0) > (mejor.tracks?.length || 0)) {
            mejor = anim;
        }
    }
    return quitarRootPosition(mejor);
}

export function crearPerseguidor(scene, colisiones = []) {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    const casaGroup = new THREE.Group();
    casaGroup.visible = false;

    const muroCasa = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 2.2, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.9 })
    );
    muroCasa.position.set(0, 1.1, -0.1);

    const puertaMarco = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 1.65, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x1a0d07, roughness: 0.95 })
    );
    puertaMarco.position.set(0, 0.825, 1.52);

    const techoCasa = new THREE.Mesh(
        new THREE.ConeGeometry(2.75, 1.45, 4),
        new THREE.MeshStandardMaterial({ color: 0x631e16, roughness: 0.85 })
    );
    techoCasa.position.set(0, 2.92, -0.1);
    techoCasa.rotation.y = Math.PI / 4;

    casaGroup.add(muroCasa, puertaMarco, techoCasa);
    scene.add(casaGroup);

    const colCasa = { id: 'casa_perseguidor', x: 0, z: 0, radio: 1.35 };
    colisiones.push(colCasa);

    let modelo = null;
    let mixer = null;
    let accionCorrer = null;
    let habilitadoEnParcela = false;

    let estado = 'en_casa';
    const casaPos = new THREE.Vector3();
    const alturaDeseada = 1.8;
    const velAcecho = 1.65;
    const velEmbestida = 2.45;
    const velRegreso = 1.8;

    const radioAlerta = 9.0;
    const distanciaRendirse = 17.5;
    const angulosDesvio = [0, 0.55, -0.55, 1.05, -1.05, 1.55, -1.55];

    let cooldownGolpe = 0;
    let avisoSalidaMostrado = false;
    let golpesDados = 0;
    const maxGolpes = 3;
    let hp = 5;
    const maxHp = 5;
    let derrotado = false;

    const textura = texLoader.load('assets/modelos/personajes/Character_Killer_01.png', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
    });

    function ajustarAlturaA(obj, targetHeight) {
        obj.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(obj);
        const altoActual = box.max.y - box.min.y;
        if (altoActual > 0.0001) {
            const factor = targetHeight / altoActual;
            obj.scale.multiplyScalar(factor);
            obj.updateMatrixWorld(true);
            const boxAjustada = new THREE.Box3().setFromObject(obj);
            obj.position.y -= boxAjustada.min.y;
        }
    }

    loader.load(
        'assets/modelos/personajes/Character_Killer_01.Running.fbx',
        (fbx) => {
            fbx.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: textura,
                        roughness: 0.88,
                        metalness: 0.05
                    });
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            ajustarAlturaA(fbx, alturaDeseada);
            modelo = fbx;
            group.add(modelo);

            const clipLimpio = elegirMejorClip(fbx.animations);
            if (clipLimpio) {
                mixer = new THREE.AnimationMixer(fbx);
                accionCorrer = mixer.clipAction(clipLimpio);
                accionCorrer.enabled = true;
                accionCorrer.setEffectiveWeight(1);
                accionCorrer.setLoop(THREE.LoopRepeat, Infinity);
                accionCorrer.timeScale = 0.85;
                accionCorrer.play();
            }
        },
        undefined,
        () => {
            const fallback = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.36, 1.08, 4, 8),
                new THREE.MeshStandardMaterial({ map: textura })
            );
            fallback.position.y = alturaDeseada / 2;
            modelo = fallback;
            group.add(modelo);
        }
    );

    function libreEn(x, z, ignorarCasa = false) {
        for (const o of colisiones) {
            if (ignorarCasa && o === colCasa) continue;
            if (o.activo === false) continue;
            const r = (o.radio || 0.9) + 0.25;
            if (Math.hypot(x - o.x, z - o.z) < r) {
                return false;
            }
        }
        return true;
    }

    function moverHacia(tx, tz, vel, delta, ignorarCasa = false) {
        const dx = tx - group.position.x;
        const dz = tz - group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= 0.05) return dist;

        const angBase = Math.atan2(dx, dz);
        const paso = Math.min(dist, vel * delta);

        for (const offset of angulosDesvio) {
            const ang = angBase + offset;
            const nx = group.position.x + Math.sin(ang) * paso;
            const nz = group.position.z + Math.cos(ang) * paso;
            if (libreEn(nx, nz, ignorarCasa)) {
                group.position.x = nx;
                group.position.z = nz;
                group.rotation.y = ang;
                return Math.hypot(tx - group.position.x, tz - group.position.z);
            }
        }

        group.rotation.y = angBase;
        return dist;
    }

    function activar(casaX, casaZ) {
        casaPos.set(casaX, 0, casaZ);
        casaGroup.position.set(casaX, 0, casaZ);
        casaGroup.visible = true;

        colCasa.x = casaX;
        colCasa.z = casaZ - 0.1;
        colCasa.activo = true;

        group.position.set(casaX, 0, casaZ + 1.9);
        estado = 'en_casa';
        group.visible = false;
        habilitadoEnParcela = true;
        cooldownGolpe = 0;
        avisoSalidaMostrado = false;
        golpesDados = 0;
        hp = maxHp;
        derrotado = false;
        if (modelo) modelo.rotation.x = 0;
    }

    function desactivar() {
        habilitadoEnParcela = false;
        estado = 'en_casa';
        group.visible = false;
        casaGroup.visible = false;
        colCasa.activo = false;
    }

    function colocarEn(x, z) {
        group.position.set(x, 0, z);
    }

    function recibirDisparo(origenPos, dirXZ) {
        if (!habilitadoEnParcela || derrotado || estado === 'en_casa') {
            return { dio: false, murio: false, hp };
        }
        const toEnemyX = group.position.x - origenPos.x;
        const toEnemyZ = group.position.z - origenPos.z;
        const dist = Math.hypot(toEnemyX, toEnemyZ);
        if (dist > 28 || dist < 0.05) return { dio: false, murio: false, hp };

        const dot = (toEnemyX / dist) * dirXZ.x + (toEnemyZ / dist) * dirXZ.z;
        if (dot < 0.88) return { dio: false, murio: false, hp };

        hp = Math.max(0, hp - 1);
        group.position.x += (toEnemyX / dist) * 0.35;
        group.position.z += (toEnemyZ / dist) * 0.35;

        if (hp <= 0) {
            derrotado = true;
            estado = 'muerto';
            if (modelo) modelo.rotation.x = -Math.PI / 2;
            return { dio: true, murio: true, hp: 0 };
        }
        return { dio: true, murio: false, hp };
    }

    function actualizar(delta, objetivoPos, habilitar) {
        if (!habilitar || !habilitadoEnParcela) {
            group.visible = false;
            casaGroup.visible = false;
            colCasa.activo = false;
            return { evento: null, persiguiendo: false, derrotado };
        }

        casaGroup.visible = true;
        colCasa.activo = true;

        if (derrotado) {
            group.visible = true;
            return { evento: null, persiguiendo: false, derrotado: true };
        }

        if (cooldownGolpe > 0) cooldownGolpe = Math.max(0, cooldownGolpe - delta);

        const distJugadorACasa = Math.hypot(objetivoPos.x - casaPos.x, objetivoPos.z - casaPos.z);
        const distJugadorABicho = Math.hypot(objetivoPos.x - group.position.x, objetivoPos.z - group.position.z);

        if (estado === 'en_casa') {
            group.visible = false;
            if (distJugadorACasa < radioAlerta) {
                estado = 'persiguiendo';
                group.position.set(casaPos.x, 0, casaPos.z + 2.15);
                group.visible = true;
                if (accionCorrer) {
                    accionCorrer.paused = false;
                    accionCorrer.timeScale = 0.95;
                    accionCorrer.play();
                }
                if (!avisoSalidaMostrado) {
                    avisoSalidaMostrado = true;
                    return { evento: { tipo: 'salio' }, persiguiendo: true, derrotado: false };
                }
            }
            return { evento: null, persiguiendo: false, derrotado: false };
        }

        group.visible = true;
        if (mixer) mixer.update(delta);

        if (estado === 'regresando') {
            if (accionCorrer) accionCorrer.timeScale = 0.8;

            if (distJugadorACasa < radioAlerta * 0.7) {
                estado = 'persiguiendo';
                return { evento: { tipo: 'salio' }, persiguiendo: true, derrotado: false };
            }

            const rest = moverHacia(casaPos.x, casaPos.z + 1.8, velRegreso, delta, true);
            if (rest < 1.15) {
                estado = 'en_casa';
                group.position.set(casaPos.x, 0, casaPos.z + 1.9);
                group.visible = false;
                golpesDados = 0;
                avisoSalidaMostrado = false;
                return { evento: { tipo: 'regreso' }, persiguiendo: false, derrotado: false };
            }
            return { evento: null, persiguiendo: false, derrotado: false };
        }

        if (distJugadorACasa > distanciaRendirse && distJugadorABicho > 9.5) {
            estado = 'regresando';
            return { evento: { tipo: 'regreso' }, persiguiendo: false, derrotado: false };
        }

        const cerca = distJugadorABicho < 6.0;
        if (accionCorrer) accionCorrer.timeScale = cerca ? 1.15 : 0.85;

        if (distJugadorABicho < 1.25 && cooldownGolpe <= 0) {
            cooldownGolpe = 1.6;
            golpesDados++;
            const noqueado = golpesDados >= maxGolpes;
            if (noqueado) {
                golpesDados = 0;
                estado = 'regresando';
            }
            return {
                evento: {
                    tipo: 'golpe',
                    golpes: golpesDados,
                    maxGolpes,
                    noqueado
                },
                persiguiendo: !noqueado,
                derrotado: false
            };
        }

        moverHacia(objetivoPos.x, objetivoPos.z, cerca ? velEmbestida : velAcecho, delta, false);
        return { evento: null, persiguiendo: true, derrotado: false };
    }

    return {
        group,
        casaGroup,
        activar,
        desactivar,
        colocarEn,
        recibirDisparo,
        actualizar
    };
}
