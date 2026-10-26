// Apply before the styles load to avoid flashing the opposite theme.
(function () {
    const key = 'dataterra-theme';
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    let preference = null;
    try { preference = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
    if (!['light', 'dark'].includes(preference)) preference = null;
    const apply = theme => {
        document.documentElement.dataset.theme = theme;
        const button = document.getElementById('themeToggle');
        if (!button) return;
        const dark = theme === 'dark';
        button.setAttribute('aria-pressed', String(dark));
        const label = DataTerraI18n.t(dark ? 'Ativar modo claro' : 'Ativar modo escuro');
        button.setAttribute('aria-label', label);
        button.title = label;
    };
    apply(preference || (system.matches ? 'dark' : 'light'));
    DataTerraI18n.onChange(() => apply(document.documentElement.dataset.theme));
    system.addEventListener('change', event => {
        if (!preference) apply(event.matches ? 'dark' : 'light');
    });
    document.addEventListener('DOMContentLoaded', () => {
        apply(document.documentElement.dataset.theme);
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            apply(preference);
            try { localStorage.setItem(key, preference); } catch { /* The toggle still works in memory. */ }
        });
    });
})();
