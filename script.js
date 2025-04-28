// --- VIBE TREATS SCRIPT - CONSOLIDATED & COMPLETE (v_SatelliteAndDetails) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("----- VIBE TREATS STARTUP (v_SatelliteAndDetails) ----- DOM loaded.");

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
    // ** NEW ** Address Detail Inputs
    const buildingDetailsInput = document.getElementById('building_details');
    const floorAptInput = document.getElementById('floor_apt');
    const landmarksInput = document.getElementById('landmarks');
    // Map related elements
    const mapContainer = document.getElementById('map-container');
    const locationStatus = document.getElementById('location-status');
    const customerLatitudeInput = document.getElementById('customer_latitude');
    const customerLongitudeInput = document.getElementById('customer_longitude');
    const findMeButton = document.getElementById('find-me-button');
    // Checkout Summary & Other elements
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const submitOrderButton = document.getElementById('submit-order-button');
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingIndicator = document.getElementById('loading-indicator');
    const bodyElement = document.body;
    const paymentMethodSelection = document.querySelector('.payment-method-selection');
    const paymentTotalReminders = document.querySelectorAll('.payment-total-reminder');


    // Check if crucial elements were found
    if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !cartCount || !cartItemsContainer || !cartTotalPrice ||
        !checkoutButton || !checkoutModal || !checkoutOverlay || !closeCheckoutButton || !checkoutForm || !submitOrderButton ||
        !customerNameInput || !customerPhoneInput || !checkoutSummary || !checkoutTotalPrice || !paymentMethodSelection || paymentTotalReminders.length === 0 ||
        // ** NEW ** Check new address inputs
        !buildingDetailsInput || !floorAptInput || !landmarksInput ||
        // Map checks (only if Leaflet loaded)
        (leafletAvailable && (!mapContainer || !locationStatus || !customerLatitudeInput || !customerLongitudeInput || !findMeButton))
       )
    {
        console.error("🛑 Critical HTML elements missing! Check IDs/Classes in your HTML file against the script (including map elements and NEW address fields).");
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
    let layerControl = null; // Holds the Layer control

    // --- DELIVERY ZONE & MAP CONFIG ---
    // ** ADJUST THESE COORDINATES TO ACCURATELY REFLECT New Cairo & Nasr City **
    // These are *very rough* estimates and likely need refinement. Use a tool like bboxfinder.com
    const DELIVERY_ZONE = {
        minLat: 29.97, // Southern boundary
        maxLat: 30.15, // Northern boundary
        minLng: 31.30, // Western boundary
        maxLng: 31.55  // Eastern boundary
    };
    const DEFAULT_MAP_CENTER = [30.05, 31.4]; // Approx center between New Cairo/Nasr City
    const DEFAULT_MAP_ZOOM = 12;
    const LOCATION_FOUND_ZOOM = 17; // Zoom level when location is found/pinned (higher for detail)

    // Define Tile Layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });


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
        // Trigger reflow to ensure animation works
        void notification.offsetWidth;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove(), { once: true });
        }, duration);
        console.log(`Notification [${type}]: ${message}`);
    };


    // --- CORE FUNCTIONS ---

    const updateCartUI = () => {
        // ... (Keep existing updateCartUI function - no changes needed here) ...
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
        // ... (Keep existing addToCart function - no changes needed here) ...
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
        // ... (Keep existing removeFromCart function - no changes needed here) ...
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
        // ... (Keep existing increaseQuantity function - no changes needed here) ...
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            updateCartUI();
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"] .item-quantity`);
            if(itemElement) temporaryClass(itemElement.parentElement.parentElement, 'pulse-quick', 300);
        }
    };

    const decreaseQuantity = (productId) => {
        // ... (Keep existing decreaseQuantity function - no changes needed here) ...
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
        // ... (Keep existing openCart function - no changes needed here) ...
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'cart-open');
        isCartOpen = true;
        console.log("Cart opened.");
    };

    const closeCart = () => {
        // ... (Keep existing closeCart function - no changes needed here) ...
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'cart-open');
        isCartOpen = false;
        console.log("Cart closed.");
    };

    // --- ** NEW/REVISED ** Map Location Update Function with Immediate Zone Check ---
    const updateLocation = (lat, lng, locationName = null) => {
        if (!mapInstance || !markerInstance || !customerLatitudeInput || !customerLongitudeInput || !locationStatus || !mapContainer) return;

        const latLng = L.latLng(lat, lng);

        // Update marker position
        if (!markerInstance.getLatLng() || markerInstance.getLatLng().lat === 0) { // Add marker if it doesn't exist or is at 0,0
            markerInstance.setLatLng(latLng).addTo(mapInstance);
        } else {
            markerInstance.setLatLng(latLng);
        }

        mapInstance.setView(latLng, LOCATION_FOUND_ZOOM); // Center map and zoom in

        // Update hidden fields
        customerLatitudeInput.value = lat.toFixed(6);
        customerLongitudeInput.value = lng.toFixed(6);

        // Check if location is within the delivery zone
        const isInZone = lat >= DELIVERY_ZONE.minLat && lat <= DELIVERY_ZONE.maxLat &&
                         lng >= DELIVERY_ZONE.minLng && lng <= DELIVERY_ZONE.maxLng;

        // Update status message and styling IMMEDIATELY
        let statusText = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        let popupText = `<b>${locationName || 'Selected Location'}</b><br>${statusText}`;

        if (isInZone) {
            locationStatus.textContent = `✅ Location OK (Delivery Zone: New Cairo / Nasr City)`;
            locationStatus.className = 'status-ok'; // Use CSS class for styling
            mapContainer.classList.remove('input-error'); // Remove error border if present
            popupText += '<br><span style="color: green;">✅ Inside Delivery Zone</span>';
            console.log(`Location set (${lat}, ${lng}) - WITHIN zone.`);
        } else {
            locationStatus.textContent = `🚨 OUTSIDE Delivery Zone (New Cairo / Nasr City only)`;
            locationStatus.className = 'status-error';
            mapContainer.classList.add('input-error'); // Add error border to map
            popupText += '<br><span style="color: red;">🚨 OUTSIDE Delivery Zone</span>';
             showNotification("Selected location is outside our delivery area.", "warn", 4000);
            console.warn(`Location set (${lat}, ${lng}) - OUTSIDE zone.`);
        }

        // Update marker popup
        markerInstance.bindPopup(popupText).openPopup();

        // Trigger validation check for the form to update submit button state potentially
        // validateCheckoutForm(); // Reconsider if needed here, might be too aggressive
    };


    // --- Geolocation Function ---
    const findUserLocation = (initialLoad = false) => {
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by this browser.");
            if (!initialLoad) showNotification("Sorry, your browser doesn't support finding your location.", "warn");
            // Map should still center on default if called during init
            if (mapInstance && initialLoad) {
                mapInstance.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
                locationStatus.textContent = 'Geolocation not supported. Please pin manually.';
                locationStatus.className = 'status-pending';
            }
            return;
        }

        if (!initialLoad) showNotification("Finding your location...", "info", 2000);
        if (findMeButton) findMeButton.disabled = true; // Disable button while searching
        locationStatus.textContent = 'Finding location...';
        locationStatus.className = 'status-pending';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`Geolocation success: Lat: ${latitude}, Lng: ${longitude}`);
                updateLocation(latitude, longitude, "Your Current Location"); // This will handle zone check
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
                locationStatus.textContent = message + ' Please pin or search.';
                locationStatus.className = 'status-error';

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


    // --- ** REVISED ** Map Initialization (Includes Satellite Layer, Layer Control, Enhanced Geocoder) ---
    const initializeMap = () => {
        if (!leafletAvailable || !mapContainer) {
             console.error("Leaflet not available or map container missing. Cannot initialize map.");
             if (mapContainer) mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Map library failed to load.</p>';
             return; // Stop if Leaflet isn't loaded
        }

        // Clear previous map instance if exists
        if (mapInstance) {
            console.log("Removing previous map instance.");
            // Remove specific controls first if they exist
            if (layerControl) mapInstance.removeControl(layerControl);
            if (geocoderControl) mapInstance.removeControl(geocoderControl);
            mapInstance.remove();
            mapInstance = null;
            markerInstance = null;
            geocoderControl = null;
            layerControl = null;
        }

        console.log("Initializing Leaflet map with Layers, Geolocation, and Geocoder...");
        mapContainer.querySelector('p')?.remove(); // Remove loading message if exists
        mapContainer.classList.remove('input-error'); // Reset error state visually
        locationStatus.textContent = 'Please pin or search for your location.'; // Reset status message
        locationStatus.className = 'status-pending';


        try {
             // Initialize map centered on default location
             mapInstance = L.map('map-container', {
                 center: DEFAULT_MAP_CENTER,
                 zoom: DEFAULT_MAP_ZOOM,
                 layers: [osmLayer] // Start with the OSM layer active
             });

             // Add Layer Control
             const baseMaps = {
                "Street Map": osmLayer,
                "Satellite View": satelliteLayer
             };
             layerControl = L.control.layers(baseMaps).addTo(mapInstance);
             console.log("✅ Layer control added.");

            // Initialize marker (draggable false, position updated by events)
            // Start marker off the map until a location is set
            markerInstance = L.marker([0, 0], { draggable: false });
            // We won't add the marker initially, updateLocation will add it.

            // --- Add Geocoder Control ---
            if (geocoderAvailable) {
                geocoderControl = L.Control.geocoder({
                    defaultMarkGeocode: false, // We handle the marker via updateLocation
                    placeholder: "Search address (English/Arabic)...",
                    errorMessage: "Nothing found, try again?",
                    geocoder: L.Control.Geocoder.nominatim({
                        geocodingQueryParams: {
                            countrycodes: 'eg', // Prioritize Egypt results
                            "accept-language": 'ar, en', // Hint language preference
                             viewbox: '31.0,29.8,31.8,30.2', // Rough Cairo bounding box
                             bounded: 0 // Set to 1 to strictly search within viewbox (might be too restrictive)
                        }
                    }),
                    position: 'topright',
                    collapsed: false, // Keep expanded
                })
                .on('markgeocode', function(e) {
                    const { center, name } = e.geocode; // center is a L.LatLng object
                    console.log("Geocoder result selected:", name, center);
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
            // Wait a brief moment for map tiles to potentially load before trying geo
            setTimeout(() => findUserLocation(true), 500); // Pass true for initial load context

             console.log("✅ Leaflet map base initialized.");

        } catch (error) {
             console.error("🔥 Failed to initialize Leaflet map:", error);
             mapContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Map Error: ${error.message}</p>`;
             mapInstance = null;
             markerInstance = null;
             geocoderControl = null;
             layerControl = null;
        }
    };

    // --- Checkout Modal ---
    const openCheckout = () => {
        // Check if required elements are present
        const requiredElementsPresent = checkoutModal && checkoutOverlay && bodyElement && checkoutSummary && checkoutTotalPrice && checkoutForm && submitOrderButton && paymentTotalReminders.length > 0 &&
                                     customerNameInput && customerPhoneInput && buildingDetailsInput && floorAptInput && landmarksInput && // Include new fields
                                     (!leafletAvailable || (mapContainer && locationStatus && customerLatitudeInput && customerLongitudeInput && findMeButton)); // Map elements only if Leaflet loaded

        if (!requiredElementsPresent) {
            console.error("Cannot open checkout - required elements missing (check HTML IDs including new address fields and map components).");
            showNotification("Checkout unavailable due to page error.", "error");
            return;
        }

        if (cart.length === 0) {
            showNotification("Add some treats to your cart first!", "warn");
            return;
        }

        console.log("Opening checkout modal (Satellite/Details Flow).");

        // Populate Summary
        let summaryHTML = '<ul>'; // Removed h4, using CSS class now
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

        // Reset Form (including new fields and map state)
        checkoutForm.reset();
        customerLatitudeInput.value = '';
        customerLongitudeInput.value = '';
        if (locationStatus) {
             locationStatus.textContent = 'Please pin or search for your location.';
             locationStatus.className = 'status-pending';
        }
        if (mapContainer) mapContainer.classList.remove('input-error');
        checkoutMessage.textContent = '';
        checkoutMessage.className = 'checkout-message';
        submitOrderButton.disabled = false; // Enable button initially
        submitOrderButton.textContent = 'Confirm Details & Payment Method Used ✅';
        isSubmitting = false;
        if (findMeButton) findMeButton.disabled = false; // Re-enable Find Me button

        // Remove previous validation errors visually
        checkoutForm.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.removeAttribute('aria-invalid');
            }
        });
        if (paymentMethodSelection) paymentMethodSelection.classList.remove('input-error');

        // Show Modal
        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'checkout-open');
        isCheckoutOpen = true;
        if (isCartOpen) closeCart();

        // Initialize or Refresh Map *after* modal is visible and DOM updated
        if (leafletAvailable) {
             setTimeout(() => {
                initializeMap(); // This now includes layer control etc.
                if (customerNameInput) customerNameInput.focus(); // Focus first field
            }, 150); // Slightly longer delay to ensure modal transition completes
        } else {
             console.warn("Map cannot be initialized as Leaflet is not available.");
             if (mapContainer) mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Map library failed to load.</p>';
        }
     };


    const closeCheckout = () => {
        // ... (Keep existing closeCheckout function logic, but ensure map cleanup) ...
        if (!checkoutModal || !checkoutOverlay || !bodyElement) return;
        console.log("Closing checkout modal.");
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'checkout-open');
        isCheckoutOpen = false;

        // Destroy map instance and controls thoroughly
        if (mapInstance) {
            console.log("Destroying map instance and controls.");
            if (layerControl) mapInstance.removeControl(layerControl);
            if (geocoderControl) mapInstance.removeControl(geocoderControl);
            mapInstance.remove(); // Removes map container content and listeners
            mapInstance = null;
            markerInstance = null;
            geocoderControl = null;
            layerControl = null;
        }

        // Reset button state
        if (submitOrderButton) {
             submitOrderButton.disabled = false;
             submitOrderButton.textContent = 'Confirm Details & Payment Method Used ✅';
        }
        isSubmitting = false;
    };


    // --- Render Products ---
    const renderProducts = () => {
        // ... (Keep existing renderProducts function - no changes needed here) ...
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
         // ... (Keep existing fetchProducts function - no changes needed here) ...
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

     // --- ** REVISED ** Validation ---
     const validateCheckoutForm = () => {
         // Check required elements are present before validating
         const elementsPresent = checkoutForm && customerNameInput && customerPhoneInput && paymentMethodSelection &&
                              buildingDetailsInput && floorAptInput && landmarksInput && // Include new fields
                              (!leafletAvailable || (mapContainer && locationStatus && customerLatitudeInput && customerLongitudeInput)); // Map elements only if Leaflet loaded

        if (!elementsPresent) {
             console.error("Checkout form validation skipped: Required elements missing.");
             showNotification("Checkout form error. Please contact support.", "error");
             return false;
        }

         let isValid = true;
         let firstInvalidField = null;
         console.log("Validating checkout form (Satellite/Details Flow)...");

         // Helper to apply error state
         const applyError = (element, isGroup = false, isMap = false) => {
             const elementToStyle = isMap ? mapContainer : (isGroup ? paymentMethodSelection : element);
             if (!elementToStyle) return;
             elementToStyle.classList.add('input-error');
             temporaryClass(elementToStyle, 'shake-subtle', 500);
             if (!isGroup && !isMap && element) element.setAttribute('aria-invalid', 'true');
             if (!firstInvalidField) {
                 firstInvalidField = element || elementToStyle; // Prioritize the input element itself
             }
         };

         // Helper to remove error state
         const removeError = (element, isGroup = false, isMap = false) => {
             const elementToStyle = isMap ? mapContainer : (isGroup ? paymentMethodSelection : element);
             if (!elementToStyle) return;
             elementToStyle.classList.remove('input-error');
             if (!isGroup && !isMap && element) element.removeAttribute('aria-invalid');
         };

         // Reset previous errors visually
         checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
         [customerNameInput, customerPhoneInput, buildingDetailsInput, floorAptInput, landmarksInput].forEach(el => {
            if (el) el.removeAttribute('aria-invalid');
         });
         removeError(null, true, false); // Reset radio group error state
         removeError(null, false, true); // Reset map container error state


         // == Field Validations ==

         // 1. Name
         if (customerNameInput.value.trim().length < 2) {
             isValid = false; applyError(customerNameInput); console.warn("Validation Fail: Name");
         } else { removeError(customerNameInput); }

         // 2. Phone
         if (!customerPhoneInput.checkValidity() || customerPhoneInput.value.trim() === '') {
             isValid = false; applyError(customerPhoneInput); console.warn("Validation Fail: Phone number invalid or missing.");
         } else { removeError(customerPhoneInput); }

         // 3. Location Pinned & Zone Check (Final Check)
         if (leafletAvailable) {
             const lat = parseFloat(customerLatitudeInput.value);
             const lng = parseFloat(customerLongitudeInput.value);

             if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                 // Location not set
                 isValid = false;
                 applyError(null, false, true); // Apply error to map container
                 if (locationStatus && !locationStatus.classList.contains('status-error')) { // Update status only if not already showing error
                     locationStatus.textContent = '🚨 Please pin or search for your location!';
                     locationStatus.className = 'status-error';
                 }
                 console.warn("Validation Fail: Location not set.");
             } else {
                 // Location is set, double-check zone status
                 const isInZone = lat >= DELIVERY_ZONE.minLat && lat <= DELIVERY_ZONE.maxLat &&
                                  lng >= DELIVERY_ZONE.minLng && lng <= DELIVERY_ZONE.maxLng;
                 if (!isInZone) {
                     // Location is set BUT outside zone
                     isValid = false;
                     applyError(null, false, true);
                     if (locationStatus && !locationStatus.textContent.includes('OUTSIDE')) { // Update status only if not already showing error
                        locationStatus.textContent = `🚨 OUTSIDE Delivery Zone (New Cairo / Nasr City only)`;
                        locationStatus.className = 'status-error';
                     }
                     console.warn(`Validation Fail: Location (${lat}, ${lng}) is OUTSIDE delivery zone.`);
                     // No need for showNotification here as updateLocation already did it
                 } else {
                     // Location is set AND inside zone - OK
                     removeError(null, false, true);
                     if (locationStatus && !locationStatus.textContent.includes('OK')) { // Update status if needed
                         locationStatus.textContent = `✅ Location OK (Delivery Zone: New Cairo / Nasr City)`;
                         locationStatus.className = 'status-ok';
                     }
                     console.log("Location validation passed: Set and within zone.");
                 }
             }
         } else {
            console.log("Skipping map validation as Leaflet is unavailable.");
            // If map becomes MANDATORY, you would set isValid = false here if leafletAvailable is false.
         }

        // 4. Address Details (Optional for now, add .required in HTML if needed)
        // Example if building details were required:
        // if (buildingDetailsInput.required && buildingDetailsInput.value.trim() === '') {
        //    isValid = false; applyError(buildingDetailsInput); console.warn("Validation Fail: Building details required.");
        // } else { removeError(buildingDetailsInput); }
        // For now, we just remove any potential error styling if they were styled before
         removeError(buildingDetailsInput);
         removeError(floorAptInput);
         removeError(landmarksInput);

         // 5. Payment Method Selection
         const selectedPaymentMethod = checkoutForm.querySelector('input[name="payment_method"]:checked');
         if (!selectedPaymentMethod) {
             isValid = false;
             applyError(null, true, false); // Style the payment group container
             console.warn("Validation Fail: Payment method not selected.");
             // Set focus target for payment method radios
             if (!firstInvalidField) firstInvalidField = paymentMethodSelection?.querySelector('input[type="radio"]');
         } else {
             removeError(null, true, false); // Remove container style
         }


         // --- Final Validation Check & Feedback ---
         if (!isValid) {
             console.error("Checkout validation failed.");
             showNotification("Please check the highlighted details!", 'warn', 3000);

             if (firstInvalidField) {
                 // Scroll to the first invalid field
                 setTimeout(() => {
                    // Check if it's the map container or a radio button for special handling
                     if (firstInvalidField === mapContainer || firstInvalidField.type === 'radio' || firstInvalidField.classList.contains('payment-method-selection')) {
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Add a temporary visual cue for map/radio group
                        if(firstInvalidField === mapContainer) temporaryClass(mapContainer, 'focus-highlight', 1000);
                        else if (paymentMethodSelection) temporaryClass(paymentMethodSelection, 'focus-highlight', 1000);
                     } else if (firstInvalidField.focus) {
                        // For standard inputs, focus and then scroll
                        firstInvalidField.focus({ preventScroll: true }); // Focus without jarring scroll
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Then smooth scroll
                     } else {
                        // Fallback for elements without focus method
                         firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                     }
                 }, 100); // Delay allows DOM updates to settle

                 // Shake the modal
                 if (checkoutModal) {
                     temporaryClass(checkoutModal, 'shake-error', 400);
                 }
             }
         } else {
             console.log("✅ Checkout validation passed.");
         }
         return isValid;
     };


    // --- ** REVISED ** Checkout Handler (Includes New Address Fields) ---
      const handleCheckout = async (event) => {
           event.preventDefault();
           console.log("handleCheckout initiated (Satellite/Details Flow).");

           // Prerequisites check
           const baseElementsOk = supabase && checkoutForm && submitOrderButton && checkoutMessage;
           const mapCheckOk = !leafletAvailable || (customerLatitudeInput && customerLongitudeInput); // Map inputs needed only if Leaflet should be available
           // ** NEW ** Check new address fields exist
           const addressFieldsOk = buildingDetailsInput && floorAptInput && landmarksInput;

           if (!baseElementsOk || !mapCheckOk || !addressFieldsOk) {
                console.error("Checkout prerequisites missing (Supabase, Form, Buttons, Message, Map Inputs if applicable, or Address Fields).");
                showNotification("Checkout system error. Please refresh or contact support.", "error");
                return;
           }
           if (isSubmitting) { console.warn("Submission already in progress."); return; }
           if (cart.length === 0) { showNotification("Your cart is empty!", "warn"); return; }

           // Frontend Validation (this now checks zone again as final step)
           if (!validateCheckoutForm()) return;

           // Start Submission Process
           isSubmitting = true;
           submitOrderButton.disabled = true;
           submitOrderButton.textContent = 'Saving Order... ⏳';
           checkoutMessage.textContent = '';
           checkoutMessage.className = 'checkout-message';

           // Gather Data
           const formData = new FormData(checkoutForm);
           const customerData = {
               customer_name: formData.get('customer_name')?.trim() || 'N/A',
               customer_phone: formData.get('customer_phone')?.trim() || 'N/A',
               payment_method: formData.get('payment_method') || 'Not Selected',
               latitude: leafletAvailable ? parseFloat(customerLatitudeInput.value) : null,
               longitude: leafletAvailable ? parseFloat(customerLongitudeInput.value) : null,
               // ** NEW ** Get address details (use empty string if null/undefined)
               building_details: formData.get('building_details')?.trim() ?? '',
               floor_apt: formData.get('floor_apt')?.trim() ?? '',
               landmarks: formData.get('landmarks')?.trim() ?? ''
           };

            // Final coordinate check if map was supposed to be available
           if (leafletAvailable && (isNaN(customerData.latitude) || isNaN(customerData.longitude) || customerData.latitude === 0 || customerData.longitude === 0)) {
                console.error("Invalid coordinate data just before sending to backend.");
                showNotification("Error with location data. Please re-select your location.", "error");
                isSubmitting = false;
                submitOrderButton.disabled = false;
                submitOrderButton.textContent = 'Try Again? Location Error';
                applyError(null, false, true); // Highlight map visually
                return;
           }

           // Prepare Order Items and Total Price
           const orderItems = cart.map(item => {
               const product = products.find(p => p.id === item.id);
               return {
                   product_id: item.id, quantity: item.quantity,
                   name_at_purchase: product ? product.name : 'Unknown',
                   price_at_purchase: (product && typeof product.price === 'number') ? product.price : 0
               };
           }).filter(item => item.price_at_purchase > 0); // Filter out items with zero price just in case

           if (orderItems.length !== cart.length) {
                console.warn("Some cart items had zero price and were filtered out before saving.");
           }
            if (orderItems.length === 0 && cart.length > 0) {
                console.error("Order has no valid items to save after filtering.");
                 showNotification("Error processing cart items. Please try again.", "error");
                 isSubmitting = false;
                 submitOrderButton.disabled = false;
                 submitOrderButton.textContent = 'Try Again? Cart Error';
                 return;
            }

           const calculatedTotalPrice = orderItems.reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0);

           // Prepare Payload for Supabase
           // !! ENSURE your 'orders' table has columns: building_details (text), floor_apt (text), landmarks (text) - make them nullable !!
           const orderPayload = {
               customer_name: customerData.customer_name,
               customer_phone: customerData.customer_phone,
               latitude: customerData.latitude,
               longitude: customerData.longitude,
               // ** NEW ** Add address details
               building_details: customerData.building_details,
               floor_apt: customerData.floor_apt,
               landmarks: customerData.landmarks,
               // ------------------------
               payment_method: customerData.payment_method,
               order_items: orderItems, // Supabase expects JSONB for this typically
               total_price: calculatedTotalPrice,
               status: 'Pending Payment Confirmation' // Initial status
           };

           console.log("Attempting to insert order:", JSON.stringify(orderPayload, null, 2)); // Pretty print payload

           // Insert into Supabase
           try {
               const { data, error } = await supabase.from('orders').insert([orderPayload]).select(); // .select() returns the inserted row

               if (error) {
                   // Log detailed Supabase error
                   console.error('Supabase Insert Error:', error);
                   throw new Error(`Database Error: ${error.message} (Code: ${error.code}) Hint: ${error.hint}`);
               }

               console.log("✅ Order successfully logged:", data);

               // Success Actions
               let successMsg = `🎉 Order Logged! Please complete payment via ${customerData.payment_method}. We'll confirm & process once received. Thanks!`;
                // Optionally add location back to message if needed
               // if(customerData.latitude) { successMsg = `🎉 Order Logged! Location: ${customerData.latitude.toFixed(4)}, ${customerData.longitude.toFixed(4)}. Please pay via ${customerData.payment_method}. Thanks!`; }
               checkoutMessage.textContent = successMsg;
               checkoutMessage.className = 'checkout-message success animate-fade-in';

               showNotification("Order details sent! Awaiting payment confirmation.", 'success', 5000);
               cart = []; // Clear cart
               updateCartUI(); // Update UI (cart count etc.)
               setTimeout(closeCheckout, 4000); // Close modal after a delay

           } catch (error) {
               console.error("🔥 Order logging FAILED:", error);
               // Display a user-friendly message, potentially masking technical details
               let userErrorMessage = `😭 Oops! Couldn't save order details. Please try again or contact us.`;
                // Add more specific error feedback if possible/safe
               if (error.message.includes("violates row-level security policy")) {
                    userErrorMessage += " (Security policy issue)"; // Example for RLS
               } else if (error.message.includes("check constraint")) {
                   userErrorMessage += " (Invalid data format)"; // Example for constraints
               }
                // Avoid showing the full raw error message to the user unless necessary for debugging
               // userErrorMessage += ` Error: ${error.message}`;

               checkoutMessage.textContent = userErrorMessage;
               checkoutMessage.className = 'checkout-message error animate-fade-in';
               showNotification(`Order logging failed. ${error.message}`, 'error', 6000); // Show detailed error in notification for longer

               // Re-enable form for retry
               isSubmitting = false;
               submitOrderButton.disabled = false;
               submitOrderButton.textContent = 'Try Confirming Again?';
           }
       }; // --- END OF handleCheckout ---


    // --- EVENT LISTENERS SETUP ---
     const setupEventListeners = () => {
         // Check essential elements required for listeners
         const listenerElementsPresent = cartButton && closeCartButton && cartOverlay && checkoutButton && closeCheckoutButton && checkoutOverlay && checkoutForm && cartItemsContainer && productGrid && checkoutModal &&
                                        (findMeButton || !leafletAvailable); // findMeButton only needed if Leaflet available

         if (!listenerElementsPresent) {
            console.error("Cannot setup all event listeners - crucial interactive elements missing!");
            showNotification("Page setup error. Some buttons might not work.", "error");
            return; // Don't proceed if core interactive elements are missing
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
            // Close only if clicking the overlay itself, not the modal content
            if (event.target === checkoutOverlay) closeCheckout();
        });

        // Form Submission
        checkoutForm.addEventListener('submit', handleCheckout);

        // Cart Item Actions (Delegated to container)
        cartItemsContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.action-button');
            if (!targetButton) return;
            const productId = targetButton.dataset.id;
            if (!productId) return;
            temporaryClass(targetButton, 'button-clicked', 200); // Visual feedback
             if (targetButton.classList.contains('increase-quantity')) increaseQuantity(productId);
             else if (targetButton.classList.contains('decrease-quantity')) decreaseQuantity(productId);
             else if (targetButton.classList.contains('remove-item')) removeFromCart(productId);
        });

        // Add to Cart Buttons (Delegated to grid)
        productGrid.addEventListener('click', (event) => {
             const button = event.target.closest('.add-to-cart-btn');
             if (button) {
                event.preventDefault(); // Prevent any default link behavior if it were an <a>
                const productId = button.dataset.id;
                 if (productId) addToCart(productId, button); // Pass button for visual feedback
                 else console.warn("Add button missing data-id!");
             }
         });

         // "Find Me" Button Listener (Only add if Leaflet and button exist)
         if (leafletAvailable && findMeButton) {
             findMeButton.addEventListener('click', () => {
                console.log("Find Me button clicked.");
                if (!mapInstance) {
                    console.warn("Map not initialized yet, cannot find location.");
                    showNotification("Please wait for the map to load.", "warn");
                    return;
                }
                findUserLocation(false); // Pass false, it's not the initial load
             });
             console.log("✅ 'Find Me' button listener attached.");
         } else if (!leafletAvailable && findMeButton) {
            findMeButton.disabled = true; // Disable if map library failed
            findMeButton.title = "Map library failed to load";
            console.warn("'Find Me' button disabled as Leaflet is unavailable.");
         }

        // Copy Buttons Listener (Delegated to Modal)
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
            if (!textToCopy) {
                 showNotification("Nothing to copy.", "info");
                 return;
            }

            try {
                await navigator.clipboard.writeText(textToCopy);
                console.log(`Copied: ${textToCopy}`);
                const originalText = copyButton.innerHTML; // Store original content (might be icon + text)
                copyButton.innerHTML = '✅ Copied!';
                copyButton.classList.add('copied');
                temporaryClass(copyButton, 'pulse-quick', 300); // Add feedback
                showNotification(`Copied: ${textToCopy}`, 'success', 2000);

                // Restore button text after delay
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy using navigator.clipboard: ', err);
                showNotification('Failed to copy automatically. Please copy manually.', 'error');
                // Fallback: Try to select the text for manual copying
                try {
                    const range = document.createRange();
                    range.selectNodeContents(targetElement);
                    const selection = window.getSelection();
                    selection.removeAllRanges(); // Clear previous selection
                    selection.addRange(range); // Select the text
                } catch (selectErr) {
                    console.error("Fallback text selection failed:", selectErr);
                    /* Ignore fallback error - user needs to manually select */
                }
            }
        });
        console.log("✅ Copy button listener attached (delegated).");

        console.log("✅ All Event listeners setup complete.");
     };

    // --- PAGE INITIALIZATION ---
    const initializePage = () => {
        console.log("----- Initializing Vibe Treats Page (v_SatelliteAndDetails) -----");
         try {
             // Load Cart from Local Storage
             const storedCart = localStorage.getItem('vibeTreatsCart');
             if (storedCart) {
                 try {
                     const parsedCart = JSON.parse(storedCart);
                     // Basic validation of stored cart structure
                     if (Array.isArray(parsedCart) && parsedCart.every(item => typeof item.id === 'string' && typeof item.quantity === 'number' && item.quantity > 0)) {
                         cart = parsedCart;
                         console.log("Loaded cart from localStorage:", cart.length, "items");
                     } else {
                         console.warn("Invalid cart data found in localStorage. Resetting cart.");
                         localStorage.removeItem('vibeTreatsCart');
                         cart = []; // Ensure cart is empty array
                     }
                 } catch (e) {
                     console.error("Failed to parse cart from localStorage. Resetting.", e);
                     localStorage.removeItem('vibeTreatsCart');
                     cart = []; // Ensure cart is empty array
                 }
            } else {
                 cart = []; // Ensure cart is empty if nothing in storage
            }

            // Set Footer Year
             if (yearSpan) {
                 yearSpan.textContent = new Date().getFullYear();
             } else {
                 console.warn("Footer year span #year not found.");
             }

             // Setup Core Functionality
             setupEventListeners(); // Attach listeners to existing DOM elements
             fetchProducts(); // Fetch product data and render (this updates cart UI indirectly)

            console.log("----- Page Initialized ----- (Async product fetch running)");

        } catch (error) {
            console.error("☠️ FATAL ERROR during page initialization:", error);
             alert("A critical error occurred while loading the page. Please try refreshing.");
             // Attempt to display an error message on the page itself
             if(bodyElement) {
                 bodyElement.innerHTML = `<div style="padding: 40px; text-align: center; color: #FF3399; background-color: #fff0f5;">
                                            <h1 style="margin-bottom: 15px;">CRITICAL PAGE LOAD ERROR</h1>
                                            <p>Something went wrong while setting up the page.</p>
                                            <p>Please try refreshing. If the problem persists, contact support.</p>
                                            <p style="margin-top: 20px; font-size: 0.8em; color: #666;">Error details: ${error.message}</p>
                                          </div>`;
            }
        }
     };

    // --- Engage! ---
    initializePage();

}); // === END OF DOMCONTENTLOADED ===
