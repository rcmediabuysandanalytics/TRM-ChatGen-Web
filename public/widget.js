(function () {
    const script = document.currentScript;
    const scriptUrl = new URL(script.src);
    const clientId = scriptUrl.searchParams.get('id');

    if (!clientId) {
        console.error('ChatWidget: No client ID provided.');
        return;
    }

    // Helper to detect device type
    const getDeviceType = () => {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'laptop';
        return 'desktop';
    };

    // Create Iframe Container
    const container = document.createElement('div');
    container.id = 'chat-widget-container';
    container.style.position = 'fixed';
    container.style.zIndex = '999999';
    // Initial State: Bottom Right, small size for launcher
    container.style.bottom = '0px';
    container.style.right = '0px';
    container.style.width = '120px';
    container.style.height = '120px';
    container.style.pointerEvents = 'none';
    container.style.transition = 'width 0.3s ease, height 0.3s ease, background-color 0.3s ease';

    const iframe = document.createElement('iframe');
    const domain = new URL(script.src).origin;

    // Pass initial device type
    const initialDevice = getDeviceType();
    iframe.src = `${domain}/widget/${clientId}?device=${initialDevice}`;

    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.backgroundColor = 'transparent';
    iframe.allow = 'clipboard-read; clipboard-write; autoplay';
    iframe.style.pointerEvents = 'auto';

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Handle Window Resize to notify widget
    let timeout;
    window.addEventListener('resize', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const device = getDeviceType();
            iframe.contentWindow.postMessage({ type: 'TRM_HOST_RESIZE', device }, '*');
        }, 200);
    });

    // Store last non-modal configuration to restore after modal closes
    let lastConfig = {
        width: 350,
        height: 500,
        launcherSize: 60,
        bottom: 0,
        right: 0,
        isOpen: false
    };

    // When true, we are waiting for the iframe to finish fading out before resizing
    let waitingForCloseFade = false;

    // Timer fallback in case iframe never responds
    let closeFadeTimer = null;

    // Restore container size based on lastConfig
    function restoreFromLastConfig() {
        container.style.pointerEvents = 'none';
        container.style.top = 'auto';
        container.style.left = 'auto';
        container.style.bottom = '0px';
        container.style.right = '0px';

        if (lastConfig.isOpen) {
            const w = (lastConfig.width || 350) + (lastConfig.right || 20) + 40;
            const h = (lastConfig.height || 500) + (lastConfig.bottom || 20) + 120;
            container.style.width = `${w}px`;
            container.style.height = `${h}px`;
            container.style.maxHeight = '100vh';
            container.style.maxWidth = '100vw';
        } else {
            const size = (lastConfig.launcherSize || 60) + Math.max(lastConfig.bottom || 20, lastConfig.right || 20) + 40;
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;
            container.style.maxHeight = '100vh';
            container.style.maxWidth = '100vw';
        }
    }


    // Tracks whether the widget is in modal mode (open or closing)
    let isModal = false;

    // Used to cancel transition restore timers
    let restoreTransitionTimer = null;


    // Handle messages from React App
    window.addEventListener('message', (event) => {
        if (event.origin !== domain) return;

        const { type, isOpen, config } = event.data;

        if (type === 'TRM_CHAT_RESIZE') {

            // If we're waiting for fade-out to finish, ignore resizes to prevent flashes
            if (waitingForCloseFade) return;


            // ⛔ Ignore resize events while modal is open/closing
            if (isModal) return;

            // Update last known config
            lastConfig = {
                ...config,
                isOpen
            };

            if (isOpen) {
                // Widget is open
                const w = (config.width || 350) + (config.right || 20) + 40;
                const h = (config.height || 500) + (config.bottom || 20) + 120;

                if (container.style.width !== '100vw') {
                    container.style.width = `${w}px`;
                    container.style.height = `${h}px`;
                    container.style.maxHeight = '100vh';
                    container.style.maxWidth = '100vw';
                    container.style.top = 'auto';
                    container.style.left = 'auto';
                    container.style.bottom = '0px';
                    container.style.right = '0px';
                }
            } else {
                // Widget is closed
                const size = (config.launcherSize || 60) + Math.max(config.bottom || 20, config.right || 20) + 40;
                container.style.width = `${size}px`;
                container.style.height = `${size}px`;
                container.style.top = 'auto';
                container.style.left = 'auto';
                container.style.bottom = '0px';
                container.style.right = '0px';
            }
        }

        if (type === 'TRM_CHAT_MODAL_OPEN') {
            isModal = true;

            if (restoreTransitionTimer) {
                clearTimeout(restoreTransitionTimer);
            }

            // Disable transition for instant snap
            container.style.transition = 'none';

            // Force a browser reflow (Layout Thrashing) to ensure the 'transition: none' 
            // is fully applied before we change the width/height. 
            // Without this, the browser might batch the style changes and still animate.
            void container.offsetWidth;

            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.top = '0';
            container.style.left = '0';
            container.style.right = 'auto';
            container.style.bottom = 'auto';
            container.style.maxHeight = 'none';
            container.style.maxWidth = 'none';
            container.style.pointerEvents = 'auto';
        }

        if (type === 'TRM_CHAT_MODAL_CLOSE') {
            // ✅ Step 1: DON'T resize yet.
            // Ask iframe to fade out its UI first.
            waitingForCloseFade = true;

            // Cancel any previous fallback timer
            if (closeFadeTimer) clearTimeout(closeFadeTimer);

            // Tell iframe: start fade-out now
            iframe.contentWindow.postMessage({ type: 'TRM_HOST_FADE_OUT_REQUEST' }, '*');

            // Fallback: if iframe never replies, restore after 700ms anyway
            closeFadeTimer = setTimeout(() => {
                waitingForCloseFade = false;

                container.style.transition = 'none';
                void container.offsetWidth;

                restoreFromLastConfig();

                requestAnimationFrame(() => {
                    container.style.transition = 'width 0.3s ease, height 0.3s ease, background-color 0.3s ease';
                });
            }, 700);
        }

        if (type === 'TRM_IFRAME_FADE_OUT_DONE') {
            if (!waitingForCloseFade) return;

            // Stop fallback timer
            if (closeFadeTimer) {
                clearTimeout(closeFadeTimer);
                closeFadeTimer = null;
            }

            waitingForCloseFade = false;

            // ✅ Step 2: Now it's safe to resize (panel is already invisible)
            container.style.transition = 'none';
            void container.offsetWidth;

            restoreFromLastConfig();

            requestAnimationFrame(() => {
                container.style.transition = 'width 0.3s ease, height 0.3s ease, background-color 0.3s ease';
            });
        }


    });
})();
