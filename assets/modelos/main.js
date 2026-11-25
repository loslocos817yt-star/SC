import * as THREE from 'three';
import { crearSalamandra, actualizarAnimacion } from './salamandra.js';
import { generarMundo } from './world.js';
import { crearPerseguidor } from './personajes/Perseguidor.js';
import { crearSFX } from './sfx.js';
import { crearArmaM16 } from './arma.js';
import { crearParcelaHUD } from './parcelaHUD.js';

const SAVE_KEY = 'salamandra_city_save_v1';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xff7722);
scene.fog = new THREE.FogExp2(0xff7722, 0.045);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 400);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffaa55, 1.1));
const dirLight = new THREE.DirectionalLight(0xff4400, 1.5);
dirLight.position.set(40, 30, 40);
scene.add(dirLight);

const clock = new THREE.Clock();
const {
    obstaculosColisiones, colisionesParcelaNueva, insectos, crearInsecto,
    mixersAnimaciones, cocheCtrl, muroDestructible, coheteCtrl,
    mundoPuebloGroup, descargarPueblo, cargarPueblo, activarParcelaNueva
} = generarMundo(scene);

const salamandra = crearSalamandra();
scene.add(salamandra);

const perseguidor = crearPerseguidor(scene, colisionesParcelaNueva);
const sfx = crearSFX();
const arma = crearArmaM16(scene, camera);

const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
const btnInteractuar = document.getElementById('btn-interactuar');
const btnCoche = document.getElementById('btn-coche');
const dialogoBox = document.getElementById('dialogo-box');
const scoreElement = document.getElementById('score');

const posPollero = new THREE.Vector3(0, 0, -33.2);
const posCoche = new THREE.Vector3(4.5, 0, -24);
const destinoPicada = new THREE.Vector3(6, 0, -220);

let joyVector = { x: 0, y: 0 }, joyId = null, lookId = null;
let lastLookX = 0, lastLookY = 0, yaw = 0, pitch = 0;
let enCoche = false, muroDerribado = false, velCoche = 0, coheteRevelado = false;
let estadoCohete = 'none', inicioVuelo = new THREE.Vector3(), progRuta = 0;
let enParcelaNueva = false, score = 0, turnoDialogo = 0, shakeTimer = 0;

const frasesPollero = [
    '<b>Don Pepe:</b> Junta 15 insectos y te presto la nave para tumbar ese pedazo de muro.',
    '<b>Don Pepe:</b> Cruzando la barda está el cohete; súbete y te manda en picada.',
    '<b>Don Pepe:</b> ¡Písale a fondo para abrir el boquete!'
];

const hud = crearParcelaHUD({
    scene,
    dialogoBox, salamandra, perseguidor, arma, coheteCtrl, sfx, destinoPicada,
    getYaw: () => yaw,
    getEnParcelaNueva: () => enParcelaNueva,
    getEstadoCohete: () => estadoCohete,
    getEnCoche: () => enCoche,
    getMuroDerribado: () => muroDerribado,
    getScore: () => score,
    onDespegarCohete: () => {
        sfx.desbloquearMusica();
        const m = coheteCtrl.getMesh();
        if (!m || estadoCohete !== 'none') return;
        estadoCohete = 'subiendo'; progRuta = 0; inicioVuelo.copy(m.position);
        salamandra.visible = false; sfx.setCaminando(false); descargarPueblo(true);
        if (mundoPuebloGroup) mundoPuebloGroup.visible = false;
        coheteCtrl.setColisionActiva(false);
        dialogoBox.innerHTML = '<b>¡Despegue!</b> Saliendo del pueblo...';
        dialogoBox.style.display = 'block';
    },
    onReset: () => { localStorage.removeItem(SAVE_KEY); location.reload(); },
    onGolpeShake: (t) => { shakeTimer = Math.max(shakeTimer, t); },
    onNoqueadoTeleport: () => { salamandra.position.set(destinoPicada.x + 4.5, 0, destinoPicada.z + 5); }
});

function guardarSave() {
    if (estadoCohete !== 'none') return;
    try {
        const m = coheteCtrl.getMesh();
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            x: +salamandra.position.x.toFixed(3), z: +salamandra.position.z.toFixed(3),
            yaw: +yaw.toFixed(4), pitch: +pitch.toFixed(4),
            score, muroDerribado, coheteRevelado, enParcelaNueva,
            cohetePos: m ? { x: +m.position.x.toFixed(3), y: +m.position.y.toFixed(3), z: +m.position.z.toFixed(3), vis: Boolean(m.visible) } : null,
            mision: hud.getEstadoMision ? hud.getEstadoMision() : null
        }));
    } catch (_) {}
}

