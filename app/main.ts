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
    // No default text – the view will be populated when needed
    leftPage.textContent = '';
    appContainer.appendChild(leftPage);

    const rightPage = document.createElement('div');
    rightPage.id = 'right-page';
    rightPage.className = 'page';
    // No default text – right view shows only the logout button
    rightPage.textContent = '';
    rightPage.style.display = 'none';
    appContainer.appendChild(rightPage);
    
    // --- New middle page ---
    const middlePage = document.createElement('div');
    middlePage.id = 'middle-page';
    middlePage.className = 'page';
    // No default placeholder – the view is blank until data is loaded
    middlePage.textContent = '';
    middlePage.style.display = 'none';
    appContainer.appendChild(middlePage);

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

    // ----- Modal UI -----
    const createModal = (): HTMLElement => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';

        const modal = document.createElement('div');
        modal.style.background = '#fff';
        modal.style.padding = '20px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        modal.style.maxWidth = '90%';
        modal.style.width = '320px';

        const title = document.createElement('h2');
        title.textContent = 'Create Counter';
        title.style.marginTop = '0';
        modal.appendChild(title);

        const nameLbl = document.createElement('label');
        nameLbl.textContent = 'Name:';
        nameLbl.style.display = 'block';
        nameLbl.style.marginTop = '12px';
        modal.appendChild(nameLbl);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.style.width = '100%';
        nameInput.style.boxSizing = 'border-box';
        modal.appendChild(nameInput);

        const initLbl = document.createElement('label');
        initLbl.textContent = 'Initial:';
        initLbl.style.display = 'block';
        initLbl.style.marginTop = '12px';
        modal.appendChild(initLbl);

        const initInput = document.createElement('input');
        initInput.type = 'number';
        initInput.style.width = '100%';
        initInput.style.boxSizing = 'border-box';
        modal.appendChild(initInput);

        const stepLbl = document.createElement('label');
        stepLbl.textContent = 'Step:';
        stepLbl.style.display = 'block';
        stepLbl.style.marginTop = '12px';
        modal.appendChild(stepLbl);

        const stepInput = document.createElement('input');
        stepInput.type = 'number';
        stepInput.style.width = '100%';
        stepInput.style.boxSizing = 'border-box';
        modal.appendChild(stepInput);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'flex-end';
        btnContainer.style.marginTop = '20px';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.marginRight = '10px';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        btnContainer.appendChild(cancelBtn);

        const createBtn = document.createElement('button');
        createBtn.textContent = 'Create';
        createBtn.style.background = '#0070f3';
        createBtn.style.color = '#fff';
        createBtn.style.border = 'none';
        createBtn.style.padding = '6px 12px';
        createBtn.style.borderRadius = '4px';
        createBtn.addEventListener('click', () => {
            const name = nameInput.value;
            const initial = parseInt(initInput.value) || 0;
            const step = parseInt(stepInput.value) || 1;
            console.log({ name, initial, step });
            document.body.removeChild(overlay);
        });
        btnContainer.appendChild(createBtn);

        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        return overlay;
    };

    addBtn.addEventListener('click', () => {
        // Prevent duplicate modals
        if (document.querySelector('#counter-modal')) return;
        const modal = createModal();
        modal.id = 'counter-modal';
        document.body.appendChild(modal);
    });

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

    // --- New middle button ---
    const middleBtn = document.createElement('button');
    middleBtn.addEventListener('click', () => switchView('middle'));
    middleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
            <path d="m19 9-5 5-4-4-3 3"/>
        </svg>`;
    selector.appendChild(middleBtn);

    // Add another separator for visual spacing
    const separator2 = document.createElement('div');
    separator2.className = 'btn-separator';
    selector.appendChild(separator2);

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

    const switchView = (view: 'left' | 'right' | 'middle'): void => {
        leftPage.style.display = 'none';
        rightPage.style.display = 'none';
        middlePage.style.display = 'none';
        switch (view) {
            case 'left':
                leftPage.style.display = 'block';
                break;
            case 'right':
                rightPage.style.display = 'block';
                break;
            case 'middle':
                middlePage.style.display = 'block';
                break;
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
