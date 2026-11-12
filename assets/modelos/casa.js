import * as THREE from 'three';

export function crearCasa(ancho, altoParedes, profundidad, wallMaterial, roofMaterial) {
    const grupo = new THREE.Group();

    // 1. Paredes de la casa
    const paredesGeo = new THREE.BoxGeometry(ancho, altoParedes, profundidad);
    const paredesMesh = new THREE.Mesh(paredesGeo, wallMaterial);
    paredesMesh.position.y = altoParedes / 2;
    grupo.add(paredesMesh);

    // 2. Tejado inclinado a dos aguas
    const shape = new THREE.Shape();
    const hA = ancho / 2;
    
    shape.moveTo(-hA - 0.2, 0);
    shape.lineTo(hA + 0.2, 0);
    shape.lineTo(0, 2.2);
    shape.closePath();

    const extrudeSettings = {
        steps: 1,
        depth: profundidad + 0.4,
        bevelEnabled: false
    };

    const roofGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    roofGeo.center();
    
    const roofMesh = new THREE.Mesh(roofGeo, roofMaterial);
    roofMesh.rotation.y = Math.PI / 2;
    roofMesh.position.y = altoParedes + 1.1;
    grupo.add(roofMesh);

    // 3. Puerta principal
    const puertaMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
    const puertaGeo = new THREE.BoxGeometry(0.8, 1.8, 0.05);
    const puerta = new THREE.Mesh(puertaGeo, puertaMat);
    puerta.position.set(0, 0.9, profundidad / 2 + 0.02);
    grupo.add(puerta);

    // 4. Ventanas
    const ventanaMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.1, metalness: 0.9 });
    const ventanaGeo = new THREE.BoxGeometry(0.7, 0.8, 0.04);

    const winIzq = new THREE.Mesh(ventanaGeo, ventanaMat);
    winIzq.position.set(-1.2, 1.2, profundidad / 2 + 0.02);
    grupo.add(winIzq);

    const winDer = new THREE.Mesh(ventanaGeo, ventanaMat);
    winDer.position.set(1.2, 1.2, profundidad / 2 + 0.02);
    grupo.add(winDer);

    return grupo;
}