function cargarSave() {
    try {
        const esNueva = sessionStorage.getItem('salamandra_nueva_partida') === '1' || location.search.includes('nueva=');
        if (esNueva) {
            sessionStorage.removeItem('salamandra_nueva_partida');
            localStorage.removeItem(SAVE_KEY);
            return;
        }
        const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        if (!d || typeof d.x !== 'number' || typeof d.z !== 'number') return;
        if (typeof d.score === 'number') { score = d.score; if (scoreElement) scoreElement.innerText = score; }
        if (d.muroDerribado) {
            muroDerribado = true; muroDestructible.rotation.x = -Math.PI / 2; muroDestructible.position.z = -35.5;
            const i = obstaculosColisiones.findIndex(o => o.id === 'coche');
            if (i !== -1) obstaculosColisiones.splice(i, 1);
        }
        if (d.coheteRevelado) { coheteRevelado = true; coheteCtrl.revelar(); }
        if (d.enParcelaNueva) {
            enParcelaNueva = true; activarParcelaNueva(destinoPicada.x, destinoPicada.z);
            descargarPueblo(true);
            if (mundoPuebloGroup) mundoPuebloGroup.visible = false;
            const m = coheteCtrl.getMesh();
            const cp = d.cohetePos;
            if (m) {
                m.visible = cp ? Boolean(cp.vis) : true;
                m.position.set(cp?.x ?? destinoPicada.x, cp?.y ?? 0.8, cp?.z ?? destinoPicada.z);
            }
            coheteCtrl.posicion.set(destinoPicada.x, 0, destinoPicada.z);
            const col = obstaculosColisiones.find(o => o.id === 'cohete');
            if (col) { col.x = destinoPicada.x; col.z = destinoPicada.z; col.activo = true; }
            hud.activarParcela();
            if (d.mision && hud.aplicarEstadoMision) hud.aplicarEstadoMision(d.mision);
        }
        salamandra.position.set(d.x, 0, d.z);
        if (typeof d.yaw === 'number') yaw = d.yaw;
        if (typeof d.pitch === 'number') pitch = d.pitch;
    } catch (_) {}
}

window.addEventListener('beforeunload', () => { sfx.pausarTodo(); guardarSave(); });
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { sfx.pausarTodo(); guardarSave(); }
    else { sfx.reanudarMusica(); }
});
setInterval(guardarSave, 1500);

function updateJoystick(t) {
    const r = joystickZone.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > 40) { dx = (dx / dist) * 40; dy = (dy / dist) * 40; }
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joyVector.x = dx / 40; joyVector.y = dy / 40;
}

window.addEventListener('touchstart', (e) => {
    sfx.desbloquearMusica();
    for (const t of e.changedTouches) {
        const r = joystickZone.getBoundingClientRect();
        if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom && joyId === null) {
            joyId = t.identifier; updateJoystick(t);
        } else if (t.clientX > innerWidth / 3 && lookId === null) {
            lookId = t.identifier; lastLookX = t.clientX; lastLookY = t.clientY;
        }
    }
});

window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
        if (t.identifier === joyId) updateJoystick(t);
        else if (t.identifier === lookId) {
            yaw -= (t.clientX - lastLookX) * 0.005;
            pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch - (t.clientY - lastLookY) * 0.005));
            lastLookX = t.clientX; lastLookY = t.clientY;
        }
    }
});

function resetTouch(e) {
    for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; joyVector = { x: 0, y: 0 }; joystickKnob.style.transform = 'translate(-50%, -50%)'; }
        else if (t.identifier === lookId) lookId = null;
    }
}
window.addEventListener('touchend', resetTouch);
window.addEventListener('touchcancel', resetTouch);

