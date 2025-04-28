// --- VIBE TREATS SCRIPT - CONSOLIDATED & COMPLETE (with Leaflet Location Pinning, Geolocation, Geocoder Search) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("----- VIBE TREATS STARTUP (v_LocationSearch) ----- DOM loaded.");

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

     // --- Leaflet & Plugin Checks ---
     let leafletAvailable = true;
     let geocoderAvailable = true;
     if (typeof L === 'undefined') {
        console.error("🛑 Leaflet library (L) not found. Map features disabled.");
        leafletAvailable = false;
     } else {
        console.log("✅ Leaflet library (L) found.");
        if (typeof L.Control.Geocoder === 'undefined') {
            console.warn("⚠️ Leaflet Geocoder plugin (L.Control.Geocoder) not found. Search functionality disabled.");
            geocoderAvailable = false;
        } else {
            console.log("✅ Leaflet Geocoder plugin found.");
        }
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
    // Map related elements
    const mapContainer = document.getElementById('map-container');
    const locationStatus = document.getElementById('location-status');
    const customerLatitudeInput = document.getElementById('customer_latitude');
    const customerLongitudeInput = document.getElementById('customer_longitude');
    const findMeButton = document.getElementById('find-me-button'); // Added


    // Check if crucial elements were found
    if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !cartCount || !cartItemsContainer || !cartTotalPrice ||
        !checkoutButton || !checkoutModal || !checkoutOverlay || !closeCheckoutButton || !checkoutForm || !submitOrderButton ||
        !customerNameInput || !customerPhoneInput || !checkoutSummary || !checkoutTotalPrice || !paymentMethodSelection || paymentTotalReminders.length === 0 ||
        (leafletAvailable && (!mapContainer || !locationStatus || !customerLatitudeInput || !customerLongitudeInput || !findMeButton)) // Check map elements only if Leaflet loaded
       )
    {
        console.error("🛑 Critical HTML elements missing! Check IDs/Classes in your HTML file against the script (including map elements if map library loaded).");
        alert("Woops! Some essential parts of the page are missing in the HTML. Can't run properly.");
        if (bodyElement) bodyElement.innerHTML = '<h1 style="color: red; text-align: center; padding: 50px;">CRITICAL LAYOUT ERROR: Page elements missing.</h1>';
        return; // Stop if layout is fundamentally broken
    }
    console.log("✅ HTML elements found.");
    if (!leafletAvailable && mapContainer) {
         mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Map library failed to load.</p>';
    }


    // --- STATE MANAGEMENT ---
    let cart = [];
    let products = [];
    let isCartOpen = false;
    let isCheckoutOpen = false;
    let isSubmitting = false;
    let mapInstance = null; // Holds the Leaflet map object
    let markerInstance = null; // Holds the Leaflet marker object
    let geocoderControl = null; // Holds the Geocoder control

    // --- DELIVERY ZONE ---
    // ** YOU MUST ADJUST THESE COORDINATES **
    const DELIVERY_ZONE = {
        minLat: 29.900000,
        maxLat: 30.080000,
        minLng: 31.250000,
        maxLng: 31.520000
    };
    const DEFAULT_MAP_CENTER = [30.0444, 31.2357]; // Cairo Center (Fallback)
    const DEFAULT_MAP_ZOOM = 11;
    const LOCATION_FOUND_ZOOM = 16; // Zoom level when location is found/pinned

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
        // ... (Keep existing updateCartUI function - no changes needed here)
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
        // ... (Keep existing addToCart function - no changes needed here)
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
        // ... (Keep existing removeFromCart function - no changes needed here)
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
        // ... (Keep existing increaseQuantity function - no changes needed here)
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            updateCartUI();
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"] .item-quantity`);
            if(itemElement) temporaryClass(itemElement.parentElement.parentElement, 'pulse-quick', 300);
        }
    };

    const decreaseQuantity = (productId) => {
        // ... (Keep existing decreaseQuantity function - no changes needed here)
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
        // ... (Keep existing openCart function - no changes needed here)
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'cart-open');
        isCartOpen = true;
    };

    const closeCart = () => {
        // ... (Keep existing closeCart function - no changes needed here)
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'cart-open');
        isCartOpen = false;
    };

    // --- Map Location Update Function ---
    /** Handles updating the marker, inputs, and status when a location is selected */
    const updateLocation = (lat, lng, locationName = null) => {
        if (!mapInstance || !markerInstance || !customerLatitudeInput || !customerLongitudeInput || !locationStatus) return;

        const latLng = L.latLng(lat, lng);

        // Update marker position
        if (!markerInstance.getLatLng() || markerInstance.getLatLng().lat === 0) { // Add marker if it doesn't exist or is at 0,0
            markerInstance.setLatLng(latLng).addTo(mapInstance);
        } else {
            markerInstance.setLatLng(latLng);
        }

        // Update popup content if name is available
        if (locationName) {
            markerInstance.bindPopup(`<b>${locationName}</b><br>Your Delivery Location`).openPopup();
        } else {
            markerInstance.bindPopup("Your Delivery Location").openPopup();
        }


        mapInstance.setView(latLng, LOCATION_FOUND_ZOOM); // Center map and zoom in

        // Update hidden fields
        customerLatitudeInput.value = lat.toFixed(6);
        customerLongitudeInput.value = lng.toFixed(6);

        // Update status message
        locationStatus.textContent = `Location Set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        locationStatus.style.color = 'var(--text-dark)'; // Use a neutral/positive color
        mapContainer.classList.remove('input-error'); // Remove error state

        // Immediately re-validate the form to check the zone
        validateCheckoutForm();
    };

    // --- Geolocation Function ---
    /** Tries to get the user's current location */
    const findUserLocation = (initialLoad = false) => {
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by this browser.");
            if (!initialLoad) showNotification("Sorry, your browser doesn't support finding your location.", "warn");
            // Map should still center on default Cairo if called during init
            if (mapInstance && initialLoad) {
                mapInstance.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
            }
            return;
        }

        if (!initialLoad) showNotification("Finding your location...", "info", 2000);
        if (findMeButton) findMeButton.disabled = true; // Disable button while searching

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`Geolocation success: Lat: ${latitude}, Lng: ${longitude}`);
                updateLocation(latitude, longitude, "Your Current Location");
                if (findMeButton) findMeButton.disabled = false;
            },
            (error) => {
                console.error("Geolocation error:", error);
                let message = "Could not get your location.";
                if (error.code === error.PERMISSION_DENIED) {
                    message = "Location permission denied. Please allow or pin manually.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message = "Location information is unavailable.";
                } else if (error.code === error.TIMEOUT) {
                    message = "Getting location timed out.";
                }
                if (!initialLoad) showNotification(message, "warn");
                // Center on Cairo if it was the initial load attempt
                 if (mapInstance && initialLoad) {
                    mapInstance.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
                    console.log("Geolocation failed on load, centering on default.");
                 }
                 if (findMeButton) findMeButton.disabled = false;
            },
            {
                enableHighAccuracy: false, // Lower accuracy is faster and often sufficient
                timeout: 10000, // 10 seconds
                maximumAge: 60000 // Accept cached position up to 1 minute old
            }
        );
    };


    // --- Map Initialization (Now includes Geolocation attempt & Geocoder) ---
    const initializeMap = () => {
        if (!leafletAvailable || !mapContainer) {
             console.error("Leaflet not available or map container missing. Cannot initialize map.");
             if (mapContainer) mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Map library failed to load.</p>';
             return; // Stop if Leaflet isn't loaded
        }

        if (mapInstance) {
            console.log("Removing previous map instance.");
            mapInstance.remove();
            mapInstance = null;
            markerInstance = null;
            geocoderControl = null;
        }

        console.log("Initializing Leaflet map with Geolocation and Geocoder...");
        mapContainer.querySelector('p')?.remove(); // Remove loading message if exists

        try {
             // Initialize map centered on Cairo (will be updated by geolocation if successful)
             mapInstance = L.map('map-container').setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
             }).addTo(mapInstance);

            // Initialize marker (draggable false, position updated by events)
            markerInstance = L.marker([0, 0], { draggable: false }).bindPopup("Your Delivery Location");

            // --- Add Geocoder Control ---
            if (geocoderAvailable) {
                geocoderControl = L.Control.geocoder({
                    defaultMarkGeocode: false, // We'll handle the marker ourselves
                    placeholder: "Search address or place...",
                    errorMessage: "Nothing found, try again?",
                    geocoder: L.Control.Geocoder.nominatim({
                        geocodingQueryParams: {
                            countrycodes: 'eg', // Prioritize Egypt results
                            viewbox: '31.0,29.8,31.8,30.2', // Optional: Bbox roughly around Cairo
                            bounded: 1 // Strictly search within viewbox if set
                        }
                    }),
                    position: 'topright',
                    collapsed: false, // Keep it expanded initially on desktop? Maybe true for mobile.
                })
                .on('markgeocode', function(e) {
                    const { center, name } = e.geocode; // center is a L.LatLng object
                    console.log("Geocoder result selected:", e.geocode);
                    updateLocation(center.lat, center.lng, name); // Use our update function
                })
                .addTo(mapInstance);
                 console.log("✅ Geocoder control added.");
            } else {
                console.warn("Geocoder plugin not loaded, search disabled.");
            }

            // --- Map Click Listener ---
            mapInstance.on('click', (e) => {
                console.log(`Map clicked at: Lat: ${e.latlng.lat}, Lng: ${e.latlng.lng}`);
                updateLocation(e.latlng.lat, e.latlng.lng); // Use our update function
            });

            // --- Attempt Geolocation on Initial Load ---
            findUserLocation(true); // Pass true for initial load context

             console.log("✅ Leaflet map base initialized.");

        } catch (error) {
             console.error("🔥 Failed to initialize Leaflet map:", error);
             mapContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Map Error: ${error.message}</p>`;
             mapInstance = null;
             markerInstance = null;
             geocoderControl = null;
        }
    };

    // --- Checkout Modal ---
    const openCheckout = () => {
        // ... (Keep most of existing openCheckout function)
        if (!checkoutModal || !checkoutOverlay || !bodyElement || !checkoutSummary || !checkoutTotalPrice || !checkoutForm || !submitOrderButton || paymentTotalReminders.length === 0 ||
            (leafletAvailable && (!mapContainer || !locationStatus || !customerLatitudeInput || !customerLongitudeInput)) ) // Check map elements only if Leaflet loaded
        {
            console.error("Cannot open checkout - required elements missing.");
            showNotification("Checkout unavailable due to page error.", "error");
            return;
        }
        // ... (rest of cart empty check, console log)
        if (cart.length === 0) {
            showNotification("Add some treats to your cart first!", "warn");
            return;
        }

        console.log("Opening checkout modal (Location Search Flow).");

        // ... (Keep Summary population logic)
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

        // ... (Keep Form Reset logic)
        checkoutForm.reset();
        if (customerLatitudeInput) customerLatitudeInput.value = ''; // Clear hidden coords
        if (customerLongitudeInput) customerLongitudeInput.value = '';
        if (locationStatus) locationStatus.textContent = 'Please pin or search for your location.'; // Reset map status
        if (locationStatus) locationStatus.style.color = '#888'; // Reset color
        if (mapContainer) mapContainer.classList.remove('input-error'); // Clear map error state
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
        if (findMeButton) findMeButton.disabled = false; // Ensure 'Find Me' button is enabled


        // ... (Show modal logic)
        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'checkout-open');
        isCheckoutOpen = true;
        if (isCartOpen) closeCart();

        // Initialize or Refresh Map *after* modal is potentially visible
        if (leafletAvailable) {
             setTimeout(() => {
                initializeMap();
                // Focus first field (Name)
                 const firstInput = customerNameInput;
                 if (firstInput) {
                     firstInput.focus();
                 }
            }, 100);
        } else {
             console.warn("Map cannot be initialized as Leaflet is not available.");
        }
     };

    const closeCheckout = () => {
        // ... (Keep most of existing closeCheckout function)
        if (!checkoutModal || !checkoutOverlay || !bodyElement) return;
        console.log("Closing checkout modal.");
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'checkout-open');
        isCheckoutOpen = false;

        // Destroy map instance
        if (mapInstance) {
            console.log("Destroying map instance.");
            mapInstance.remove();
            mapInstance = null;
            markerInstance = null;
            geocoderControl = null; // Clear reference to geocoder control
        }

        // ... (Reset button state)
        if (submitOrderButton) {
             submitOrderButton.disabled = false;
             submitOrderButton.textContent = 'Confirm Details & Payment Method Used ✅';
        }
        isSubmitting = false;
    };

    // --- Render Products ---
    const renderProducts = () => {
        // ... (Keep existing renderProducts function - no changes needed here)
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
         // ... (Keep existing fetchProducts function - no changes needed here)
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
         // ... (Keep most of existing validateCheckoutForm function)
         // Check if map elements exist only if Leaflet is supposed to be available
         const mapElementsPresent = !leafletAvailable || (mapContainer && locationStatus && customerLatitudeInput && customerLongitudeInput);

         if (!checkoutForm || !customerNameInput || !customerPhoneInput || !paymentMethodSelection || !mapElementsPresent) {
              console.error("Checkout form validation skipped: Required elements missing.");
              showNotification("Checkout form error. Please contact support.", "error");
              return false;
          }
         // ... (rest of initialization: isValid, firstInvalidField, applyError, removeError)
         let isValid = true;
         let firstInvalidField = null;
         console.log("Validating checkout form (Location Search Flow)...");

         // Helper to apply error state
         const applyError = (element, isGroup = false, isMap = false) => {
             const elementToStyle = isMap ? mapContainer : (isGroup ? paymentMethodSelection : element);
             if (!elementToStyle) return; // Skip if element doesn't exist
             elementToStyle.classList.add('input-error');
             temporaryClass(elementToStyle, 'shake-subtle', 500);
             if (!isGroup && !isMap && element) element.setAttribute('aria-invalid', 'true');
             if (!firstInvalidField) {
                if (isMap) firstInvalidField = mapContainer;
                else if (isGroup) firstInvalidField = paymentMethodSelection.querySelector('input');
                else firstInvalidField = element;
             }
         };

         // Helper to remove error state
         const removeError = (element, isGroup = false, isMap = false) => {
             const elementToStyle = isMap ? mapContainer : (isGroup ? paymentMethodSelection : element);
             if (!elementToStyle) return; // Skip if element doesn't exist
             elementToStyle.classList.remove('input-error');
              if (!isGroup && !isMap && element) element.removeAttribute('aria-invalid');
         };

         // Reset previous errors
         checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
         [customerNameInput, customerPhoneInput].forEach(el => { if(el) el.removeAttribute('aria-invalid'); });
         removeError(null, true, false); // Reset radio group
         removeError(null, false, true); // Reset map container

         // Field Validations (Name, Phone) - Keep as is
          if (customerNameInput.value.trim().length < 2) {
             isValid = false; applyError(customerNameInput); console.warn("Validation Fail: Name");
          } else { removeError(customerNameInput); }

         if (!customerPhoneInput.checkValidity() || customerPhoneInput.value.trim() === '') {
             isValid = false; applyError(customerPhoneInput); console.warn("Validation Fail: Phone number invalid or missing.");
         } else { removeError(customerPhoneInput); }


         // Location Pinned & Zone Check - Keep as is
         if (leafletAvailable) { // Only validate map if Leaflet is loaded
             const lat = parseFloat(customerLatitudeInput.value);
             const lng = parseFloat(customerLongitudeInput.value);

             if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                 isValid = false;
                 applyError(null, false, true); // Apply error to map container
                 if (locationStatus) {
                     locationStatus.textContent = '🚨 Please pin or search for your location!';
                     locationStatus.style.color = 'var(--error-color)';
                 }
                 console.warn("Validation Fail: Location not set.");
             } else {
                 const isInZone = lat >= DELIVERY_ZONE.minLat && lat <= DELIVERY_ZONE.maxLat &&
                                  lng >= DELIVERY_ZONE.minLng && lng <= DELIVERY_ZONE.maxLng;
                 if (!isInZone) {
                     isValid = false;
                     applyError(null, false, true);
                     if (locationStatus) {
                        locationStatus.textContent = `🚨 Sorry, location is outside our delivery zone (New Cairo/Nasr City).`;
                        locationStatus.style.color = 'var(--error-color)';
                     }
                     console.warn(`Validation Fail: Location (${lat}, ${lng}) is outside delivery zone.`);
                     showNotification("Selected location is outside our New Cairo / Nasr City delivery zone.", 'warn', 5000);
                 } else {
                     removeError(null, false, true);
                     if (locationStatus) {
                        // Keep the "Location Set" message, maybe change color back if it was red
                        if (locationStatus.style.color === 'var(--error-color)' || locationStatus.style.color === 'red') {
                             locationStatus.style.color = 'var(--primary-color)';
                        }
                     }
                     console.log("Location validation passed: Set and within zone.");
                 }
             }
         } else {
            console.log("Skipping map validation as Leaflet is unavailable.");
            // If map is REQUIRED, you might set isValid = false here if leafletAvailable is false.
            // Or, have alternative input methods. For now, we assume it might proceed without map if library failed.
         }


         // Payment Method Selection - Keep as is
         const selectedPaymentMethod = checkoutForm.querySelector('input[name="payment_method"]:checked');
         if (!selectedPaymentMethod) {
             isValid = false;
             applyError(null, true, false); // Style the payment group container
             console.warn("Validation Fail: Payment method not selected.");
             if (!firstInvalidField) firstInvalidField = paymentMethodSelection?.querySelector('input[type="radio"]');
         } else {
             removeError(null, true, false); // Remove container style
         }


         // --- Final Validation Check & Feedback ---
         if (!isValid) {
             console.error("Checkout validation failed.");
             showNotification("Please check the highlighted details!", 'warn', 3000);

             if (firstInvalidField) {
                 setTimeout(() => {
                     if (firstInvalidField === mapContainer || firstInvalidField.type === 'radio') {
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        if(firstInvalidField === mapContainer) temporaryClass(mapContainer, 'focus-highlight', 1000);
                     } else {
                        firstInvalidField.focus({ preventScroll: true }); // Focus without jarring scroll
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Then smooth scroll
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
           // ... (Keep existing handleCheckout function - No significant changes needed here)
           // It already reads coordinates from the hidden inputs, which are updated by all methods (click, geo, search)
           event.preventDefault();
           console.log("handleCheckout initiated (Location Search Flow).");

           // Prerequisites check
           const mapCheckOk = !leafletAvailable || (customerLatitudeInput && customerLongitudeInput); // Map inputs only needed if Leaflet was supposed to load
           if (!supabase || !mapCheckOk) {
                console.error("Checkout prerequisites missing (Supabase or Map Inputs if applicable).");
                showNotification("Checkout system error. Please refresh or contact support.", "error");
                return;
           }
           if (isSubmitting) { console.warn("Submission already in progress."); return; }
           if (cart.length === 0) { showNotification("Your cart is empty!", "warn"); return; }

           // Frontend Validation
           if (!validateCheckoutForm()) return;

           // Start Submission Process
           isSubmitting = true;
           if(submitOrderButton) submitOrderButton.disabled = true;
           if(submitOrderButton) submitOrderButton.textContent = 'Saving Order... ⏳';
           if(checkoutMessage) checkoutMessage.textContent = '';
           if(checkoutMessage) checkoutMessage.className = 'checkout-message';

           // Gather Data
           const formData = new FormData(checkoutForm);
           const customerData = {
               customer_name: formData.get('customer_name')?.trim() || 'N/A',
               customer_phone: formData.get('customer_phone')?.trim() || 'N/A',
               payment_method: formData.get('payment_method') || 'Not Selected',
               latitude: leafletAvailable ? parseFloat(customerLatitudeInput.value) : null, // Get coords only if map available
               longitude: leafletAvailable ? parseFloat(customerLongitudeInput.value) : null
           };

            // Double check coordinates if map was supposed to be available
           if (leafletAvailable && (isNaN(customerData.latitude) || isNaN(customerData.longitude))) {
                console.error("Invalid coordinate data before sending to backend.");
                showNotification("Error with location data. Please re-select your location.", "error");
                isSubmitting = false;
                if(submitOrderButton) submitOrderButton.disabled = false;
                if(submitOrderButton) submitOrderButton.textContent = 'Try Again?';
                return;
           }

           const orderItems = cart.map(item => {
               const product = products.find(p => p.id === item.id);
               return {
                   product_id: item.id, quantity: item.quantity,
                   name_at_purchase: product ? product.name : 'Unknown',
                   price_at_purchase: (product && typeof product.price === 'number') ? product.price : 0
               };
           });
           const calculatedTotalPrice = orderItems.reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0);

           // Prepare Payload
           const orderPayload = {
               customer_name: customerData.customer_name,
               customer_phone: customerData.customer_phone,
               latitude: customerData.latitude,      // Will be null if map failed
               longitude: customerData.longitude,    // Will be null if map failed
               payment_method: customerData.payment_method,
               order_items: orderItems, // Check your Supabase table column name! Use 'items' if needed.
               total_price: calculatedTotalPrice,
               status: 'Pending Payment Confirmation'
           };

           console.log("Attempting to insert order:", orderPayload);

           // Insert into Supabase
           try {
               const { data, error } = await supabase.from('orders').insert([orderPayload]).select();
               if (error) throw new Error(`Database Error: ${error.message}`);
               console.log("✅ Order successfully logged:", data);

               // Success Actions
               if (checkoutMessage) {
                   let successMsg = `🎉 Order Logged! Please complete payment via ${customerData.payment_method}. We'll confirm & process once received. Thanks!`;
                   if(customerData.latitude) { // Add location if available
                      successMsg = `🎉 Order Logged! Location: ${customerData.latitude.toFixed(4)}, ${customerData.longitude.toFixed(4)}. Please complete payment via ${customerData.payment_method}. Thanks!`;
                   }
                   checkoutMessage.textContent = successMsg;
                   checkoutMessage.className = 'checkout-message success animate-fade-in';
               }
               showNotification("Order details sent! Awaiting payment confirmation.", 'success', 5000);
               cart = [];
               updateCartUI();
               setTimeout(closeCheckout, 4000);

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
         // ... (Keep existing listeners for cart toggles, checkout toggles, form submit, cart actions, add to cart, copy buttons)
         // Re-check essential elements for listeners
         if (!cartButton || !closeCartButton || !cartOverlay || !checkoutButton || !closeCheckoutButton || !checkoutOverlay || !checkoutForm || !cartItemsContainer || !productGrid || !checkoutModal) {
             console.error("Cannot setup all event listeners - crucial elements missing!");
             showNotification("Page setup error. Buttons might not work.", "error");
             return; // Don't proceed if core elements are missing
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

         // "Find Me" Button Listener (Only add if Leaflet and button exist)
         if (leafletAvailable && findMeButton) {
             findMeButton.addEventListener('click', () => {
                console.log("Find Me button clicked.");
                findUserLocation(false); // Pass false, it's not the initial load
             });
         } else if (!leafletAvailable && findMeButton) {
            findMeButton.disabled = true; // Disable if map library failed
            findMeButton.title = "Map library failed to load";
         }

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
        // ... (Keep existing initializePage function - no changes needed here)
        console.log("----- Initializing Vibe Treats Page (v_LocationSearch) -----");
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
