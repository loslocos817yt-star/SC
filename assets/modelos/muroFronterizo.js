import * as THREE from 'three';

export function crearMuroFronterizo(anchoTotal, wallMaterial, extensionLateral = 40) {
    const grupo = new THREE.Group();
    const anchoExtendido = anchoTotal + extensionLateral * 2;

    // Malla principal del muro de una sola capa con visibilidad doble
    const altoMuro = 4.5;
    const geoMuro = new THREE.PlaneGeometry(anchoExtendido, altoMuro);
    const meshMuro = new THREE.Mesh(geoMuro, wallMaterial);
    meshMuro.position.y = altoMuro / 2;
    grupo.add(meshMuro);

    // Postes de metal estructurados a lo largo de la barda extendida
    const posteMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
    const posteGeo = new THREE.BoxGeometry(0.2, altoMuro + 0.4, 0.2);

    const pasoPoste = 4;
    const cantidadPostes = Math.floor(anchoExtendido / pasoPoste);
    for (let i = 0; i <= cantidadPostes; i++) {
        const xPos = -anchoExtendido / 2 + (i * pasoPoste);
        const poste = new THREE.Mesh(posteGeo, posteMat);
        poste.position.set(xPos, (altoMuro + 0.4) / 2, 0);
        grupo.add(poste);
    }

    grupo.userData.anchoExtendido = anchoExtendido;
    return grupo;
}