document.getElementById('fullscreen-btn').addEventListener('click', async () => {
    sfx.desbloquearMusica();
    try {
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (_) {}
});

btnInteractuar.addEventListener('click', () => {
    sfx.desbloquearMusica();
    turnoDialogo = (turnoDialogo + 1) % frasesPollero.length;
    dialogoBox.innerHTML = frasesPollero[turnoDialogo];
});

btnCoche.addEventListener('click', () => {
    sfx.desbloquearMusica();
    if (score >= 15 && !enCoche && !muroDerribado) {
        enCoche = true; salamandra.visible = false; sfx.setCaminando(false);
        btnCoche.style.display = btnInteractuar.style.display = dialogoBox.style.display = 'none';
        const i = obstaculosColisiones.findIndex(o => o.id === 'coche');
        if (i !== -1) obstaculosColisiones.splice(i, 1);
    }
});

function puedeMoverseA(x, z) {
    if (enParcelaNueva) {
        if (z < destinoPicada.z - 22 || Math.hypot(x - destinoPicada.x, z - destinoPicada.z) > 48) return false;
        for (const o of colisionesParcelaNueva) if (Math.hypot(x - o.x, z - o.z) < o.radio + 0.35) return false;
        const m = coheteCtrl.getMesh();
        if (m && Math.hypot(x - m.position.x, z - m.position.z) < 2.2) return false;
        return true;
    }
    if (Math.abs(x) > 95 || z > 90) return false;
    if (!muroDerribado) { if (z < -33.5) return false; }
    else if ((!(x > 1.8 && x < 7.2) && z < -33.5 && z > -34.5) || z < -130) return false;
    for (const o of obstaculosColisiones) {
        if (o.activo !== false && Math.hypot(x - o.x, z - o.z) < o.radio + 0.3) return false;
    }
    return true;
}

function actualizarRutaCohete(delta) {
    const m = coheteCtrl.getMesh(), nave = coheteCtrl.getNave();
    if (!m || !nave) return;
    m.visible = nave.visible = true; descargarPueblo(true);
    if (mundoPuebloGroup) mundoPuebloGroup.visible = false;
    const midX = THREE.MathUtils.lerp(inicioVuelo.x, destinoPicada.x, 0.5);
    const midZ = THREE.MathUtils.lerp(inicioVuelo.z, destinoPicada.z, 0.5);
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    const px = m.position.x, py = m.position.y, pz = m.position.z;
    if (estadoCohete === 'subiendo') {
        progRuta = Math.min(1, progRuta + delta * 0.22);
        m.position.set(THREE.MathUtils.lerp(inicioVuelo.x, midX, progRuta), THREE.MathUtils.lerp(0, 45, progRuta), THREE.MathUtils.lerp(inicioVuelo.z, midZ, progRuta));
        dir.set(m.position.x - px, m.position.y - py, m.position.z - pz);
        if (dir.lengthSq() > 1e-6) nave.quaternion.setFromUnitVectors(up, dir.normalize());
        if (progRuta >= 1) { estadoCohete = 'picada'; progRuta = 0; dialogoBox.innerHTML = '<b>¡En picada!</b>'; }
    } else {
        progRuta = Math.min(1, progRuta + delta * 0.42);
        const e = progRuta * progRuta;
        m.position.set(THREE.MathUtils.lerp(midX, destinoPicada.x, progRuta), THREE.MathUtils.lerp(45, 0.8, e), THREE.MathUtils.lerp(midZ, destinoPicada.z, progRuta));
        dir.set(m.position.x - px, m.position.y - py, m.position.z - pz);
        if (dir.lengthSq() > 1e-6) nave.quaternion.setFromUnitVectors(up, dir.normalize());
        if (progRuta >= 1) {
            activarParcelaNueva(destinoPicada.x, destinoPicada.z); enParcelaNueva = true;
            m.position.set(destinoPicada.x, 0.8, destinoPicada.z);
            coheteCtrl.posicion.set(destinoPicada.x, 0, destinoPicada.z);
            const col = obstaculosColisiones.find(o => o.id === 'cohete');
            if (col) { col.x = destinoPicada.x; col.z = destinoPicada.z; col.activo = true; }
            estadoCohete = 'none'; salamandra.visible = true;
            salamandra.position.set(destinoPicada.x + 4.5, 0, destinoPicada.z + 5);
            yaw = Math.PI; pitch = 0; guardarSave(); hud.activarParcela();
            dialogoBox.innerHTML = '<b>Bosque:</b> Ahí tirada está la M16A1 y la casita del wey.';
            dialogoBox.style.display = 'block';
            setTimeout(() => { dialogoBox.style.display = 'none'; }, 4200);
            return;
        }
    }
    const nose = new THREE.Vector3(0, 6, 0).applyQuaternion(nave.quaternion);
    const back = new THREE.Vector3(0, -1.5, 4.2).applyQuaternion(nave.quaternion);
    camera.position.set(m.position.x + back.x, m.position.y + 3.2 + back.y, m.position.z + back.z);
    camera.lookAt(m.position.x + nose.x, m.position.y + 2 + nose.y, m.position.z + nose.z);
}

function actualizarCinematicaCoche() {
    const c = cocheCtrl.getMesh();
    if (!c) return;
    salamandra.visible = false; velCoche += 0.015; c.position.z -= velCoche;
    salamandra.position.set(c.position.x, 0.8, c.position.z);
    camera.position.set(c.position.x + 3.5, 3, c.position.z + 6.5);
    camera.lookAt(c.position.x, 1, c.position.z - 4);
    if (c.position.z <= -33.5 && !muroDerribado) { muroDerribado = true; sfx.reproducirCaidaMuro(); guardarSave(); }
    if (muroDerribado && muroDestructible.rotation.x > -Math.PI / 2) { muroDestructible.rotation.x -= 0.08; muroDestructible.position.z -= 0.15; }
    if (c.position.z <= -34.5 && !coheteRevelado) { coheteRevelado = true; coheteCtrl.revelar(); guardarSave(); }
    if (c.position.z <= -42) {
        enCoche = false; salamandra.visible = true; salamandra.position.set(4.5, 0, -37);
        yaw = Math.PI; pitch = 0; guardarSave();
        dialogoBox.innerHTML = '<b>¡A huevo!</b> Muro derribado.'; dialogoBox.style.display = 'block';
        setTimeout(() => { dialogoBox.style.display = 'none'; }, 4000);
    }
}

function updatePlayer(delta) {
    if (enCoche) return actualizarCinematicaCoche();
    if (estadoCohete !== 'none') return actualizarRutaCohete(delta);
    if (!enParcelaNueva) { cargarPueblo(); if (mundoPuebloGroup) mundoPuebloGroup.visible = true; }
    else if (mundoPuebloGroup) mundoPuebloGroup.visible = false;

    salamandra.visible = true;
    let mov = false;
    if (Math.hypot(joyVector.x, joyVector.y) > 0.1) {
        mov = true;
        const fwd = -joyVector.y, right = -joyVector.x;
        const dx = (Math.sin(yaw) * fwd + Math.cos(yaw) * right) * 0.08;
        const dz = (Math.cos(yaw) * fwd - Math.sin(yaw) * right) * 0.08;
        if (puedeMoverseA(salamandra.position.x + dx, salamandra.position.z)) salamandra.position.x += dx;
        if (puedeMoverseA(salamandra.position.x, salamandra.position.z + dz)) salamandra.position.z += dz;
    }
    sfx.setCaminando(mov); const pisoY = (hud.getEstadoMision && hud.getEstadoMision().chocoPlaneta) ? 180 : 0;
    salamandra.position.y = pisoY; salamandra.rotation.y = yaw;
    actualizarAnimacion(salamandra, mov);

    const controlEspacio = hud.actualizar(delta, camera);
    if (controlEspacio) return;

    if (!enParcelaNueva && salamandra.position.distanceTo(posPollero) < 3.5) {
        btnInteractuar.style.display = dialogoBox.style.display = 'block';
        if (score >= 15 && !muroDerribado) dialogoBox.innerHTML = '<b>Don Pepe:</b> ¡Ya juntaste los 15 insectos! Súbete al coche.';
    } else {
        btnInteractuar.style.display = 'none';
        if (!muroDerribado && !enParcelaNueva) dialogoBox.style.display = 'none';
    }

    if (!enParcelaNueva && salamandra.position.distanceTo(posCoche) < 4 && !muroDerribado) {
        if (score >= 15) btnCoche.style.display = 'block';
        else { dialogoBox.innerHTML = `<b>Coche bloqueado:</b> Te faltan ${15 - score} insectos.`; dialogoBox.style.display = 'block'; }
    } else btnCoche.style.display = 'none';

    if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - delta);
    const sx = shakeTimer > 0 ? (Math.random() - 0.5) * 0.18 : 0;
    const sy = shakeTimer > 0 ? (Math.random() - 0.5) * 0.18 : 0;
    const baseY = salamandra.position.y + 1.25;
    camera.position.set(salamandra.position.x + sx, baseY + sy, salamandra.position.z);
    camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch), baseY + sy + Math.sin(pitch), camera.position.z + Math.cos(yaw) * Math.cos(pitch));

    for (let i = insectos.length - 1; i >= 0; i--) {
        if (salamandra.position.distanceTo(insectos[i].position) < 0.8) {
            scene.remove(insectos[i]); insectos.splice(i, 1);
            score++; if (scoreElement) scoreElement.innerText = score;
            guardarSave(); crearInsecto();
        }
    }
}

cargarSave();
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixersAnimaciones.length) mixersAnimaciones.forEach(mx => mx.update(delta));
    updatePlayer(delta);
    renderer.render(scene, camera);
})();
