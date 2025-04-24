// --- VIBE TREATS SCRIPT - CONSOLIDATED & COMPLETE (Overlay Click Fix) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("----- VIBE TREATS STARTUP ----- DOM loaded.");

    // --- SUPABASE CLIENT SETUP ---
    const SUPABASE_URL = 'https://oljmjsegopkyqnujrzyi.supabase.co'; // ✅ Make sure this is correct
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sam1qc2Vnb3BreXFudWpyenlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjY3MjIsImV4cCI6MjA2MTA0MjcyMn0.hLOLhq6UOYsLsPpM-nQf4VM1p7uXKv2SaQ8_ffVl8Y4'; // ✅ Make sure this is correct

    // --- Basic Config Check ---
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR_SUPABASE_URL") || SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")) {
        console.error("🛑 HALT! Supabase keys MISSING or DEFAULT in script.js. Fix it!");
        alert("ADMIN ALERT! Fix the Supabase keys in script.js! Nothing works without 'em!");
        const grid = document.getElementById('product-grid');
        if(grid) grid.innerHTML = '<p style="color: #FF3399; text-align: center; font-weight: bold; font-size: 1.5rem; padding: 2rem;">💀 CONFIG ERROR: Backend connection failed.</p>';
        return;
    }

    let supabase;
    try {
        // Ensure Supabase client library is loaded
        if (!window.supabase) {
            throw new Error("Supabase client library not found. Make sure it's included in your HTML.");
        }
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase client looks okay. Let's vibe.");
    } catch (error) {
        console.error("🔥 Supabase client init FAILED:", error);
        alert("Supabase connection burped. Refresh maybe? Error: " + error.message);
        const grid = document.getElementById('product-grid');
        if(grid) grid.innerHTML = '<p style="color: red; text-align: center; font-weight: bold;">🗼 Connection Error: Failed loading treats.</p>';
        return;
    }

    // --- DOM ELEMENTS CACHE ---
    console.log("Finding HTML elements...");
    const productGrid = document.getElementById('product-grid');
    const cartButton = document.getElementById('cart-button');
    const closeCartButton = document.getElementById('close-cart-button');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartCount = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const checkoutButton = document.getElementById('checkout-button'); // Button in CART SIDEBAR
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutOverlay = document.getElementById('checkout-overlay');
    const closeCheckoutButton = document.getElementById('close-checkout-button');
    const checkoutForm = document.getElementById('checkout-form');
    const customerNameInput = document.getElementById('customer_name');
    const customerAddressInput = document.getElementById('customer_address');
    const customerPhoneInput = document.getElementById('customer_phone');
    // Keep email input reference as it was in the last provided script
    const customerEmailInput = document.getElementById('customer_email');
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const submitOrderButton = document.getElementById('submit-order-button'); // Button in CHECKOUT MODAL
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingIndicator = document.getElementById('loading-indicator');
    const bodyElement = document.body;

    // Check if crucial elements were found
    // Simplified check for brevity, assume previous checks passed if they exist
     if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !checkoutModal || !checkoutOverlay || !checkoutForm || !cartItemsContainer || !cartTotalPrice || !cartCount || !checkoutButton || !submitOrderButton || !customerNameInput || !customerAddressInput || !customerPhoneInput || !customerEmailInput) {
         console.error("🛑 Critical HTML elements missing! Check IDs (including email input).");
         alert("Woops! Some essential parts of the page are missing. Can't run properly.");
         if (bodyElement) bodyElement.innerHTML = '<h1 style="color: red; text-align: center; padding: 50px;">CRITICAL LAYOUT ERROR: Page elements missing.</h1>';
         return;
     }
    console.log("✅ HTML elements found.");

    // --- STATE MANAGEMENT ---
    let cart = [];
    let products = [];
    let isCartOpen = false;
    let isCheckoutOpen = false;
    let isSubmitting = false;

    // --- UTILITY FUNCTIONS ---
    const formatCurrency = (amount) => {
        const numericAmount = typeof amount === 'number' ? amount : 0;
        return `LE ${numericAmount.toFixed(2)}`;
    };

    const temporaryClass = (element, className, duration = 500) => {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    };

    const showNotification = (message, type = 'info', duration = 3000) => {
        const existingNotification = document.getElementById('site-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.id = 'site-notification';
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        notification.offsetHeight; // Trigger reflow
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove(), { once: true });
        }, duration);
        console.log(`Notification [${type}]: ${message}`);
    };

    // --- CORE FUNCTIONS ---
    const updateCartUI = () => {
        if (!cartItemsContainer || !cartTotalPrice || !cartCount || !checkoutButton) return;
        // console.log("Updating Cart UI. Cart:", JSON.stringify(cart)); // Debug

        cartItemsContainer.innerHTML = '';
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-empty-message fade-in">Your stash is empty. Add some vibes!</p>';
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (!product || typeof product.price !== 'number' || !product.name || !product.image_url) {
                    console.warn(`Cart render: Invalid data for ID: ${item.id}`, product);
                    const errorElement = document.createElement('div');
                    errorElement.classList.add('cart-item', 'error-message');
                    errorElement.innerHTML = `<p>Error loading item (ID: ${item.id || 'Unknown'})</p>`;
                    cartItemsContainer.appendChild(errorElement);
                    return;
                }
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item', 'animate-item-enter');
                itemElement.dataset.itemId = item.id;
                itemElement.innerHTML = `
                     <img src="${product.image_url}" alt="${product.name}" class="cart-item-img" onerror="this.onerror=null; this.src='fallback-cookie.png'; this.alt='Image failed';">
                    <div class="cart-item-info">
                         <h4>${product.name}</h4>
                         <p>${formatCurrency(product.price)} x ${item.quantity}</p>
                     </div>
                     <div class="cart-item-actions">
                        <button class="decrease-quantity action-button" data-id="${item.id}" aria-label="Decrease quantity">-</button>
                         <span class="item-quantity">${item.quantity}</span>
                        <button class="increase-quantity action-button" data-id="${item.id}" aria-label="Increase quantity">+</button>
                         <button class="remove-item action-button danger" data-id="${item.id}" aria-label="Remove item">×</button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
                total += product.price * item.quantity;
                itemCount += item.quantity;
                setTimeout(() => itemElement.classList.remove('animate-item-enter'), 300);
            });
        }
        cartTotalPrice.textContent = formatCurrency(total);
        cartCount.textContent = itemCount;
        cartButton.classList.toggle('has-items', itemCount > 0);
        try { localStorage.setItem('vibeTreatsCart', JSON.stringify(cart)); }
        catch (e) { console.error("Failed to save cart:", e); showNotification("Could not save cart.", "error"); }
        checkoutButton.disabled = cart.length === 0;
        checkoutButton.textContent = cart.length === 0 ? 'Cart is Empty' : 'Checkout Time!';
        // console.log(`Cart UI updated: ${itemCount} items, Total: ${formatCurrency(total)}`); // Debug
    };

    // --- Cart Actions ---
    const addToCart = (productId, buttonElement) => {
        // console.log(`Adding product ID: ${productId}`); // Debug
        const product = products.find(p => p.id === productId);
        if (!product) { console.error(`addToCart Error: ID ${productId} not found.`); showNotification("Error: Treat not found.", 'error'); return; }
        // console.log(`Product found: ${product.name}`); // Debug
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) { existingItem.quantity++; showNotification(`+1 ${product.name}!`, 'info', 1500); }
        else { cart.push({ id: productId, quantity: 1 }); showNotification(`Added ${product.name}!`, 'success', 2000); }
        if(buttonElement) temporaryClass(buttonElement, 'button-adding', 400);
        temporaryClass(cartCount, 'pulse-quick', 500);
        if (cartButton) temporaryClass(cartButton, 'shake-subtle', 500);
        updateCartUI();
        if (!isCartOpen) openCart();
    };

    const removeFromCart = (productId) => {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex === -1) { console.warn(`removeFromCart: ID ${productId} not found.`); return; }
        const productName = products.find(p => p.id === productId)?.name || 'Item';
        const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"]`);
        cart = cart.filter(item => item.id !== productId);
        console.log(`Removed ID: ${productId}`);
        showNotification(`Removed ${productName}.`, 'info');
        if (itemElement) { itemElement.classList.add('animate-item-exit'); itemElement.addEventListener('animationend', updateCartUI, { once: true }); }
        else { updateCartUI(); }
    };

    const increaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++; updateCartUI();
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"]`);
            if(itemElement) temporaryClass(itemElement, 'pulse-quick', 300);
        } else { console.warn(`increaseQuantity: ID ${productId} not found.`); }
    };

    const decreaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) { removeFromCart(productId); }
            else {
                updateCartUI();
                const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"]`);
                if(itemElement) temporaryClass(itemElement, 'pulse-quick', 300);
            }
        } else { console.warn(`decreaseQuantity: ID ${productId} not found.`); }
    };

    // --- Sidebar/Modal Toggles ---
    const openCart = () => {
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        console.log("Opening cart.");
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'cart-open');
        isCartOpen = true;
        if (isCheckoutOpen) closeCheckout();
    };

    const closeCart = () => {
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        console.log("Closing cart.");
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'cart-open');
        isCartOpen = false;
    };

    const openCheckout = () => {
        console.log("Attempting to open checkout. Cart length:", cart.length);
        if (cart.length === 0) { showNotification("Add treats first!", "warn"); console.warn("Checkout blocked: empty cart."); return; }
        if (!checkoutModal || !checkoutOverlay || !bodyElement || !checkoutSummary || !checkoutTotalPrice || !checkoutForm) { console.error("Cannot open checkout - elements missing."); showNotification("Checkout error.", "error"); return; }
        console.log("Opening checkout modal.");
        let summaryHTML = '<h4>Order Summary:</h4><ul>';
        let total = 0;
        cart.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product && typeof product.price === 'number') {
                summaryHTML += `<li class="item">${item.quantity} x ${product.name} (${formatCurrency(product.price)} each)</li>`;
                total += product.price * item.quantity;
            } else { summaryHTML += `<li class="error-message">Error processing item ID: ${item.id}</li>`; console.warn(`Checkout Summary: Missing data for ID ${item.id}`); }
        });
        summaryHTML += '</ul>';
        checkoutSummary.innerHTML = summaryHTML;
        checkoutTotalPrice.textContent = formatCurrency(total);
        checkoutForm.reset();
        if(checkoutMessage) checkoutMessage.textContent = '';
        if(checkoutMessage) checkoutMessage.className = 'checkout-message';
        if(submitOrderButton) submitOrderButton.disabled = false;
        if(submitOrderButton) submitOrderButton.textContent = 'SEND IT! (Commit Now) 💸';
        isSubmitting = false;
        checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'checkout-open');
        isCheckoutOpen = true;
        if (isCartOpen) closeCart();
        console.log("Checkout modal should be visible.");
    };

    const closeCheckout = () => {
        if (!checkoutModal || !checkoutOverlay || !bodyElement) return;
        console.log("Closing checkout modal.");
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'checkout-open');
        isCheckoutOpen = false;
        if (submitOrderButton) submitOrderButton.disabled = false;
        if (submitOrderButton) submitOrderButton.textContent = 'SEND IT! (Commit Now) 💸';
        isSubmitting = false;
    };

    // --- Render Products ---
    const renderProducts = () => {
        if (!productGrid) { console.error("renderProducts: productGrid missing!"); return; }
        // console.log(`Rendering ${products.length} products.`); // Debug
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        productGrid.innerHTML = '';
        if (products.length === 0) { if (!productGrid.querySelector('.error-message')) { productGrid.innerHTML = '<p class="empty-message fade-in">Shelf empty. Check back later?</p>'; } return; }
        products.forEach((product, index) => {
            if (!product || typeof product.id !== 'string' || !product.name || typeof product.price !== 'number' || !product.image_url) { console.warn("Skipping render due to invalid data:", product); const errorCard = document.createElement('article'); errorCard.classList.add('product-card', 'error-card'); errorCard.innerHTML = `<div class="product-details"><h3 class="product-name">Load Error</h3><p>Details missing.</p></div>`; productGrid.appendChild(errorCard); return; }
            const card = document.createElement('article');
            card.classList.add('product-card', 'animate-card-enter');
            card.style.setProperty('--animation-delay', `${index * 0.05}s`);
            const priceFormatted = formatCurrency(product.price);
            card.innerHTML = `
                <div class="product-image-container"><img src="${product.image_url}" alt="${product.name}" class="product-main-image" loading="lazy" onerror="this.onerror=null; this.src='fallback-cookie.png'; this.alt='Image failed: ${product.name}';"></div>
                 <div class="product-details"><h3 class="product-name">${product.name}</h3><p class="product-description">${product.description || 'Pure delicious vibes.'}</p><p class="product-price">${priceFormatted}</p><button class="cta-button add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to cart">Add To Stash ✨</button></div>`;
            productGrid.appendChild(card);
            setTimeout(() => card.classList.remove('animate-card-enter'), 600 + (index * 50));
        });
        // console.log("Product render complete."); // Debug
    };

    // --- Fetch Products ---
    const fetchProducts = async () => {
        if (!productGrid || !supabase) { console.error("Cannot fetch: grid or supabase missing."); if(productGrid) productGrid.innerHTML = '<p class="error-message">Connection error.</p>'; return; }
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        productGrid.innerHTML = '';
        console.log("🚀 Fetching Products...");
        try {
            let { data, error, status } = await supabase.from('products').select('id, name, description, price, image_url, created_at').order('created_at', { ascending: true });
            if (error) { console.error(`🔥 Supabase fetch error! Status: ${status}`, error); throw new Error(`Database Error (${status}): ${error.message}`); }
            if (data) { console.log(`✅ Fetch SUCCESS! Found ${data.length} products.`); products = data; }
            else { console.warn("🤔 Fetch OK, but no data received."); products = []; }
        } catch (error) {
            console.error('🔥 PRODUCT FETCH FAILED:', error); products = [];
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            productGrid.innerHTML = `<p class="error-message">Could not load treats! 😴<br><small>Error: ${error.message}</small></p>`;
        } finally {
            renderProducts();
            updateCartUI(); // Update cart AFTER products are loaded/confirmed empty
            console.log("Product fetch sequence complete.");
        }
    };

    // --- Validation ---
    const validateCheckoutForm = () => {
        if (!checkoutForm || !customerNameInput || !customerEmailInput || !customerAddressInput || !customerPhoneInput) { console.error("Validation skipped: elements missing."); showNotification("Checkout form error.", "error"); return false; }
        let isValid = true; let firstInvalidField = null; console.log("Validating checkout...");
        checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        if (customerNameInput.value.trim().length < 2) { isValid = false; temporaryClass(customerNameInput, 'input-error', 3000); if (!firstInvalidField) firstInvalidField = customerNameInput; console.warn("Validation Fail: Name."); }
        if (!customerEmailInput.checkValidity() || customerEmailInput.value.trim() === '') { isValid = false; temporaryClass(customerEmailInput, 'input-error', 3000); if (!firstInvalidField) firstInvalidField = customerEmailInput; console.warn("Validation Fail: Email."); }
        if (customerAddressInput.value.trim().length < 10) { isValid = false; temporaryClass(customerAddressInput, 'input-error', 3000); if (!firstInvalidField) firstInvalidField = customerAddressInput; console.warn("Validation Fail: Address."); }
        if (!customerPhoneInput.checkValidity() || customerPhoneInput.value.trim() === '') { isValid = false; temporaryClass(customerPhoneInput, 'input-error', 3000); if (!firstInvalidField) firstInvalidField = customerPhoneInput; console.warn("Validation Fail: Phone."); }
        if (!isValid) { console.error("Validation failed."); showNotification("Check highlighted fields!", 'warn'); if (firstInvalidField) { firstInvalidField.focus(); if (checkoutModal) temporaryClass(checkoutModal, 'shake-error', 400); else if(bodyElement) temporaryClass(bodyElement, 'shake-error', 400); } }
        else { console.log("✅ Validation passed."); }
        return isValid;
    };

    // --- Checkout Handler ---
    const handleCheckout = async (event) => {
        event.preventDefault(); console.log("handleCheckout initiated.");
        if (!supabase) { console.error("No Supabase client."); showNotification("Connection error.", "error"); return; }
        if (isSubmitting) { console.warn("Already submitting."); showNotification("Processing...", "info"); return; }
        if (cart.length === 0) { console.error("Empty cart checkout attempt."); showNotification("Cart empty!", "warn"); closeCheckout(); return; }
        if (!validateCheckoutForm()) { console.error("Validation failed."); return; }

        isSubmitting = true;
        if(submitOrderButton) submitOrderButton.disabled = true;
        if(submitOrderButton) submitOrderButton.textContent = 'Sending Order... 🛸';
        if(checkoutMessage) checkoutMessage.textContent = ''; if(checkoutMessage) checkoutMessage.className = 'checkout-message';

        const formData = new FormData(checkoutForm);
        const customerData = {
            customer_name: formData.get('customer_name')?.trim() || 'N/A',
            customer_email: formData.get('customer_email')?.trim().toLowerCase() || 'N/A',
            customer_address: formData.get('customer_address')?.trim() || 'N/A',
            customer_phone: formData.get('customer_phone')?.trim() || null
        };
        const orderItems = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            return { product_id: item.id, quantity: item.quantity, name_at_purchase: product ? product.name : 'Unknown', price_at_purchase: (product && typeof product.price === 'number') ? product.price : 0 };
        });
        const calculatedTotalPrice = orderItems.reduce((sum, item) => { const price = typeof item.price_at_purchase === 'number' ? item.price_at_purchase : 0; const quantity = typeof item.quantity === 'number' ? item.quantity : 0; return sum + (price * quantity); }, 0);
        const orderPayload = { ...customerData, items: orderItems, total_price: calculatedTotalPrice, order_status: 'Pending' };
        console.log("Sending order payload:", orderPayload);

        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const { data, error } = await supabase.from('orders').insert([orderPayload]).select();
            if (error) { console.error('🔥 Supabase Insert Error:', error); throw new Error(`Database error: ${error.message}`); }
            console.log('✅ ORDER SUCCESS!', data);
            if (checkoutMessage) { checkoutMessage.textContent = '🎉 Order Placed! We\'ll be in touch.'; checkoutMessage.className = 'checkout-message success animate-fade-in'; }
            if (submitOrderButton) temporaryClass(submitOrderButton, 'button-success', 1500);
            cart = []; localStorage.removeItem('vibeTreatsCart'); updateCartUI();
            setTimeout(closeCheckout, 4000);
        } catch (error) {
            console.error('🔥 ORDER SUBMISSION FAILED:', error);
            if (checkoutMessage) { checkoutMessage.textContent = `😥 Oops! ${error.message}. Try again?`; checkoutMessage.className = 'checkout-message error animate-fade-in'; }
            if (bodyElement) temporaryClass(bodyElement, 'shake-error', 400);
            if(submitOrderButton) submitOrderButton.disabled = false;
            if(submitOrderButton) submitOrderButton.textContent = 'Try Sending Again?';
            isSubmitting = false;
        }
    };

    // --- EVENT LISTENERS SETUP ---
    const setupEventListeners = () => {
        if (!cartButton || !closeCartButton || !cartOverlay || !checkoutButton || !closeCheckoutButton || !checkoutOverlay || !checkoutForm || !cartItemsContainer || !productGrid) { console.error("Cannot setup listeners - elements missing!"); showNotification("Page setup error.", "error"); return; }
        console.log("Attaching event listeners...");

        // Cart Toggles
        cartButton.addEventListener('click', openCart);
        closeCartButton.addEventListener('click', closeCart);
        cartOverlay.addEventListener('click', closeCart);

        // Checkout Toggles & Form
        checkoutButton.addEventListener('click', openCheckout); // Button in cart sidebar
        closeCheckoutButton.addEventListener('click', closeCheckout);
        checkoutForm.addEventListener('submit', handleCheckout);

        // ***** THE FIX: Overlay Click Listener *****
        checkoutOverlay.addEventListener('click', (event) => {
            // Check if the direct click target *IS* the overlay itself
            if (event.target === checkoutOverlay) {
                console.log("Clicked on overlay background, closing checkout.");
                closeCheckout();
            } else {
                 console.log("Clicked inside modal content (or on modal itself), NOT closing.");
                // Do nothing, the click was inside the modal area
            }
        });
        // ******************************************

        // Cart Item Actions (Delegation)
        cartItemsContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.action-button');
            if (!targetButton) return;
            const productId = targetButton.dataset.id;
            if (!productId) { console.warn("Cart action button missing 'data-id'."); return; }
            // console.log(`Cart action: ${targetButton.className}, ID=${productId}`); // Debug
            temporaryClass(targetButton, 'button-clicked', 200);
            if (targetButton.classList.contains('increase-quantity')) increaseQuantity(productId);
            else if (targetButton.classList.contains('decrease-quantity')) decreaseQuantity(productId);
            else if (targetButton.classList.contains('remove-item')) removeFromCart(productId);
        });

        // Add to Cart Buttons (Delegation)
        productGrid.addEventListener('click', (event) => {
            const button = event.target.closest('.add-to-cart-btn');
            if (button) {
                event.preventDefault();
                const productId = button.dataset.id;
                // console.log(`Add to cart click, ID: ${productId}`); // Debug
                if (productId) addToCart(productId, button);
                else { console.warn("'Add To Stash' button missing 'data-id'!"); showNotification("Error identifying treat.", "error"); }
            }
        });

        console.log("✅ Event listeners setup complete.");
    };

    // --- PAGE INITIALIZATION ---
    const initializePage = () => {
        console.log("----- Initializing Vibe Treats Page -----");
        try {
            const storedCart = localStorage.getItem('vibeTreatsCart');
            if (storedCart) {
                try {
                    cart = JSON.parse(storedCart);
                    if (!Array.isArray(cart) || cart.some(item => typeof item.id === 'undefined' || typeof item.quantity === 'undefined')) { console.warn("Invalid cart data. Resetting."); cart = []; localStorage.removeItem('vibeTreatsCart'); }
                    else { console.log("Loaded cart:", cart); }
                } catch (e) { console.error("Failed to parse cart. Resetting.", e); cart = []; localStorage.removeItem('vibeTreatsCart'); }
            }
            if (yearSpan) yearSpan.textContent = new Date().getFullYear();
            else console.warn("Footer year span #year not found.");
            setupEventListeners();
            fetchProducts();
            console.log("----- Page Initialized -----");
        } catch (error) {
            console.error("☠️ FATAL INIT ERROR:", error);
            alert("Critical error loading page. Please refresh.");
            if(bodyElement) bodyElement.innerHTML = `<h1 style="color:#FF3399;text-align:center;padding:50px;">CRITICAL LOAD ERROR</h1><p style="text-align:center;">Refresh please.</p><p style="text-align:center;color:grey;"><small>${error.message}</small></p>`;
        }
    };

    // --- Engage! ---
    initializePage();

}); // === END OF DOMCONTENTLOADED ===
