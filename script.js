// --- VIBE TREATS SCRIPT - CONSOLIDATED & COMPLETE (with Leaflet Location Pinning) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("----- VIBE TREATS STARTUP (v_LocationPin) ----- DOM loaded.");

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

     // --- Leaflet Check ---
     if (typeof L === 'undefined') {
        console.error("🛑 Leaflet library (L) not found. Make sure Leaflet CSS and JS are linked correctly in your HTML.");
        alert("Map feature cannot load. Please check the setup or contact support.");
        // Optionally disable checkout or map-related features
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Map library failed to load.</p>';
        // Consider returning here if map is absolutely critical
    } else {
        console.log("✅ Leaflet library (L) found.");
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
    const checkoutButton = document.getElementById('checkout-button');
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutOverlay = document.getElementById('checkout-overlay');
    const closeCheckoutButton = document.getElementById('close-checkout-button');
    const checkoutForm = document.getElementById('checkout-form');
    const customerNameInput = document.getElementById('customer_name');
    // Address Textarea REMOVED - No longer caching customerAddressInput
    const customerPhoneInput = document.getElementById('customer_phone');
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const submitOrderButton = document.getElementById('submit-order-button');
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingIndicator = document.getElementById('loading-indicator');
    const bodyElement = document.body;
    const paymentMethodSelection = document.querySelector('.payment-method-selection');
    const paymentTotalReminders = document.querySelectorAll('.payment-total-reminder');
    // NEW: Map related elements
    const mapContainer = document.getElementById('map-container');
    const locationStatus = document.getElementById('location-status');
    const customerLatitudeInput = document.getElementById('customer_latitude');
    const customerLongitudeInput = document.getElementById('customer_longitude');


    // Check if crucial elements were found
    if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !cartCount || !cartItemsContainer || !cartTotalPrice ||
        !checkoutButton || !checkoutModal || !checkoutOverlay || !closeCheckoutButton || !checkoutForm || !submitOrderButton ||
        !customerNameInput || /*customerAddressInput REMOVED*/ !customerPhoneInput || !checkoutSummary || !checkoutTotalPrice || !paymentMethodSelection || paymentTotalReminders.length === 0 ||
        !mapContainer || !locationStatus || !customerLatitudeInput || !customerLongitudeInput) { // Added map elements check
        console.error("🛑 Critical HTML elements missing! Check IDs/Classes in your HTML file against the script (including new map elements).");
        alert("Woops! Some essential parts of the page (like product grid, cart, checkout form, map area, payment details) are missing in the HTML. Can't run properly.");
        if (bodyElement) bodyElement.innerHTML = '<h1 style="color: red; text-align: center; padding: 50px;">CRITICAL LAYOUT ERROR: Page elements missing.</h1>';
        return; // Stop if layout is fundamentally broken
    }
    console.log("✅ HTML elements found (including map elements).");

    // --- STATE MANAGEMENT ---
    let cart = [];
    let products = [];
    let isCartOpen = false;
    let isCheckoutOpen = false;
    let isSubmitting = false;
    let mapInstance = null; // Holds the Leaflet map object
    let markerInstance = null; // Holds the Leaflet marker object

    // --- APPROXIMATE DELIVERY ZONE BOUNDARIES (New Cairo & Nasr City combined - ADJUST THESE!) ---
    // These are ROUGH estimates. You'll need more precise polygons for accuracy.
    // Using a bounding box covering a large area including both for simplicity.
