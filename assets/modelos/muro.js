import * as THREE from 'three';

export function crearMuroFronterizo(anchoTotal, wallMaterial) {
    const grupo = new THREE.Group();

    // Malla principal del muro de una sola capa con visibilidad doble
    const altoMuro = 4.5;
    const geoMuro = new THREE.PlaneGeometry(anchoTotal, altoMuro);
    const meshMuro = new THREE.Mesh(geoMuro, wallMaterial);
    meshMuro.position.y = altoMuro / 2;
    grupo.add(meshMuro);

    // Postes de metal estruturados a lo largo de la barda
    const posteMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
    const posteGeo = new THREE.BoxGeometry(0.2, altoMuro + 0.4, 0.2);

    const cantidadPostes = Math.floor(anchoTotal / 4);
    for (let i = 0; i <= cantidadPostes; i++) {
        const xPos = -anchoTotal / 2 + (i * 4);
        const poste = new THREE.Mesh(posteGeo, posteMat);
        poste.position.set(xPos, (altoMuro + 0.4) / 2, 0);
        grupo.add(poste);
    }

    return grupo;
}

