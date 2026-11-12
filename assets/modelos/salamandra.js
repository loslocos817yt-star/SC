import * as THREE from 'three';

function generarTexturaPiel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radioX = 5 + Math.random() * 20;
        const radioY = 5 + Math.random() * 15;
        const rotacion = Math.random() * Math.PI;

        ctx.beginPath();
        ctx.ellipse(x, y, radioX, radioY, rotacion, 0, 2 * Math.PI);
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

export function crearSalamandra() {
    const grupo = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ 
        map: generarTexturaPiel(), 
        roughness: 0.6 
    });

    const escala = 12;

    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.02 * escala, 0.05 * escala, 4, 8), mat);
    cuerpo.position.y = 0.05 * escala;
    grupo.add(cuerpo);

    // Cabeza y Ojos ocultos en 1ª persona
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.022 * escala, 8, 8), mat);
    cabeza.position.set(0, 0.1 * escala, 0.01 * escala);
    cabeza.visible = false;
    grupo.add(cabeza);

    const ojoMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1 });
    const ojoL = new THREE.Mesh(new THREE.SphereGeometry(0.006 * escala, 8, 8), ojoMat);
    const ojoR = new THREE.Mesh(new THREE.SphereGeometry(0.006 * escala, 8, 8), ojoMat);
    ojoL.position.set(0.012 * escala, 0.11 * escala, 0.022 * escala);
    ojoR.position.set(-0.012 * escala, 0.11 * escala, 0.022 * escala);
    ojoL.visible = false;
    ojoR.visible = false;
    grupo.add(ojoL, ojoR);

    const colaSegmentos = [];
    for (let i = 0; i < 5; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry((0.015 - (i * 0.002)) * escala, 6, 6), mat);
        seg.position.set(0, 0.02 * escala, (-0.015 - (i * 0.02)) * escala);
        grupo.add(seg);
        colaSegmentos.push(seg);
    }

    grupo.userData = { colaSegmentos, fase: 0, escala };
    return grupo;
}

export function actualizarAnimacion(salamandra, moviendose) {
    const data = salamandra.userData;
    data.fase += 0.12;
    const mult = data.escala;

    if (moviendose) {
        salamandra.rotation.z = Math.sin(data.fase) * 0.08;
        salamandra.position.y = Math.abs(Math.sin(data.fase)) * 0.005 * mult;
        data.colaSegmentos.forEach((seg, i) => {
            seg.position.x = Math.sin(data.fase - i * 0.6) * 0.015 * mult;
        });
    } else {
        salamandra.rotation.z *= 0.9;
        salamandra.position.y *= 0.9;
        salamandra.scale.y = 1 + Math.sin(data.fase * 0.3) * 0.005;
    }
}