const DELIVERY_ZONE = {
    minLat: 29.900000,
    maxLat: 30.080000,
    minLng: 31.250000,
    maxLng: 31.520000
};

    console.log("Delivery Zone (Approx BBox):", DELIVERY_ZONE);

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
        if (!cartItemsContainer || !cartTotalPrice || !cartCount || !checkoutButton) {
            console.error("Cannot update Cart UI - required elements missing.");
            return;
        }
        console.log("Updating Cart UI. Current cart:", JSON.stringify(cart));

        cartItemsContainer.innerHTML = '';
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-empty-message fade-in">Your stash is empty. Add some vibes!</p>';
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (!product || typeof product.price !== 'number' || !product.name || !product.image_url) {
                    console.warn(`Cart render: Data missing or invalid for ID: ${item.id}. Skipping item.`);
                    const errorElement = document.createElement('div');
                    errorElement.classList.add('cart-item', 'error-message');
                    errorElement.innerHTML = `<p>Error loading item details (ID: ${item.id || 'Unknown'})</p>`;
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

        try {
             localStorage.setItem('vibeTreatsCart', JSON.stringify(cart));
        } catch (e) {
            console.error("Failed to save cart to localStorage:", e);
             showNotification("Could not save cart changes.", "error");
        }

        checkoutButton.disabled = cart.length === 0;
        checkoutButton.textContent = cart.length === 0 ? 'Cart is Empty' : 'Checkout Time!';
        console.log(`Cart UI updated: ${itemCount} items, Total: ${formatCurrency(total)}`);
    };

    // --- Cart Actions ---

    const addToCart = (productId, buttonElement) => {
        const product = products.find(p => p.id === productId);
        if (!product) {
             console.error(`addToCart Error: Product with ID ${productId} not found.`);
             showNotification("Error: Couldn't find that specific treat.", 'error');
            return;
        }
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
             showNotification(`+1 ${product.name}! Good choice.`, 'info');
        } else {
            cart.push({ id: productId, quantity: 1 });
            showNotification(`Added ${product.name} to your stash!`, 'success');
        }
        if(buttonElement) temporaryClass(buttonElement, 'button-adding', 400);
        temporaryClass(cartCount, 'pulse-quick', 500);
        if (cartButton) temporaryClass(cartButton, 'shake-subtle', 500);
        updateCartUI();
        // Optionally open cart: if (!isCartOpen) openCart();
    };

    const removeFromCart = (productId) => {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex === -1) return;
        const productName = products.find(p => p.id === productId)?.name || 'Item';
        const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"]`);
        cart = cart.filter(item => item.id !== productId);
        showNotification(`Removed ${productName} from stash.`, 'info');
        if (itemElement) {
            itemElement.classList.add('animate-item-exit');
            itemElement.addEventListener('animationend', updateCartUI, { once: true });
        } else {
            updateCartUI();
        }
    };

    const increaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            updateCartUI();
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"] .item-quantity`);
            if(itemElement) temporaryClass(itemElement.parentElement.parentElement, 'pulse-quick', 300);
        }
    };

    const decreaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                updateCartUI();
                 const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"] .item-quantity`);
                 if(itemElement) temporaryClass(itemElement.parentElement.parentElement, 'pulse-quick', 300);
            }
        }
    };

    // --- Sidebar/Modal Toggles ---

    const openCart = () => {
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'cart-open');
        isCartOpen = true;
    };

    const closeCart = () => {
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'cart-open');
        isCartOpen = false;
    };

    // --- Map Initialization ---
    const initializeMap = () => {
        if (mapInstance) { // If map already exists, remove it first
            console.log("Removing previous map instance.");
            mapInstance.remove();
            mapInstance = null;
            markerInstance = null;
        }

        if (typeof L === 'undefined') {
            console.error("Leaflet (L) is not available. Cannot initialize map.");
            mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Map library failed to load.</p>';
            return; // Stop if Leaflet isn't loaded
        }

        console.log("Initializing Leaflet map...");
        mapContainer.innerHTML = ''; // Clear any loading message

        try {
             // Center roughly on Cairo
             mapInstance = L.map('map-container').setView([30.0444, 31.2357], 11);

             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
             }).addTo(mapInstance);

            // Add marker (initially not placed)
             markerInstance = L.marker([0, 0], { draggable: false }).bindPopup("Your Delivery Location"); // Draggable false, we use map clicks

            // Add click listener to map
            mapInstance.on('click', (e) => {
                const { lat, lng } = e.latlng;
                console.log(`Map clicked at: Lat: ${lat}, Lng: ${lng}`);

                // Update marker position
                 if (!markerInstance.getLatLng().equals([0,0])) { // If marker already exists, just move it
                    markerInstance.setLatLng(e.latlng);
                 } else { // Add marker if it's the first click
                    markerInstance.setLatLng(e.latlng).addTo(mapInstance);
                 }
                mapInstance.panTo(e.latlng); // Center map on marker

                 // Update hidden fields
                 customerLatitudeInput.value = lat.toFixed(6); // Store with reasonable precision
                 customerLongitudeInput.value = lng.toFixed(6);

                // Update status message
                 locationStatus.textContent = `Location Pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                 locationStatus.style.color = 'var(--text-color)'; // Reset color
                 mapContainer.classList.remove('input-error'); // Remove error state from map container

                 // Immediately re-validate the form to check the zone
                 validateCheckoutForm();
             });

             console.log("✅ Leaflet map initialized.");

        } catch (error) {
             console.error("🔥 Failed to initialize Leaflet map:", error);
             mapContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Map Error: ${error.message}</p>`;
             mapInstance = null; // Ensure instance is null on error
             markerInstance = null;
        }
    };

    // --- Checkout Modal ---
    const openCheckout = () => {
        if (!checkoutModal || !checkoutOverlay || !bodyElement || !checkoutSummary || !checkoutTotalPrice || !checkoutForm || !submitOrderButton || paymentTotalReminders.length === 0 || !mapContainer || !locationStatus || !customerLatitudeInput || !customerLongitudeInput) {
            console.error("Cannot open checkout - required elements missing (including map elements).");
            showNotification("Checkout unavailable due to page error.", "error");
            return;
        }

        if (cart.length === 0) {
            showNotification("Add some treats to your cart first!", "warn");
            return;
        }

        console.log("Opening checkout modal (Location Pinning Flow).");

        // Populate Checkout Summary
        let summaryHTML = '<h4>Order Summary:</h4><ul>';
        let total = 0;
        cart.forEach(item => {
             const product = products.find(p => p.id === item.id);
             if (product && typeof product.price === 'number') {
                summaryHTML += `<li>${item.quantity} x ${product.name} (${formatCurrency(product.price)} each)</li>`;
                 total += product.price * item.quantity;
             } else {
                summaryHTML += `<li class="error-message">Error processing item ID: ${item.id || 'Unknown'}</li>`;
                 console.warn(`Checkout Summary: Missing product data for ID ${item.id || 'Unknown'}`);
             }
        });
        summaryHTML += '</ul>';
        checkoutSummary.innerHTML = summaryHTML;
        const totalFormatted = formatCurrency(total);
        checkoutTotalPrice.textContent = totalFormatted;

        paymentTotalReminders.forEach(span => { span.textContent = totalFormatted; });
        console.log("Updated payment reminder spans with total:", totalFormatted);

        // Reset form state and messages
        checkoutForm.reset(); // Resets text fields, radio buttons
        customerLatitudeInput.value = ''; // Clear hidden coords
        customerLongitudeInput.value = '';
        locationStatus.textContent = 'Please pin your location on the map above.'; // Reset map status
        locationStatus.style.color = '#888'; // Reset color
        mapContainer.classList.remove('input-error'); // Clear map error state
        if (checkoutMessage) checkoutMessage.textContent = '';
        if (checkoutMessage) checkoutMessage.className = 'checkout-message';
        if (submitOrderButton) submitOrderButton.disabled = false;
        if (submitOrderButton) submitOrderButton.textContent = 'Confirm Details & Payment Method Used ✅';
        isSubmitting = false;

        checkoutForm.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
            el.removeAttribute('aria-invalid');
        });
        if(paymentMethodSelection) paymentMethodSelection.classList.remove('input-error');

        // Show the modal and overlay
        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'checkout-open');
        isCheckoutOpen = true;

        if (isCartOpen) closeCart();

        // Initialize or Refresh Map *after* modal is potentially visible
        // Use setTimeout to ensure container has dimensions
        setTimeout(() => {
            initializeMap();
            // Focus first field (Name)
            const firstInput = customerNameInput;
            if (firstInput) {
                firstInput.focus();
            }
        }, 100); // Small delay is usually sufficient
     };

    const closeCheckout = () => {
        if (!checkoutModal || !checkoutOverlay || !bodyElement) return;
        console.log("Closing checkout modal.");
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'checkout-open');
        isCheckoutOpen = false;

        // Destroy map instance to free resources
        if (mapInstance) {
            console.log("Destroying map instance.");
            mapInstance.remove();
            mapInstance = null;
            markerInstance = null;
        }

        if (submitOrderButton) {
             submitOrderButton.disabled = false;
             submitOrderButton.textContent = 'Confirm Details & Payment Method Used ✅';
        }
        isSubmitting = false;
    };

    // --- Render Products ---
    const renderProducts = () => {
        if (!productGrid) return;
        console.log(`Rendering ${products.length} products.`);
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        productGrid.innerHTML = '';

        if (products.length === 0) {
            if (!productGrid.querySelector('.error-message')) {
                 productGrid.innerHTML = '<p class="empty-message fade-in">Looks like the treat shelf is empty right now. Maybe check back later?</p>';
            }
            return;
        }

        products.forEach((product, index) => {
             if (!product || typeof product.id !== 'string' || !product.name || typeof product.price !== 'number' || !product.image_url) {
                 console.warn("Skipping product render due to INCOMPLETE data:", product);
                 const errorCard = document.createElement('article');
                 errorCard.classList.add('product-card', 'error-card');
                 errorCard.innerHTML = `<div class="product-details"><h3 class="product-name">Loading Error</h3><p>Couldn't load details.</p></div>`;
                 productGrid.appendChild(errorCard);
                 return;
             }
            const card = document.createElement('article');
            card.classList.add('product-card', 'animate-card-enter');
            card.style.setProperty('--animation-delay', `${index * 0.05}s`);
            const priceFormatted = formatCurrency(product.price);
            card.innerHTML = `
                <div class="product-image-container">
                     <img src="${product.image_url}" alt="${product.name}" class="product-main-image" loading="lazy"
                          onerror="this.onerror=null; this.src='fallback-cookie.png'; this.alt='Image failed'; console.warn('Image load failed: ${product.image_url}')">
                 </div>
                 <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || 'Pure delicious vibes.'}</p>
                    <p class="product-price">${priceFormatted}</p>
                    <button class="cta-button add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to cart">
                        Add To Stash ✨
                    </button>
                </div>
            `;
            productGrid.appendChild(card);
            setTimeout(() => card.classList.remove('animate-card-enter'), 600 + (index * 50));
        });
        console.log("Product rendering complete.");
    };

    // --- Fetch Products ---
     const fetchProducts = async () => {
         if (!productGrid || !supabase) {
            console.error("Cannot fetch products, grid or supabase client missing.");
            if(productGrid) productGrid.innerHTML = '<p class="error-message">Connection error. Cannot load treats.</p>';
            return;
         }
         if (loadingIndicator) loadingIndicator.style.display = 'block';
         productGrid.innerHTML = '';
         console.log("🚀 Initiating Product Fetch...");

         try {
             let { data, error, status } = await supabase
                 .from('products')
                 .select('id, name, description, price, image_url, created_at')
                 .order('created_at', { ascending: true });

             if (error) throw new Error(`Database Error (${status}): ${error.message}`);

             if (data) {
                console.log(`✅ Fetch SUCCESS! Found ${data.length} products.`);
                 products = data;
             } else {
                 console.warn("🤔 Fetch completed, but no data received.");
                 products = [];
             }
         } catch (error) {
            console.error('🔥 PRODUCT FETCH FAILED:', error);
             products = [];
             if(productGrid) productGrid.innerHTML = `<p class="error-message">Could not load treats! 😴.<br><small>Error: ${error.message}</small></p>`;
         } finally {
             if (loadingIndicator) loadingIndicator.style.display = 'none';
             renderProducts();
             updateCartUI();
             console.log("Product fetch sequence complete.");
        }
     };

     // --- Validation ---
     const validateCheckoutForm = () => {
         if (!checkoutForm || !customerNameInput || !customerPhoneInput || !paymentMethodSelection || !mapContainer || !locationStatus || !customerLatitudeInput || !customerLongitudeInput) {
              console.error("Checkout form validation skipped: Required elements missing.");
              showNotification("Checkout form error. Please contact support.", "error");
              return false;
          }

         let isValid = true;
         let firstInvalidField = null;
         console.log("Validating checkout form (Location Pinning Flow)...");

         // Helper to apply error state
         const applyError = (element, isGroup = false, isMap = false) => {
             const elementToStyle = isMap ? mapContainer : (isGroup ? paymentMethodSelection : element);
             elementToStyle.classList.add('input-error'); // Add persistent error class
             temporaryClass(elementToStyle, 'shake-subtle', 500); // Temporary shake
             if (!isGroup && !isMap) element.setAttribute('aria-invalid', 'true');

             // Set focus target
             if (!firstInvalidField) {
                if (isMap) firstInvalidField = mapContainer; // Focus the map area
                else if (isGroup) firstInvalidField = paymentMethodSelection.querySelector('input'); // Focus first radio
                else firstInvalidField = element; // Focus the input field
             }
         };

         // Helper to remove error state
         const removeError = (element, isGroup = false, isMap = false) => {
             const elementToStyle = isMap ? mapContainer : (isGroup ? paymentMethodSelection : element);
             elementToStyle.classList.remove('input-error');
              if (!isGroup && !isMap) element.removeAttribute('aria-invalid');
         };

         // --- Reset previous errors ---
         checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
         [customerNameInput, customerPhoneInput].forEach(el => el.removeAttribute('aria-invalid'));
         removeError(null, true, false); // Reset radio group border/bg
         removeError(null, false, true); // Reset map container border/bg


         // --- Field Validations ---

         // 1. Name
         if (customerNameInput.value.trim().length < 2) {
             isValid = false; applyError(customerNameInput); console.warn("Validation Fail: Name");
          } else { removeError(customerNameInput); }

         // 2. Phone
         if (!customerPhoneInput.checkValidity() || customerPhoneInput.value.trim() === '') {
             isValid = false; applyError(customerPhoneInput); console.warn("Validation Fail: Phone number invalid or missing.");
         } else { removeError(customerPhoneInput); }

         // 3. Location Pinned & Zone Check
         const lat = parseFloat(customerLatitudeInput.value);
         const lng = parseFloat(customerLongitudeInput.value);

         if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) { // Check if coords are valid numbers and not default 0,0
             isValid = false;
             applyError(null, false, true); // Apply error to map container
             locationStatus.textContent = '🚨 Please pin your location on the map!';
             locationStatus.style.color = 'red';
             console.warn("Validation Fail: Location not pinned.");
         } else {
             // Check if within the defined delivery zone
             const isInZone = lat >= DELIVERY_ZONE.minLat && lat <= DELIVERY_ZONE.maxLat &&
                              lng >= DELIVERY_ZONE.minLng && lng <= DELIVERY_ZONE.maxLng;

             if (!isInZone) {
                 isValid = false;
                 applyError(null, false, true); // Apply error to map container
                 locationStatus.textContent = `🚨 Sorry, location is outside our delivery zone (New Cairo/Nasr City).`;
                 locationStatus.style.color = 'red';
                 console.warn(`Validation Fail: Location (${lat}, ${lng}) is outside delivery zone.`);
                 showNotification("Selected location is outside our New Cairo / Nasr City delivery zone.", 'warn', 5000);
             } else {
                 // Location is valid and in zone
                 removeError(null, false, true); // Remove error from map container
                 // Keep the "Location Pinned" message, maybe change color back?
                 locationStatus.style.color = 'var(--primary-color)'; // Or your success color
                 console.log("Location validation passed: Pinned and within zone.");
             }
         }

         // 4. Payment Method Selection
         const selectedPaymentMethod = checkoutForm.querySelector('input[name="payment_method"]:checked');
         if (!selectedPaymentMethod) {
             isValid = false;
             applyError(null, true, false); // Style the payment group container
             console.warn("Validation Fail: Payment method not selected.");
             if (!firstInvalidField) firstInvalidField = paymentMethodSelection.querySelector('input[type="radio"]');
         } else {
             removeError(null, true, false); // Remove container style
         }
         // --- End Field Validations ---

         if (!isValid) {
             console.error("Checkout validation failed.");
             showNotification("Please check the highlighted details!", 'warn', 3000);

             if (firstInvalidField) {
                 setTimeout(() => {
                     // Focus behavior: input fields get direct focus, map/radio group scrolls into view
                     if (firstInvalidField === mapContainer || firstInvalidField.type === 'radio') {
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Optionally add a visual cue to the map/radio if focus isn't obvious
                        if(firstInvalidField === mapContainer) temporaryClass(mapContainer, 'focus-highlight', 1000);
                     } else {
                        firstInvalidField.focus();
                     }
                 }, 100);
                 if (checkoutModal) {
                     temporaryClass(checkoutModal, 'shake-error', 400);
                 }
             }
         } else {
             console.log("✅ Checkout validation passed.");
         }
         return isValid;
     };


    // --- Checkout Handler ---
      const handleCheckout = async (event) => {
           event.preventDefault();
           console.log("handleCheckout initiated (Location Pinning Flow).");

           if (!supabase || typeof L === 'undefined' || !customerLatitudeInput || !customerLongitudeInput) {
                console.error("Checkout prerequisites missing (Supabase/Leaflet/Coord Inputs).");
                showNotification("Checkout system error. Please refresh or contact support.", "error");
                return;
           }
           if (isSubmitting) { console.warn("Submission already in progress."); return; }
           if (cart.length === 0) { showNotification("Your cart is empty!", "warn"); return; }

           // --- Frontend Validation (Includes Location Pinning & Zone Check) ---
           if (!validateCheckoutForm()) return; // Stops if validation fails

           // --- Start Submission Process ---
           isSubmitting = true;
           if(submitOrderButton) submitOrderButton.disabled = true;
           if(submitOrderButton) submitOrderButton.textContent = 'Saving Order... ⏳';
           if(checkoutMessage) checkoutMessage.textContent = '';
           if(checkoutMessage) checkoutMessage.className = 'checkout-message';

           // --- Gather Data ---
           const formData = new FormData(checkoutForm);
           const customerData = {
               customer_name: formData.get('customer_name')?.trim() || 'N/A',
               customer_phone: formData.get('customer_phone')?.trim() || 'N/A',
               payment_method: formData.get('payment_method') || 'Not Selected',
               // Coordinates are taken directly from hidden inputs
               latitude: parseFloat(customerLatitudeInput.value),
               longitude: parseFloat(customerLongitudeInput.value)
           };

           // Double check coordinates are valid numbers before sending
           if (isNaN(customerData.latitude) || isNaN(customerData.longitude)) {
                console.error("Invalid coordinate data before sending to backend.");
                showNotification("Error with location data. Please re-pin your location.", "error");
                isSubmitting = false;
                if(submitOrderButton) submitOrderButton.disabled = false;
                if(submitOrderButton) submitOrderButton.textContent = 'Try Again?';
                return;
           }

           const orderItems = cart.map(item => {
               const product = products.find(p => p.id === item.id);
               return {
                   product_id: item.id,
                   quantity: item.quantity,
                   name_at_purchase: product ? product.name : 'Unknown',
                   price_at_purchase: (product && typeof product.price === 'number') ? product.price : 0
               };
           });

           const calculatedTotalPrice = orderItems.reduce((sum, item) => {
                return sum + (item.price_at_purchase * item.quantity);
            }, 0);

           // --- Prepare Payload for Supabase 'orders' Table ---
           const orderPayload = {
               customer_name: customerData.customer_name,
               // customer_address: REMOVED - Replaced by coordinates
               customer_phone: customerData.customer_phone,
               latitude: customerData.latitude,      // <<< ADDED
               longitude: customerData.longitude,    // <<< ADDED
               payment_method: customerData.payment_method,
               order_items: orderItems, // Supabase calls this 'items' in schema, check your table! If it's 'items', change here.
               total_price: calculatedTotalPrice,
               status: 'Pending Payment Confirmation' // Default status
           };

           console.log("Attempting to insert order with coordinates:", orderPayload);

           // --- Insert into Supabase ---
           try {
               const { data, error } = await supabase
                   .from('orders') // <<< YOUR ORDERS TABLE NAME
                   .insert([orderPayload])
                   .select();

               if (error) throw new Error(`Database Error: ${error.message}`);

               console.log("✅ Order successfully logged with location:", data);

               // --- Success Actions ---
               if (checkoutMessage) {
                   checkoutMessage.textContent = `🎉 Order Logged! Location: ${customerData.latitude.toFixed(4)}, ${customerData.longitude.toFixed(4)}. Please complete payment via ${customerData.payment_method}. We'll confirm & process once received. Thanks!`;
                   checkoutMessage.className = 'checkout-message success animate-fade-in';
               }
               showNotification("Order details sent! Awaiting payment confirmation.", 'success', 5000);
               cart = [];
               updateCartUI();

               setTimeout(() => {
                    closeCheckout();
                    // checkoutForm.reset(); // closeCheckout already resets the form
               }, 4000);

           } catch (error) {
               console.error("🔥 Order logging FAILED:", error);
               if (checkoutMessage) {
                   checkoutMessage.textContent = `😭 Oops! Couldn't save order details. Please try again or contact us. Error: ${error.message}`;
                   checkoutMessage.className = 'checkout-message error animate-fade-in';
               }
               showNotification(`Order logging failed: ${error.message}`, 'error', 5000);
               isSubmitting = false;
               if(submitOrderButton) {
                    submitOrderButton.disabled = false;
                    submitOrderButton.textContent = 'Try Confirming Again?';
               }
           }
       }; // --- END OF handleCheckout ---


    // --- EVENT LISTENERS SETUP ---
     const setupEventListeners = () => {
         if (!cartButton || !closeCartButton || !cartOverlay || !checkoutButton || !closeCheckoutButton || !checkoutOverlay || !checkoutForm || !cartItemsContainer || !productGrid || !checkoutModal) {
             console.error("Cannot setup all event listeners - crucial elements missing!");
             showNotification("Page setup error. Buttons might not work.", "error");
             return;
         }
        console.log("Attaching event listeners...");

        // Cart Toggles
        cartButton.addEventListener('click', openCart);
        closeCartButton.addEventListener('click', closeCart);
        cartOverlay.addEventListener('click', closeCart);

        // Checkout Toggles
        checkoutButton.addEventListener('click', openCheckout);
        closeCheckoutButton.addEventListener('click', closeCheckout);
        checkoutOverlay.addEventListener('click', (event) => {
            if (event.target === checkoutOverlay) closeCheckout();
        });

        // Form Submission
        checkoutForm.addEventListener('submit', handleCheckout);

        // Cart Item Actions (Delegation)
        cartItemsContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.action-button');
            if (!targetButton) return;
            const productId = targetButton.dataset.id;
            if (!productId) return;
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
                 if (productId) addToCart(productId, button);
                 else console.warn("Add button missing data-id!");
             }
         });

        // Copy Buttons Listener (Delegation on Modal - Kept as is)
        checkoutModal.addEventListener('click', async (event) => {
            const copyButton = event.target.closest('.copy-button');
            if (!copyButton) return;

            const targetSelector = copyButton.dataset.clipboardTarget;
            const targetElement = targetSelector ? document.querySelector(targetSelector) : null;
            if (!targetElement) {
                console.warn(`Copy target "${targetSelector}" not found.`);
                showNotification("Error finding text to copy.", "error");
                return;
            }

            const textToCopy = targetElement.textContent || targetElement.innerText;
            try {
                await navigator.clipboard.writeText(textToCopy);
                console.log(`Copied: ${textToCopy}`);
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '✅ Copied!';
                copyButton.classList.add('copied');
                showNotification(`Copied: ${textToCopy}`, 'success', 2000);
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
                showNotification('Failed to copy. Please copy manually.', 'error');
                try {
                    const range = document.createRange(); range.selectNodeContents(targetElement);
                    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
                } catch (selectErr) { /* Ignore fallback error */ }
            }
        });

        console.log("✅ Event listeners setup complete.");
     };

    // --- PAGE INITIALIZATION ---
    const initializePage = () => {
        console.log("----- Initializing Vibe Treats Page (v_LocationPin) -----");
         try {
             const storedCart = localStorage.getItem('vibeTreatsCart');
             if (storedCart) {
                 try {
                     const parsedCart = JSON.parse(storedCart);
                     if (Array.isArray(parsedCart) && parsedCart.every(item => typeof item.id !== 'undefined' && typeof item.quantity !== 'undefined')) {
                         cart = parsedCart;
                         console.log("Loaded cart from localStorage:", cart);
                     } else {
                         console.warn("Invalid cart data in localStorage. Resetting.");
                         localStorage.removeItem('vibeTreatsCart');
                     }
                 } catch (e) {
                     console.error("Failed to parse cart from localStorage. Resetting.", e);
                     localStorage.removeItem('vibeTreatsCart');
                 }
            }

             if (yearSpan) yearSpan.textContent = new Date().getFullYear();
             else console.warn("Footer year span #year not found.");

             setupEventListeners();
             fetchProducts();

            console.log("----- Page Initialized (Async fetch running) -----");

        } catch (error) {
            console.error("☠️ FATAL ERROR during page initialization:", error);
             alert("A critical error occurred while loading the page. Please try refreshing.");
             if(bodyElement) bodyElement.innerHTML = `<h1 style="color: #FF3399; text-align: center; padding: 50px;">CRITICAL PAGE LOAD ERROR</h1><p style="text-align:center;">Please refresh.</p><p style="text-align:center; color: grey;"><small>${error.message}</small></p>`;
        }
     };

    // --- Engage! ---
    initializePage();

}); // === END OF DOMCONTENTLOADED ===
