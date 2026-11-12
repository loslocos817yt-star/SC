import * as THREE from 'three';

export function crearEdificio(ancho, alto, profundidad, brickMaterial) {
    const grupo = new THREE.Group();

    const geo = new THREE.BoxGeometry(ancho, alto, profundidad);
    const mesh = new THREE.Mesh(geo, brickMaterial);
    mesh.position.y = alto / 2;
    grupo.add(mesh);

    const ventanaMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.1, metalness: 0.9 });
    const ventanaGeo = new THREE.BoxGeometry(0.5, 0.7, 0.04);

    const pisos = Math.floor(alto / 1.8);
    const columnasX = Math.floor(ancho / 1.5);
    const columnasZ = Math.floor(profundidad / 1.5);

    // Ventanas Frontales y Traseras
    for (let p = 1; p < pisos; p++) {
        const yPos = p * 1.8 - alto/2 + 0.9;
        for (let c = 0; c < columnasX; c++) {
            const xPos = (c - (columnasX - 1) / 2) * 1.2;

            const winF = new THREE.Mesh(ventanaGeo, ventanaMat);
            winF.position.set(xPos, yPos, profundidad / 2 + 0.02);
            grupo.add(winF);

            const winB = new THREE.Mesh(ventanaGeo, ventanaMat);
            winB.position.set(xPos, yPos, -profundidad / 2 - 0.02);
            winB.rotation.y = Math.PI;
            grupo.add(winB);
        }
    }

    // Ventanas Laterales
    for (let p = 1; p < pisos; p++) {
        const yPos = p * 1.8 - alto/2 + 0.9;
        for (let c = 0; c < columnasZ; c++) {
            const zPos = (c - (columnasZ - 1) / 2) * 1.2;

            const winL = new THREE.Mesh(ventanaGeo, ventanaMat);
            winL.position.set(-ancho / 2 - 0.02, yPos, zPos);
            winL.rotation.y = -Math.PI / 2;
            grupo.add(winL);

            const winR = new THREE.Mesh(ventanaGeo, ventanaMat);
            winR.position.set(ancho / 2 + 0.02, yPos, zPos);
            winR.rotation.y = Math.PI / 2;
            grupo.add(winR);
        }
    }

    return grupo;
}

