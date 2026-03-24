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
    // Use a Lucide-style SVG check icon instead of text
    leftBtn.addEventListener('click', () => switchView('left'));
    leftBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-check-icon lucide-check-check">
            <path d="M18 6 7 17l-5-5"/>
            <path d="m22 10-7.5 7.5L13 16"/>
        </svg>`;
    selector.appendChild(leftBtn);

    // Create a vertical separator between the two buttons
    const separator = document.createElement('div');
    separator.className = 'btn-separator';
    selector.appendChild(separator);

    const rightBtn = document.createElement('button');
    // Replace the text button with a Lucide-style "settings" icon. The
    // icon size matches the left button (1.5 rem).
    rightBtn.addEventListener('click', () => switchView('right'));
    rightBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
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
