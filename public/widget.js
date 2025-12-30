(function () {
    const script = document.currentScript;
    const scriptUrl = new URL(script.src);
    const clientId = scriptUrl.searchParams.get('id');

    if (!clientId) {
        console.error('ChatWidget: No client ID provided.');
        return;
    }

    // Create Iframe Container
    const container = document.createElement('div');
    container.id = 'chat-widget-container';
    container.style.position = 'fixed';
    container.style.zIndex = '999999';
    // Initial State: Bottom Right, small size for launcher
    container.style.bottom = '0px';
    container.style.right = '0px';
    container.style.width = '120px'; // Sufficient for launcher + margin
    container.style.height = '120px';
    container.style.pointerEvents = 'none'; // Allow clicks to pass through container itself

    const iframe = document.createElement('iframe');
    const domain = new URL(script.src).origin;
    iframe.src = `${domain}/widget/${clientId}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.backgroundColor = 'transparent'; // Ensure transparent
    iframe.allow = 'clipboard-read; clipboard-write; autoplay';
    iframe.style.pointerEvents = 'auto'; // Capture clicks inside the iframe

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Handle resizing messages from React App
    window.addEventListener('message', (event) => {
        // Security check: ensure message is from our domain
        if (event.origin !== domain) return;

        const { type, isOpen, config } = event.data;

        if (type === 'TRM_CHAT_RESIZE') {
            if (isOpen) {
                // Widget is open: Expansion
                // Calculate required size based on config + margins
                // width_px + right_px + some buffer
                const w = (config.width || 350) + (config.right || 20) + 40;
                const h = (config.height || 500) + (config.bottom || 20) + 120; // +120 for launcher space below window

                container.style.width = `${w}px`;
                container.style.height = `${h}px`;
                container.style.maxHeight = '100vh';
                container.style.maxWidth = '100vw';
            } else {
                // Widget is closed: Launcher only
                // launcherSize + margins
                const size = (config.launcherSize || 60) + Math.max(config.bottom || 20, config.right || 20) + 40;
                container.style.width = `${size}px`;
                container.style.height = `${size}px`;
            }
        }
    });
})();
