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
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.width = '400px'; // Initial width just for the bubble? 
    // Actually, to handle the 'pop out' and 'bubble' states nicely with an iframe,
    // usually the iframe needs to resize. 
    // For simplicity MVP: passing messages between iframe and parent to resize.
    container.style.height = '600px';
    container.style.maxHeight = '80vh';
    container.style.width = '400px';
    container.style.maxWidth = '90vw';
    container.style.pointerEvents = 'none'; // Click through transparent parts

    // We need to position it so the button allows clicking.
    // The iframe itself will be transparent.

    const iframe = document.createElement('iframe');
    // Use current origin if relative, or hardcode production URL
    const domain = new URL(script.src).origin;
    iframe.src = `${domain}/widget/${clientId}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.style.colorScheme = 'normal'; // Prevent site dark mode forcing 

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Helper to handle messages for resizing (Optional refinement)
    window.addEventListener('message', (event) => {
        // Verify origin
        if (event.origin !== domain) return;
        // Handle resize events if you implement them in ChatWidget
        // For now, we keep the container fixed size but use pointer-events
        // to allow clicking through the empty space if it's transparent.
    });
})();
