/**
 * Main entry point for the PWA. All UI logic is implemented in plain
 * TypeScript (no frameworks). When `tsc` is run during the build it will
 * emit `html/main.js`, which is included in the generated `index.html`
 * (see the module script tag added above).
 */

const init = (): void => {
    const appContainer = document.getElementById('app') as HTMLElement;
    if (!appContainer) {
        console.warn('App container not found');
        return;
    }
    // Ensure the container can position child absolute elements
    appContainer.style.position = 'relative';
    appContainer.style.height = '100%';

    /* ---- Create the two main views ---- */
    const leftPage = document.createElement('div');
    leftPage.id = 'left-page';
    leftPage.className = 'page';
    leftPage.textContent = 'Left Page';
    appContainer.appendChild(leftPage);

    const rightPage = document.createElement('div');
    rightPage.id = 'right-page';
    rightPage.className = 'page';
    rightPage.textContent = 'Right Page';
    rightPage.style.display = 'none';
    appContainer.appendChild(rightPage);

    /* ---- Page specific UI elements ---- */
    // Left page '+` button at top-right
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.style.position = 'absolute';
    addBtn.style.top = '10px';
    addBtn.style.right = '10px';
    addBtn.style.fontSize = '2rem';
    addBtn.style.border = 'none';
    addBtn.style.background = 'none';
    addBtn.style.cursor = 'pointer';
    leftPage.appendChild(addBtn);

    // Right page Log Out button (bottom‑center)
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Log Out';
    logoutBtn.style.position = 'absolute';
    logoutBtn.style.left = '50%';
    logoutBtn.style.bottom = '20px';
    logoutBtn.style.transform = 'translateX(-50%)';
    logoutBtn.style.padding = '5px 15px';
    logoutBtn.style.fontSize = '1rem';
    logoutBtn.addEventListener('click', () => {
        window.location.href = '/api/logout';
    });
    rightPage.appendChild(logoutBtn);

    /* ---- Bottom‑row view switcher ---- */
    const selector = document.createElement('div');
    selector.className = 'page-selector';
    selector.style.position = 'fixed';
    selector.style.bottom = '0';
    selector.style.left = '0';
    selector.style.width = '100%';
    selector.style.display = 'flex';
    selector.style.justifyContent = 'space-around';
    selector.style.padding = '10px 0';
    selector.style.background = '#fff';
    selector.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.1)';
    // Place selector at the end of the body
    document.body.appendChild(selector);

    const leftBtn = document.createElement('button');
    leftBtn.textContent = 'Left';
    leftBtn.addEventListener('click', () => switchView('left'));
    selector.appendChild(leftBtn);

    const rightBtn = document.createElement('button');
    rightBtn.textContent = 'Right';
    rightBtn.addEventListener('click', () => switchView('right'));
    selector.appendChild(rightBtn);

    const switchView = (view: 'left' | 'right'): void => {
        if (view === 'left') {
            leftPage.style.display = 'block';
            rightPage.style.display = 'none';
        } else {
            leftPage.style.display = 'none';
            rightPage.style.display = 'block';
        }
    };

    // Show the initial view immediately
    switchView('left');

    /* ---- Register service worker ---- */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
};

init();
