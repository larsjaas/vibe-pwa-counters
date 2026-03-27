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
    // Embed the official Lucide list‑plus icon for the add button
    addBtn.style.position = 'fixed';
    addBtn.style.top = '10px';
    addBtn.style.right = '10px';
    addBtn.style.background = 'none';
    // Add a subtle circular backdrop to emphasize the icon
    addBtn.style.width = '2rem';
    addBtn.style.height = '2rem';
    addBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    addBtn.style.borderRadius = '50%';
    addBtn.style.display = 'flex';
    addBtn.style.justifyContent = 'center';
    addBtn.style.alignItems = 'center';
    addBtn.style.border = 'none';
    addBtn.style.padding = '0';
    addBtn.style.cursor = 'pointer';
    addBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-plus-icon lucide-list-plus"><path d="M16 5H3"/><path d="M11 12H3"/><path d="M16 19H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>
        `;
    addBtn.title = 'New Counter';
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
        // Set default value for initial counter value
        initInput.value = '0';
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
        // Set default value for step
        stepInput.value = '1';
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
            const payload = {
                name,
                initial,
                step,
            };
            // Send the payload to the backend. Errors are logged; UI feedback can be added later.
            fetch('/api/counters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((r) => {
                    if (r.status !== 200) {
                        throw new Error(`Server error: ${r.status}`);
                    }
                    // Response body is empty; close modal and skip parsing.
                    document.body.removeChild(overlay);
                    return r;
                })
                .then(() => {
                    // Successful creation – refresh the counter list so the new entry appears immediately.
                    console.log('Counter created successfully');
                    loadCounters();
                })
                .catch((err) => console.error('Create fail', err));
            // No additional chaining needed; modal will close on success above.
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
    // Replace the bottom logout button with a top‑right SVG icon
    const logoutBtn = document.createElement('button');
    logoutBtn.style.position = 'fixed';
    logoutBtn.style.top = '10px';
    logoutBtn.style.right = '10px';
    logoutBtn.style.background = 'none';
    // Add a subtle circular backdrop to emphasize the icon
    logoutBtn.style.width = '2rem';
    logoutBtn.style.height = '2rem';
    logoutBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    logoutBtn.style.borderRadius = '50%';
    logoutBtn.style.display = 'flex';
    logoutBtn.style.justifyContent = 'center';
    logoutBtn.style.alignItems = 'center';
    logoutBtn.style.border = 'none';
    logoutBtn.style.padding = '0';
    logoutBtn.style.cursor = 'pointer';
    // Inline SVG for log-out icon
    // Use the proper Lucide log‑out icon
    logoutBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m16 17 5-5-5-5"/>
            <path d="M21 12H9"/>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        </svg>`;
    logoutBtn.addEventListener('click', () => {
        window.location.href = '/api/logout';
    });
    // Tooltip for logout button
    logoutBtn.setAttribute('title', 'Log Out');
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
                // Show the middle page and display a placeholder message. We use a flex
                // layout to center the text horizontally and vertically.
                middlePage.style.display = 'flex';
                middlePage.style.justifyContent = 'center';
                middlePage.style.width = '90%';
                middlePage.style.alignItems = 'center';
                middlePage.style.textAlign = 'center';
                middlePage.style.width = '90%';
                middlePage.style.margin = 'auto';
                // Center horizontally and vertically
                middlePage.style.height = '100%';
                middlePage.style.alignItems = 'center';
                middlePage.textContent =
                    'Statistics are not implemented yet, but they will arrive in a future update.';
                // Double the font size in relation to the normal size.
                middlePage.style.fontSize = '200%';
                break;
        }
    };

    /* ---- Helpers for fetching & rendering counters ---- */
    const renderCountersTable = (counters: Array<{ id: number; name: string }>): void => {
        // Clear any existing content
        leftPage.textContent = '';
        const table = document.createElement('table');
        // Set the table to always take 90% of the viewport width
        table.style.width = '90vw';
        // Add vertical space equal to two line heights; assuming 1em line-height
        table.style.marginTop = '2em';
        table.style.borderCollapse = 'collapse';
        // Increase font size to double current height – this makes rows visibly larger
        // while keeping the layout responsive.
        table.style.fontSize = '200%';

        // Load the icon once and reuse it for each row
        const squareCheckSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-check-big-icon lucide-square-check-big">
                <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"/>
                <path d="m9 11 3 3L22 4"/>
            </svg>`;
        const filePenSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-pen-line-icon lucide-file-pen-line">
                <path d="M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z"/>
                <path d="M14.487 7.858A1 1 0 0 1 14 7V2"/>
                <path d="M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516"/>
                <path d="M8 18h1"/>
            </svg>`;

        counters.forEach((c) => {
            const tr = document.createElement('tr');
            const nameTd = document.createElement('td');
            nameTd.textContent = c.name;
            nameTd.style.textAlign = 'left';
            tr.appendChild(nameTd);

            // Second column – square‑check icon
            const iconTd = document.createElement('td');
            iconTd.style.textAlign = 'right';
            iconTd.style.paddingRight = '10px';
            const iconContainer = document.createElement('div');
            iconContainer.style.display = 'inline-flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            iconContainer.style.width = '1.8rem';
            iconContainer.style.height = '1.8rem';
            iconContainer.style.borderRadius = '50%';
            iconContainer.style.background = '#e0e0e0';
            iconContainer.innerHTML = squareCheckSvg;
            iconTd.appendChild(iconContainer);
            tr.appendChild(iconTd);
            // Third column – file‑pen icon
            const fileTd = document.createElement('td');
            fileTd.style.textAlign = 'right';
            fileTd.style.paddingRight = '10px';
            const fileContainer = document.createElement('div');
            fileContainer.style.display = 'inline-flex';
            fileContainer.style.alignItems = 'center';
            fileContainer.style.justifyContent = 'center';
            fileContainer.style.width = '1.8rem';
            fileContainer.style.height = '1.8rem';
            fileContainer.style.borderRadius = '50%';
            fileContainer.style.background = '#e0e0e0';
            fileContainer.innerHTML = filePenSvg;
            fileTd.appendChild(fileContainer);
            tr.appendChild(fileTd);
            table.appendChild(tr);
        });
        leftPage.appendChild(table);
        leftPage.appendChild(addBtn);
    };

    const loadCounters = async (): Promise<void> => {
        try {
            const r = await fetch('/api/counters');
            if (r.status !== 200) {
                throw new Error(`Failed to fetch counters: ${r.status}`);
            }
            const data: Array<{ id: number; name: string }> = await r.json();
            renderCountersTable(data);
        } catch (e) {
            console.error('Error loading counters', e);
        }
    };


    // Show the initial view immediately
    switchView('left');
    // Load counters when app first loads
    loadCounters();

    /* ---- Register service worker ---- */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
};

init();
