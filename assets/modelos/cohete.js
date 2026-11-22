import * as THREE from 'three';

export function crearCohete(scene, obstaculosColisiones) {
    const coheteGrupo = new THREE.Group();
    const navePivot = new THREE.Group();

    const cuerpoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.9 });
    const puntaMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.3 });
    const aletaMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 });

    // Base fija en el suelo
    const baseGeo = new THREE.CylinderGeometry(2.5, 3.0, 0.6, 16);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    coheteGrupo.add(base);

    // Cuerpo principal (eje +Y es la nariz del cohete)
    const cuerpoGeo = new THREE.CylinderGeometry(1.0, 1.2, 9.0, 16);
    const cuerpo = new THREE.Mesh(cuerpoGeo, cuerpoMat);
    cuerpo.position.y = 4.5;
    navePivot.add(cuerpo);

    // Punta cónica
    const puntaGeo = new THREE.ConeGeometry(1.0, 3.0, 16);
    const punta = new THREE.Mesh(puntaGeo, puntaMat);
    punta.position.y = 10.5;
    navePivot.add(punta);

    // Aletas (4 lados)
    const aletaGeo = new THREE.BoxGeometry(0.25, 2.5, 1.4);
    for (let i = 0; i < 4; i++) {
        const aleta = new THREE.Mesh(aletaGeo, aletaMat);
        aleta.rotation.y = (Math.PI / 2) * i;
        aleta.position.set(
            Math.cos((Math.PI / 2) * i + Math.PI / 4) * 1.0,
            1.7,
            Math.sin((Math.PI / 2) * i + Math.PI / 4) * 1.0
        );
        navePivot.add(aleta);
    }

    navePivot.position.y = 0.6;
    coheteGrupo.add(navePivot);

    const posCohete = new THREE.Vector3(-8.5, 0, -42);
    coheteGrupo.position.copy(posCohete);
    coheteGrupo.visible = true;
    scene.add(coheteGrupo);

    const colisionCohete = {
        id: 'cohete',
        x: posCohete.x,
        z: posCohete.z,
        radio: 2.5,
        activo: true
    };
    obstaculosColisiones.push(colisionCohete);

    return {
        getMesh: () => coheteGrupo,
        getNave: () => navePivot,
        posicion: posCohete,
        revelar: () => {
            coheteGrupo.visible = true;
        },
        setColisionActiva: (activa) => {
            colisionCohete.activo = activa;
        }
    };
}
