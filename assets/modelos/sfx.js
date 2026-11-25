export function crearSFX() {
    const musica = new Audio('assets/sfx/musica.fondo.ogg');
    musica.loop = true;
    musica.volume = 0.35;

    const caminar = new Audio('assets/sfx/caminar.ogg');
    caminar.loop = true;
    caminar.volume = 0.5;

    const caidaMuro = new Audio('assets/sfx/caida.muro.mp3');
    caidaMuro.volume = 0.85;

    const disparoBase = new Audio('assets/sfx/dispar\u00f3.mp3');
    disparoBase.preload = 'auto';
    disparoBase.volume = 0.9;

    let musicaActiva = false;
    let muroSonidoDisparado = false;

    function desbloquearMusica() {
        if (musicaActiva) return;
        musica.play().then(() => {
            musicaActiva = true;
        }).catch(() => {});
    }

    function setCaminando(activo) {
        if (activo) {
            desbloquearMusica();
            if (caminar.paused) caminar.play().catch(() => {});
        } else if (!caminar.paused) {
            caminar.pause();
            caminar.currentTime = 0;
        }
    }

    function reproducirCaidaMuro() {
        if (muroSonidoDisparado) return;
        muroSonidoDisparado = true;
        caidaMuro.currentTime = 0;
        caidaMuro.play().catch(() => {});
    }

    function reproducirDisparo() {
        desbloquearMusica();
        try {
            const shot = disparoBase.cloneNode();
            shot.volume = 0.9;
            shot.play().catch(() => {});
        } catch (_) {
            disparoBase.currentTime = 0;
            disparoBase.play().catch(() => {});
        }
    }

    function setPersiguiendo() {}

    function pausarTodo() {
        if (!musica.paused) musica.pause();
        if (!caminar.paused) caminar.pause();
    }

    function reanudarMusica() {
        if (musicaActiva && musica.paused) {
            musica.play().catch(() => {});
        }
    }

    return {
        desbloquearMusica,
        setCaminando,
        reproducirCaidaMuro,
        reproducirDisparo,
        setPersiguiendo,
        pausarTodo,
        reanudarMusica
    };
}
