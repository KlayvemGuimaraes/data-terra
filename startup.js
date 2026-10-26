// Decorative entry animation. Its duration is independent of map/API loading.
(function () {
    const root = document.documentElement;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let release, finished = false;
    window.DataTerraIntroReady = new Promise(resolve => { release = resolve; });
    const finish = () => {
        if (finished) return;
        finished = true;
        root.classList.remove('is-entering');
        // Allow the last animation frame to paint before creating the map markers.
        window.setTimeout(release, 40);
    };
    if (!motion.matches) {
        root.classList.add('is-entering');
        window.setTimeout(finish, 1450);
    } else finish();
    document.addEventListener('pointerdown', finish, { once: true, passive: true });
    document.addEventListener('keydown', finish, { once: true });
    motion.addEventListener('change', event => { if (event.matches) finish(); });
    window.addEventListener('pageshow', event => { if (event.persisted) finish(); });
})();
