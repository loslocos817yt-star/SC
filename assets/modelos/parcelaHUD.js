import * as THREE from 'three';
import { crearJefeBosque } from './personajes/JefeBosque.js';

const DURACION_VIAJE = 15, Y_PLANETA = 180;

function mkCubo() {
    const g = new THREE.Group();
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#d91e18'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#5c0606'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 60);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }));
    m.position.y = 0.31;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    p.position.set(0.18, 0.78, 0); p.rotation.z = -0.25;
    g.add(m, p);
    return g;
}

function mkEstrellas() {
    const pos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 150;
        pos[i * 3 + 1] = Math.random() * 220;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.9 }));
    pts.visible = false;
    return pts;
}

function mkPlaneta() {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x5c3648, roughness: 0.92 }));
    s.position.y = -0.6;
    g.add(s);
    const rm = new THREE.MeshStandardMaterial({ color: 0x3a2230, roughness: 0.88 });
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, r = 7 + (i % 5) * 6;
        const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + (i % 4) * 0.6, 0), rm);
        rk.position.set(Math.cos(a) * r, 0.35 + (i % 3) * 0.25, Math.sin(a) * r);
        g.add(rk);
    }
    g.visible = false;
    return g;
}

export function crearParcelaHUD(opts) {
    const { scene, dialogoBox, salamandra, perseguidor, arma, coheteCtrl, sfx, destinoPicada, getYaw, getEnParcelaNueva, getEstadoCohete, getEnCoche, getMuroDerribado, getScore, onDespegarCohete, onReset, onGolpeShake, onNoqueadoTeleport } = opts;

    const mira = document.createElement('div');
    mira.style.cssText = 'display:none;position:fixed;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:rgba(255,255,255,.92);border:1.5px solid #000;pointer-events:none;z-index:25;';
    document.body.appendChild(mira);

    const mkB = (txt, css, tag = 'button') => {
        const b = document.createElement(tag);
        if (tag === 'a') b.href = 'credits.html';
        b.innerText = txt;
        b.style.cssText = `display:none;position:fixed;z-index:30;font-weight:bold;${css}`;
        document.body.appendChild(b);
        return b;
    };

    const btnCohete = mkB('SUBIR AL COHETE', 'right:20px;bottom:140px;padding:10px 14px;background:#f30;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnAbordar = mkB('SUBIR AL COHETE', 'right:20px;bottom:140px;padding:11px 16px;background:#1d6fa5;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnRecoger = mkB('RECOGER M16A1', 'right:20px;bottom:140px;padding:10px 14px;background:#2b2b2b;color:#fff;border:2px solid #fa0;border-radius:8px;');
    const btnDisparar = mkB('DISPARAR', 'right:20px;bottom:80px;padding:11px 16px;background:#c10;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnComb = mkB('ROBAR COMBUSTIBLE', 'right:20px;bottom:200px;padding:10px 14px;background:#b87700;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnCargar = mkB('CARGAR COMBUSTIBLE', 'right:20px;bottom:200px;padding:10px 14px;background:#c44d00;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnBat = mkB('RECOGER BATERÍA', 'right:20px;bottom:200px;padding:10px 14px;background:#2a6f2a;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnInst = mkB('INSTALAR BATERÍA', 'right:20px;bottom:200px;padding:10px 14px;background:#1f5fa8;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnEspacio = mkB('DESPEGAR AL ESPACIO', 'right:20px;bottom:140px;padding:11px 16px;background:#3a1c71;color:#fff;border:2px solid #fff;border-radius:8px;');
    const btnReset = mkB('RESET', 'display:block;left:16px;top:16px;padding:6px 10px;background:rgba(0,0,0,.65);color:#fff;border:1px solid #fff;border-radius:6px;font-size:11px;');
    const btnCreditos = mkB('IR A CRÉDITOS', 'right:16px;top:16px;padding:8px 13px;background:#28144a;color:#fff;border:2px solid #fff;border-radius:6px;font-size:11px;text-decoration:none;', 'a');

    const jefe = scene ? crearJefeBosque(scene, []) : null;
    const cubo1 = mkCubo(), cubo2 = mkCubo(), estrellas = mkEstrellas(), planeta = mkPlaneta();
    cubo1.visible = cubo2.visible = false;
    if (scene) scene.add(cubo1, cubo2, estrellas, planeta);

    let tieneComb = false, cargComb = false, instBat = false, perseDer = false;
    let aBordo = false, volando = false, chocoPlaneta = false, tVuelo = 0, altEsp = 0, msgT = null;
    const cIni = scene?.background ? scene.background.clone() : new THREE.Color(0xff7722);
    const cEsp = new THREE.Color(0x050714), cPla = new THREE.Color(0x2a1426);

    const btns = [btnCohete, btnAbordar, btnRecoger, btnDisparar, btnComb, btnCargar, btnBat, btnInst, btnEspacio];
    const ocultarBtns = () => btns.forEach(b => (b.style.display = 'none'));
    const decir = (html, ms = 2400) => {
        dialogoBox.innerHTML = html; dialogoBox.style.display = 'block';
        if (msgT) clearTimeout(msgT);
        if (ms > 0) msgT = setTimeout(() => { dialogoBox.style.display = 'none'; }, ms);
    };

    function activarParcela() {
        const cx = destinoPicada.x - 10, cz = destinoPicada.z - 12;
        perseguidor.activar(cx, cz);
        arma.colocarEnBosque(destinoPicada.x + 2, destinoPicada.z - 2);
        cubo1.position.set(cx - 0.55, 0, cz + 1.95);
        cubo2.position.set(cx + 0.55, 0, cz + 1.95);
        perseDer = false;
    }

    function aplicarChoque(camera) {
        volando = false; chocoPlaneta = true; altEsp = Y_PLANETA;
        planeta.position.set(destinoPicada.x, Y_PLANETA, destinoPicada.z); planeta.visible = true;
        estrellas.visible = false; btnCreditos.style.display = 'inline-block';
        const m = coheteCtrl.getMesh();
        if (m) { m.visible = true; m.position.set(destinoPicada.x, Y_PLANETA + 0.6, destinoPicada.z); m.rotation.set(0.28, 0, -0.18); }
        salamandra.visible = true; salamandra.position.set(destinoPicada.x + 3.2, Y_PLANETA, destinoPicada.z + 3.2);
        if (camera) camera.position.set(salamandra.position.x, Y_PLANETA + 1.25, salamandra.position.z);
        if (scene?.background) { scene.background.copy(cPla); if (scene.fog) scene.fog.color.copy(cPla); }
        onGolpeShake(0.65);
        decir('<b>¡CHOCASTE EN OTRO PLANETA!</b> Aquí sigue la partida.', 4200);
    }

    function getEstadoMision() {
        return { tieneComb, cargComb, instBat, perseDer, aBordo, volando, chocoPlaneta, tVuelo: +tVuelo.toFixed(2), altEsp: +altEsp.toFixed(2) };
    }

    function aplicarEstadoMision(st) {
        if (!st || typeof st !== 'object') return;
        tieneComb = !!st.tieneComb; cargComb = !!st.cargComb; instBat = !!st.instBat; perseDer = !!st.perseDer;
        aBordo = !!st.aBordo; volando = !!st.volando; chocoPlaneta = !!st.chocoPlaneta;
        tVuelo = typeof st.tVuelo === 'number' ? Math.max(0, st.tVuelo) : 0;
        altEsp = typeof st.altEsp === 'number' ? Math.max(0, st.altEsp) : 0;
        if (cargComb && !instBat && jefe) jefe.invocar(destinoPicada.x + 14, destinoPicada.z - 14);
        if (chocoPlaneta) {
            planeta.position.set(destinoPicada.x, Y_PLANETA, destinoPicada.z); planeta.visible = true;
            btnCreditos.style.display = 'inline-block';
            const m = coheteCtrl.getMesh();
            if (m) { m.visible = true; m.position.set(destinoPicada.x, Y_PLANETA + 0.6, destinoPicada.z); m.rotation.set(0.28, 0, -0.18); }
            if (scene?.background) { scene.background.copy(cPla); if (scene.fog) scene.fog.color.copy(cPla); }
        } else if (volando || aBordo) {
            salamandra.visible = false;
            const m = coheteCtrl.getMesh();
            if (m) {
                m.visible = true; m.rotation.set(0, 0, 0);
                m.position.set(destinoPicada.x, 0.8 + (volando ? altEsp : 0), destinoPicada.z);
                salamandra.position.set(m.position.x, m.position.y + 0.6, m.position.z);
                if (volando) { estrellas.position.set(m.position.x, m.position.y + altEsp * 0.35, m.position.z); estrellas.visible = true; }
            }
        }
    }

    btnReset.addEventListener('click', onReset);
    btnCohete.addEventListener('click', onDespegarCohete);

    btnRecoger.addEventListener('click', () => {
        if (arma.recoger()) { btnRecoger.style.display = 'none'; btnDisparar.style.display = 'block'; decir('<b>M16A1 equipada.</b>'); }
    });

    btnDisparar.addEventListener('click', () => {
        if (!getEnParcelaNueva() || aBordo || volando) return;
        const yaw = getYaw(), dirXZ = { x: Math.sin(yaw), z: Math.cos(yaw) };
        const h1 = perseguidor.recibirDisparo(salamandra.position, dirXZ);
        const h2 = (!h1.dio && jefe) ? jefe.recibirDisparo(salamandra.position, dirXZ) : { dio: false };
        let dist = 22;
        if (h1.dio) dist = Math.max(1.2, Math.hypot(perseguidor.group.position.x - salamandra.position.x, perseguidor.group.position.z - salamandra.position.z));
        else if (h2.dio && jefe) dist = Math.max(1.2, Math.hypot(jefe.group.position.x - salamandra.position.x, jefe.group.position.z - salamandra.position.z));
        if (!arma.disparar(salamandra.position, dirXZ, dist)) return;
        sfx.reproducirDisparo(); onGolpeShake(0.08);
        if (h1.dio) {
            if (h1.murio) { perseDer = true; decir('<b>¡Tumbaste al wey!</b> Ve por los cubos.', 3000); }
            else decir(`<b>¡Le diste!</b> Quedan ${h1.hp} tiros.`, 1400);
        } else if (h2.dio) {
            if (h2.murio) decir('<b>¡Tumbaste al Jefe!</b> Agarra la batería.', 3200);
            else decir(`<b>¡Impacto al Jefe!</b> Quedan ${h2.hp} tiros.`, 1400);
        }
    });

    btnComb.addEventListener('click', () => {
        if (!perseDer || tieneComb) return;
        tieneComb = true; cubo1.visible = cubo2.visible = false; btnComb.style.display = 'none';
        decir('<b>¡Combustible listo!</b> Cárgalo en el cohete.', 3200);
    });

    btnCargar.addEventListener('click', () => {
        if (!tieneComb || cargComb) return;
        cargComb = true; btnCargar.style.display = 'none';
        if (jefe) jefe.invocar(destinoPicada.x + 14, destinoPicada.z - 14);
        decir('<b>¡Combustible cargado!</b> Falta batería: ¡salió el Jefe!', 3800);
    });

    btnBat.addEventListener('click', () => {
        if (jefe && jefe.recogerBateria()) { btnBat.style.display = 'none'; decir('<b>¡Batería recogida!</b> Instálala en el cohete.', 3200); }
    });

    btnInst.addEventListener('click', () => {
        if (!jefe?.tieneBateria() || instBat) return;
        instBat = true; btnInst.style.display = 'none'; decir('<b>¡Batería instalada!</b> Súbete al cohete.', 3500);
    });

    btnAbordar.addEventListener('click', () => {
        if (!cargComb || !instBat || aBordo) return;
        aBordo = true; salamandra.visible = false; sfx.setCaminando(false); arma.ocultarTodo();
        const m = coheteCtrl.getMesh();
        if (m) { m.visible = true; m.rotation.set(0, 0, 0); salamandra.position.set(m.position.x, m.position.y + 0.6, m.position.z); }
        decir('<b>¡A bordo!</b> Pulsa DESPEGAR AL ESPACIO (15s).', 0);
    });

    btnEspacio.addEventListener('click', () => {
        if (!aBordo || volando) return;
        sfx.desbloquearMusica(); volando = true; tVuelo = 0; altEsp = 0; btnEspacio.style.display = 'none';
        const m = coheteCtrl.getMesh();
        if (m) { m.visible = true; m.rotation.set(0, 0, 0); estrellas.position.set(m.position.x, m.position.y, m.position.z); estrellas.visible = true; }
        decir('<b>¡Despegue en línea recta!</b> 15s hacia otro planeta...', 0);
    });

    function actualizar(delta, camera) {
        if (volando) {
            mira.style.display = 'none'; cubo1.visible = cubo2.visible = false; ocultarBtns();
            tVuelo += delta;
            const p = Math.min(1, tVuelo / DURACION_VIAJE);
            altEsp = p * Y_PLANETA;
            const m = coheteCtrl.getMesh();
            if (m) {
                m.visible = true; m.rotation.set(0, 0, 0); m.position.set(destinoPicada.x, 0.8 + altEsp, destinoPicada.z);
                salamandra.position.set(m.position.x, m.position.y + 0.6, m.position.z);
                estrellas.position.set(m.position.x, m.position.y + altEsp * 0.35, m.position.z);
                if (camera) { camera.position.set(m.position.x, m.position.y + 3.0, m.position.z + 9.0); camera.lookAt(m.position.x, m.position.y + 2.5, m.position.z); }
            }
            if (scene?.background) {
                scene.background.copy(cIni).lerp(cEsp, Math.min(1, p * 2.2));
                if (scene.fog) scene.fog.color.copy(scene.background);
            }
            if (tVuelo >= DURACION_VIAJE) aplicarChoque(camera);
            return true;
        }

        if (chocoPlaneta) {
            mira.style.display = 'none'; cubo1.visible = cubo2.visible = false; ocultarBtns();
            btnCreditos.style.display = 'inline-block'; salamandra.visible = true; salamandra.position.y = Y_PLANETA;
            return false;
        }

        if (getEnCoche() || getEstadoCohete() !== 'none') {
            mira.style.display = 'none'; cubo1.visible = cubo2.visible = false; arma.ocultarTodo(); ocultarBtns();
            return false;
        }

        if (aBordo) {
            mira.style.display = 'none'; cubo1.visible = cubo2.visible = false; ocultarBtns();
            const m = coheteCtrl.getMesh();
            if (m) {
                m.visible = true; m.rotation.set(0, 0, 0); salamandra.position.set(m.position.x, m.position.y + 0.6, m.position.z);
                if (camera) { camera.position.set(m.position.x, m.position.y + 3.0, m.position.z + 9.0); camera.lookAt(m.position.x, m.position.y + 2.2, m.position.z); }
            }
            btnEspacio.style.display = 'block';
            return true;
        }

        const enParcela = getEnParcelaNueva();
        arma.actualizar(delta, enParcela);

        if (enParcela) {
            mira.style.display = 'block';
            const verCubos = perseDer && !tieneComb;
            cubo1.visible = cubo2.visible = verCubos;
            if (verCubos) { cubo1.rotation.y += delta * 1.4; cubo2.rotation.y -= delta * 1.4; }

            const { evento, derrotado } = perseguidor.actualizar(delta, salamandra.position, true);
            if (derrotado) perseDer = true;
            if (evento) {
                if (evento.tipo === 'salio') decir('<b>¡Salió de su casa!</b>', 2000);
                else if (evento.tipo === 'regreso') decir('<b>Regresó a su casa.</b>', 1800);
                else if (evento.tipo === 'golpe') {
                    onGolpeShake(0.25);
                    if (evento.noqueado) { onNoqueadoTeleport(); decir('<b>¡Te tumbó!</b>', 2200); }
                    else decir(`<b>¡Golpe ${evento.golpes}/${evento.maxGolpes}!</b>`, 2000);
                }
            }

            if (jefe && jefe.estaActivo()) {
                const evJ = jefe.actualizar(delta, salamandra.position);
                if (evJ && evJ.tipo === 'golpe') {
                    onGolpeShake(0.32);
                    if (evJ.noqueado) { onNoqueadoTeleport(); decir('<b>¡El Jefe te noqueó!</b>', 2600); }
                    else decir('<b>¡Golpe pesado del Jefe!</b>', 2200);
                }
            }

            btnRecoger.style.display = arma.distanciaJugador(salamandra.position) < 2.8 ? 'block' : 'none';
            btnDisparar.style.display = arma.estaEquipada() ? 'block' : 'none';

            const cx = destinoPicada.x - 10, cz = destinoPicada.z - 12;
            btnComb.style.display = (verCubos && Math.hypot(salamandra.position.x - cx, salamandra.position.z - (cz + 1.5)) < 3.6) ? 'block' : 'none';

            const m = coheteCtrl.getMesh();
            const cercaC = m && Math.hypot(salamandra.position.x - m.position.x, salamandra.position.z - m.position.z) < 7.5;
            btnCargar.style.display = (tieneComb && !cargComb && cercaC) ? 'block' : 'none';
            btnBat.style.display = (jefe && jefe.distanciaBateria(salamandra.position) < 3.2) ? 'block' : 'none';
            btnInst.style.display = (jefe?.tieneBateria() && !instBat && cercaC) ? 'block' : 'none';
            btnAbordar.style.display = (cargComb && instBat && cercaC) ? 'block' : 'none';
            btnCohete.style.display = 'none';
        } else {
            mira.style.display = 'none'; cubo1.visible = cubo2.visible = false; ocultarBtns();
            const m = coheteCtrl.getMesh();
            const cercaC = m && Math.hypot(salamandra.position.x - m.position.x, salamandra.position.z - m.position.z) < 6.0;
            btnCohete.style.display = (cercaC && (getScore() < 0 || getMuroDerribado())) ? 'block' : 'none';
        }
        return false;
    }

    return { activarParcela, actualizar, getEstadoMision, aplicarEstadoMision };
}
