// --- VIBE TREATS SCRIPT - CONSOLIDATED & COMPLETE ---
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
        // Ensure Supabase client library is loaded (usually via CDN in HTML)
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
    const checkoutButton = document.getElementById('checkout-button');
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutOverlay = document.getElementById('checkout-overlay');
    const closeCheckoutButton = document.getElementById('close-checkout-button');
    const checkoutForm = document.getElementById('checkout-form');
    const customerNameInput = document.getElementById('customer_name');
    const customerAddressInput = document.getElementById('customer_address');
    const customerPhoneInput = document.getElementById('customer_phone');
    const customerEmailInput = document.getElementById('customer_email'); // Assuming you have this ID in HTML
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const submitOrderButton = document.getElementById('submit-order-button');
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingIndicator = document.getElementById('loading-indicator');
    const bodyElement = document.body; // Cache body element for class toggles

    // Check if crucial elements were found
    if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !checkoutModal || !checkoutOverlay || !checkoutForm || !cartItemsContainer || !cartTotalPrice || !cartCount || !checkoutButton || !submitOrderButton) {
         console.error("🛑 Critical HTML elements missing! Check IDs in your HTML file against the script:", {
            productGrid: !!productGrid, cartButton: !!cartButton, cartSidebar: !!cartSidebar,
             cartOverlay: !!cartOverlay, checkoutModal: !!checkoutModal, checkoutOverlay: !!checkoutOverlay, checkoutForm: !!checkoutForm,
             cartItemsContainer: !!cartItemsContainer, cartTotalPrice: !!cartTotalPrice, cartCount: !!cartCount, checkoutButton: !!checkoutButton, submitOrderButton: !!submitOrderButton
        });
         alert("Woops! Some essential parts of the page (like the product grid, cart display, or checkout form) are missing in the HTML. Can't run properly.");
         // Optionally display an error message on the page itself
         if (bodyElement) bodyElement.innerHTML = '<h1 style="color: red; text-align: center; padding: 50px;">CRITICAL LAYOUT ERROR: Page elements missing.</h1>';
         return; // Stop if layout is fundamentally broken
     }
    console.log("✅ HTML elements found.");

    // --- STATE MANAGEMENT ---
    let cart = []; // Initialize empty, then load from localStorage
    let products = []; // Stores products fetched from Supabase
    let isCartOpen = false;
    let isCheckoutOpen = false;
    let isSubmitting = false; // Flag to prevent double order submission

    // --- UTILITY FUNCTIONS ---

    /**
     * Formats a number as LE currency.
     * @param {number} amount - The amount to format.
     * @returns {string} Formatted currency string (e.g., "LE 15.00").
     */
    const formatCurrency = (amount) => {
        // Ensure amount is a number, default to 0 if not
        const numericAmount = typeof amount === 'number' ? amount : 0;
        return `LE ${numericAmount.toFixed(2)}`;
    };

    /**
     * Temporarily adds a CSS class to an element for visual feedback.
     * @param {HTMLElement} element - The DOM element.
     * @param {string} className - The CSS class to add and remove.
     * @param {number} [duration=500] - How long the class should stay (in ms).
     */
    const temporaryClass = (element, className, duration = 500) => {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    };

    /**
     * Displays a dismissible notification message at the bottom of the screen.
     * @param {string} message - The message to display.
     * @param {'info' | 'success' | 'warn' | 'error'} [type='info'] - Type of notification for styling.
     * @param {number} [duration=3000] - How long the notification stays visible (in ms).
     */
    const showNotification = (message, type = 'info', duration = 3000) => {
        // Remove existing notification first
        const existingNotification = document.getElementById('site-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.id = 'site-notification'; // Use ID for easy removal
        notification.className = `notification notification-${type}`; // Base class + type class
        notification.textContent = message;

        document.body.appendChild(notification);

        // Trigger reflow to enable animation
        notification.offsetHeight;

        // Add 'show' class to animate in
        notification.classList.add('show');

        // Set timeout to remove the notification
        setTimeout(() => {
            notification.classList.remove('show');
            // Remove element after fade out animation completes
            notification.addEventListener('transitionend', () => notification.remove(), { once: true });
        }, duration);

        console.log(`Notification [${type}]: ${message}`);
    };


    // --- CORE FUNCTIONS ---

    /**
     * Updates the cart sidebar UI (items, total price, item count).
     * Saves the cart state to localStorage.
     * Enables/disables the checkout button based on cart content.
     */
    const updateCartUI = () => {
        // Guard clauses for missing elements (already checked above, but good practice)
        if (!cartItemsContainer || !cartTotalPrice || !cartCount || !checkoutButton) {
            console.error("Cannot update Cart UI - required elements missing.");
            return;
        }
        console.log("Updating Cart UI. Current cart:", JSON.stringify(cart));

        cartItemsContainer.innerHTML = ''; // Clear previous items
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-empty-message fade-in">Your stash is empty. Add some vibes!</p>';
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);

                // Robust check for product data needed to display the item
                if (!product || typeof product.price !== 'number' || !product.name || !product.image_url) {
                    console.warn(`Cart render: Data missing or invalid for ID: ${item.id}. Skipping item. Product Data:`, product);
                    // Optionally display an error placeholder in the cart for this item
                    const errorElement = document.createElement('div');
                    errorElement.classList.add('cart-item', 'error-message');
                    errorElement.innerHTML = `<p>Error loading item details (ID: ${item.id || 'Unknown'})</p>`;
                    cartItemsContainer.appendChild(errorElement);
                    // Potentially remove the faulty item from the cart automatically here if desired
                    // cart = cart.filter(cartItem => cartItem.id !== item.id);
                    return; // Skip this item
                }

                // Create cart item element
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item', 'animate-item-enter'); // Add animation class
                itemElement.dataset.itemId = item.id; // Use data-item-id for clarity

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

                // Remove animation class after a short delay
                setTimeout(() => itemElement.classList.remove('animate-item-enter'), 300);
            });
        }

        cartTotalPrice.textContent = formatCurrency(total);
        cartCount.textContent = itemCount;
        cartButton.classList.toggle('has-items', itemCount > 0); // Toggle class for visual cue

        // Save updated cart to localStorage
        try {
             localStorage.setItem('vibeTreatsCart', JSON.stringify(cart));
        } catch (e) {
            console.error("Failed to save cart to localStorage:", e);
             showNotification("Could not save cart changes.", "error");
        }

        // Enable/disable checkout button and update its text
        checkoutButton.disabled = cart.length === 0;
        checkoutButton.textContent = cart.length === 0 ? 'Cart is Empty' : 'Checkout Time!';
        console.log(`Cart UI updated: ${itemCount} items, Total: ${formatCurrency(total)}`);
    };

    // --- Cart Actions ---

     /**
     * Adds a product to the cart or increases its quantity if already present.
     * @param {string} productId - The ID of the product to add.
     * @param {HTMLElement} [buttonElement] - Optional button element for visual feedback.
     */
     const addToCart = (productId, buttonElement) => {
        console.log(`Attempting to add product ID: ${productId}`);
         // Find the product details from the locally stored 'products' array
         const product = products.find(p => p.id === productId);

         if (!product) {
             console.error(`addToCart Error: Product with ID ${productId} not found in the 'products' array. Cannot add to cart.`);
             showNotification("Error: Couldn't find that specific treat.", 'error');
            return;
        }
        console.log(`Product found: ${product.name}`);

         // Find item in cart
        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity++;
             showNotification(`+1 ${product.name}! Good choice.`, 'info');
        } else {
            cart.push({ id: productId, quantity: 1 });
            showNotification(`Added ${product.name} to your stash!`, 'success');
        }

          // Visual Feedback
          if(buttonElement) temporaryClass(buttonElement, 'button-adding', 400);
         temporaryClass(cartCount, 'pulse-quick', 500); // Pulse the cart count
         if (cartButton) temporaryClass(cartButton, 'shake-subtle', 500); // Jiggle the cart icon

        updateCartUI(); // Update display and save to localStorage

        // Optionally open the cart sidebar
        if (!isCartOpen) {
            openCart();
        }
    };

     /**
     * Removes an item completely from the cart.
     * @param {string} productId - The ID of the product to remove.
     */
    const removeFromCart = (productId) => {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex === -1) {
            console.warn(`removeFromCart: Item with ID ${productId} not found in cart.`);
            return;
        }

        const productName = products.find(p => p.id === productId)?.name || 'Item'; // Get name for notification

        // Find the corresponding DOM element *before* removing from cart array for animation
        const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"]`);

        // Remove item from cart array
        cart = cart.filter(item => item.id !== productId);
        console.log(`Removed item ID: ${productId}`);
        showNotification(`Removed ${productName} from stash.`, 'info');

        // Animate removal
        if (itemElement) {
            itemElement.classList.add('animate-item-exit');
            itemElement.addEventListener('animationend', () => {
                 // Update UI *after* animation completes for smoother visual
                 updateCartUI();
            }, { once: true });
        } else {
            // If element not found (shouldn't happen normally), update UI immediately
            updateCartUI();
        }
    };

    /**
     * Increases the quantity of an item in the cart.
     * @param {string} productId - The ID of the product.
     */
     const increaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            console.log(`Increased quantity for ID: ${productId} to ${item.quantity}`);
            updateCartUI();
            // Optional: Add subtle feedback to the specific item row
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"] .item-quantity`);
            if(itemElement) temporaryClass(itemElement.parentElement.parentElement, 'pulse-quick', 300); // Pulse the whole row slightly
        } else {
            console.warn(`increaseQuantity: Item with ID ${productId} not found.`);
        }
    };

    /**
     * Decreases the quantity of an item in the cart. Removes if quantity reaches 0.
     * @param {string} productId - The ID of the product.
     */
     const decreaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity--;
            console.log(`Decreased quantity for ID: ${productId} to ${item.quantity}`);
            if (item.quantity <= 0) {
                console.log(`Quantity is 0, removing item ID: ${productId}`);
                removeFromCart(productId); // Call remove function for animation & notification
            } else {
                updateCartUI();
                 // Optional: Add subtle feedback
                 const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-item-id="${productId}"] .item-quantity`);
                 if(itemElement) temporaryClass(itemElement.parentElement.parentElement, 'pulse-quick', 300);
            }
        } else {
            console.warn(`decreaseQuantity: Item with ID ${productId} not found.`);
        }
    };

    // --- Sidebar/Modal Toggles ---

    /** Opens the cart sidebar and overlay. */
    const openCart = () => {
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        console.log("Opening cart sidebar.");
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'cart-open'); // Add body classes for potential global styling
        isCartOpen = true;
    };

    /** Closes the cart sidebar and overlay. */
    const closeCart = () => {
        if (!cartSidebar || !cartOverlay || !bodyElement) return;
        console.log("Closing cart sidebar.");
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'cart-open');
        isCartOpen = false;
    };

    /** Opens the checkout modal and overlay, populates summary. */
    const openCheckout = () => {
        if (cart.length === 0) {
            showNotification("Add some treats to your cart first!", "warn");
            return;
        }
        if (!checkoutModal || !checkoutOverlay || !bodyElement || !checkoutSummary || !checkoutTotalPrice || !checkoutForm) return;

        console.log("Opening checkout modal.");

        // Populate Checkout Summary
        let summaryHTML = '<h4>Order Summary:</h4><ul>';
        let total = 0;
        cart.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product && typeof product.price === 'number') {
                 // Ensure product data is valid before adding to summary
                summaryHTML += `<li>${item.quantity} x ${product.name} (${formatCurrency(product.price)} each)</li>`;
                total += product.price * item.quantity;
            } else {
                 // Handle case where product details might be missing (though updateCartUI should prevent this in cart)
                summaryHTML += `<li class="error-message">Error processing item ID: ${item.id}</li>`;
                console.warn(`Checkout Summary: Missing product data for ID ${item.id}`);
            }
        });
        summaryHTML += '</ul>';
        checkoutSummary.innerHTML = summaryHTML;
        checkoutTotalPrice.textContent = formatCurrency(total);

        // Reset form state and messages from previous attempts
        checkoutForm.reset();
        if(checkoutMessage) checkoutMessage.textContent = '';
        if(checkoutMessage) checkoutMessage.className = 'checkout-message'; // Reset classes
        if(submitOrderButton) submitOrderButton.disabled = false;
        if(submitOrderButton) submitOrderButton.textContent = 'Confirm Order & Send Vibes 💸';
        isSubmitting = false; // Ensure submitting flag is reset

         // Clear previous validation errors visually
        checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));


        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'checkout-open');
        isCheckoutOpen = true;
        if (isCartOpen) closeCart(); // Close cart if it's open
    };

    /** Closes the checkout modal and overlay. */
    const closeCheckout = () => {
        if (!checkoutModal || !checkoutOverlay || !bodyElement) return;
        console.log("Closing checkout modal.");
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'checkout-open');
        isCheckoutOpen = false;

        // Reset button state in case it was left disabled by an error/submission
        if (submitOrderButton) submitOrderButton.disabled = false;
        if (submitOrderButton) submitOrderButton.textContent = 'Confirm Order & Send Vibes 💸';
        isSubmitting = false; // Reset submission flag
    };

    // --- Render Products ---
    /** Fetches products from Supabase and renders them in the product grid. */
    const renderProducts = () => {
        if (!productGrid) {
            console.error("renderProducts: productGrid element not found! Cannot render.");
            return;
         }
        console.log(`Rendering ${products.length} products.`);

        if(loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading indicator
        productGrid.innerHTML = ''; // Clear grid before rendering

        if (products.length === 0) {
            // Check if this was due to an error during fetch (fetchProducts would have set a message)
            // If not, it means fetch was successful but returned no data
            if (!productGrid.querySelector('.error-message')) {
                 productGrid.innerHTML = '<p class="empty-message fade-in">Looks like the treat shelf is empty right now. Maybe check back later?</p>';
            }
            return;
        }

        // Create and append product cards
        products.forEach((product, index) => {
             // *More Robust Check for essential product data*
             if (!product || typeof product.id !== 'string' || !product.name || typeof product.price !== 'number' || !product.image_url) {
                 console.warn("Skipping product render due to INCOMPLETE or INVALID data:", product);
                 // Optionally render a placeholder error card
                 const errorCard = document.createElement('article');
                 errorCard.classList.add('product-card', 'error-card');
                 errorCard.innerHTML = `<div class="product-details"><h3 class="product-name">Loading Error</h3><p>Couldn't load details for one treat.</p></div>`;
                 productGrid.appendChild(errorCard);
                 return; // Skip this product
             }

            // Create the card element
            const card = document.createElement('article');
            card.classList.add('product-card', 'animate-card-enter'); // Add animation class
             // Stagger animation start time
             card.style.setProperty('--animation-delay', `${index * 0.05}s`);

             const priceFormatted = formatCurrency(product.price);

            // Populate card HTML
            card.innerHTML = `
                <div class="product-image-container">
                     <img src="${product.image_url}"
                          alt="${product.name}"
                          class="product-main-image"
                          loading="lazy"
                          onerror="this.onerror=null; this.src='fallback-cookie.png'; this.alt='Image failed to load for ${product.name}'; console.warn('Image failed to load: ${product.image_url}')">
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

            // Remove animation class after animation likely completes
             setTimeout(() => card.classList.remove('animate-card-enter'), 600 + (index * 50));
        });
        console.log("Product rendering complete.");
    };

    // --- Fetch Products ---
     /** Fetches product data from the Supabase 'products' table. */
     const fetchProducts = async () => {
         if (!productGrid) {
            console.error("Cannot fetch products, productGrid element missing.");
            return;
        }
         if (!supabase) {
            console.error("Supabase client not initialized. Cannot fetch products.");
            productGrid.innerHTML = '<p class="error-message">Connection error. Cannot load treats.</p>';
            return;
         }

         if (loadingIndicator) loadingIndicator.style.display = 'block';
         productGrid.innerHTML = ''; // Clear grid while loading
         console.log("🚀 Initiating Product Fetch...");

         try {
             // Select only the columns needed for display and cart functionality
             let { data, error, status } = await supabase
                 .from('products')
                 .select('id, name, description, price, image_url, created_at') // Explicitly select needed columns
                 .order('created_at', { ascending: true }); // Or order by name, price, etc.

             if (error) {
                 console.error(`🔥 Supabase fetch error! Status: ${status}`, error);
                // Throw a more specific error to be caught below
                throw new Error(`Database Error (${status}): ${error.message}`);
             }

             if (data) {
                console.log(`✅ Fetch SUCCESS! Found ${data.length} products.`);
                 // Optional: Log fetched data only in development/debug mode
                 // console.log("Fetched Data:", data);
                 products = data; // Store the fetched products globally
             } else {
                 console.warn("🤔 Fetch completed, but no data received (database might be empty or filtered).");
                 products = []; // Ensure products array is empty
             }

         } catch (error) {
            console.error('🔥 PRODUCT FETCH FAILED (Catch Block):', error);
             products = []; // Clear products state on error
             if (loadingIndicator) loadingIndicator.style.display = 'none';
             // Display a user-friendly error message directly in the product grid area
            productGrid.innerHTML = `<p class="error-message">Could not load treats! The server might be napping 😴.<br><small>Error: ${error.message}</small></p>`;
             // No need to call renderProducts here, the error message is the content now

         } finally {
             // Render products (will show products, empty message, or error message set above)
             renderProducts();
            // Update cart UI AFTER products (and their prices) are loaded/confirmed empty
            // This ensures cart calculations use the latest prices.
            updateCartUI();
             console.log("Product fetch sequence complete.");
        }
     };


     // --- Validation ---
      /**
       * Validates the checkout form fields.
       * @returns {boolean} True if the form is valid, false otherwise.
       */
      const validateCheckoutForm = () => {
          // Ensure all form elements are present
          if (!checkoutForm || !customerNameInput || !customerEmailInput || !customerAddressInput || !customerPhoneInput) {
               console.error("Checkout form validation skipped: One or more input elements are missing.");
               showNotification("Checkout form error. Please contact support.", "error");
               return false;
           }

         let isValid = true;
         let firstInvalidField = null;
          console.log("Validating checkout form...");

          // Reset previous error styles
         checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

         // --- Field Validations ---

         // Name: Required, at least 2 characters
         if (customerNameInput.value.trim().length < 2) {
             isValid = false;
             temporaryClass(customerNameInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerNameInput;
              console.warn("Validation Fail: Name too short.");
          }

         // Email: Required, basic format check using browser's built-in validation
         if (!customerEmailInput.checkValidity() || customerEmailInput.value.trim() === '') {
              isValid = false;
             temporaryClass(customerEmailInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerEmailInput;
             console.warn("Validation Fail: Email invalid or empty.");
         }

         // Address: Required, at least 10 characters (basic check)
         if (customerAddressInput.value.trim().length < 10) {
             isValid = false;
            temporaryClass(customerAddressInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerAddressInput;
             console.warn("Validation Fail: Address too short.");
          }

        // Phone: Required (based on HTML 'required'), check pattern validity
        if (!customerPhoneInput.checkValidity() || customerPhoneInput.value.trim() === '') {
             isValid = false;
            temporaryClass(customerPhoneInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerPhoneInput;
             console.warn("Validation Fail: Phone invalid or empty.");
        }
         // --- End Field Validations ---


          if (!isValid) {
              console.error("Checkout validation failed.");
             showNotification("Please check your details. Look for the highlighted fields!", 'warn');
             if (firstInvalidField) {
                 firstInvalidField.focus(); // Focus the first problematic field
                 // Optionally shake the form or modal
                 if (checkoutModal) temporaryClass(checkoutModal, 'shake-error', 400);
                 else if(bodyElement) temporaryClass(bodyElement, 'shake-error', 400);
             }
         } else {
              console.log("✅ Checkout validation passed.");
          }

         return isValid;
     };


    // --- Checkout Handler ---
      /**
       * Handles the checkout form submission: validates, prepares data, sends to Supabase.
       * @param {Event} event - The form submission event.
       */
      const handleCheckout = async (event) => {
           event.preventDefault(); // Prevent default form submission
           console.log("handleCheckout initiated.");

           if (!supabase) {
                console.error("Cannot submit order, Supabase client not available.");
                showNotification("Connection error. Cannot submit order.", "error");
                return;
           }
           if (isSubmitting) {
              console.warn("Order submission already in progress. Please wait.");
               showNotification("Processing your order...", "info");
               return;
          }
           if (cart.length === 0) {
                console.error("Cannot checkout with an empty cart.");
                showNotification("Your cart is empty!", "warn");
                closeCheckout(); // Close the modal if cart is empty
                return;
           }

          // --- Frontend Validation ---
          if (!validateCheckoutForm()) {
              console.error("Frontend validation failed. Stopping order submission.");
              // Notification is shown by validateCheckoutForm()
              return; // Stop submission
           }

           // --- Start Submission Process ---
           isSubmitting = true;
           if(submitOrderButton) submitOrderButton.disabled = true;
           if(submitOrderButton) submitOrderButton.textContent = 'Sending Order... 🛸';
           if(checkoutMessage) checkoutMessage.textContent = ''; // Clear previous messages
           if(checkoutMessage) checkoutMessage.className = 'checkout-message'; // Reset message style

         // --- Gather Data for Supabase ---
         const formData = new FormData(checkoutForm);
         const customerData = {
             customer_name: formData.get('customer_name')?.trim() || 'N/A',
             customer_email: formData.get('customer_email')?.trim().toLowerCase() || 'N/A',
             customer_address: formData.get('customer_address')?.trim() || 'N/A',
             customer_phone: formData.get('customer_phone')?.trim() || null // Use null if empty/not provided
         };

          // Prepare order items: Include product ID, quantity, and price *at the time of purchase*
          // Also store product name for easier viewing in Supabase dashboard
         const orderItems = cart.map(item => {
             const product = products.find(p => p.id === item.id);
             return {
                 product_id: item.id,
                 quantity: item.quantity,
                 // Include name and price for easier order management later
                 name_at_purchase: product ? product.name : 'Unknown Item',
                 price_at_purchase: (product && typeof product.price === 'number') ? product.price : 0
             };
         });

         // Recalculate total server-side ideally, but also needed for insertion here
         const calculatedTotalPrice = orderItems.reduce((sum, item) => {
              // Ensure price_at_purchase is a valid number
              const price = typeof item.price_at_purchase === 'number' ? item.price_at_purchase : 0;
              const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
              return sum + (price * quantity);
          }, 0);

          const orderPayload = {
            ...customerData, // Spread customer details
            items: orderItems, // The array of item objects (maps to JSONB column)
            total_price: calculatedTotalPrice,
            order_status: 'Pending', // Default status
            // 'is_fulfilled' might be deprecated if using 'order_status'
            // is_fulfilled: false
          };

          console.log("Order payload prepared, sending to Supabase:", orderPayload);

          // --- Sending to Supabase ---
           try {
               // Optional: Short delay for UX feedback (makes loading state visible)
               await new Promise(resolve => setTimeout(resolve, 500));

              const { data, error } = await supabase
                   .from('orders') // Make sure 'orders' is your table name
                   .insert([orderPayload]) // Insert the prepared payload
                   .select(); // Optionally select the newly created record

              if (error) {
                  // Handle potential Supabase errors (e.g., RLS policy violation, network issue)
                  console.error('🔥 Supabase Insert Error:', error);
                  throw new Error(`Database error: ${error.message}`); // Re-throw for generic catch block
              }

               console.log('✅ ORDER SUCCESS! Supabase Response:', data);
               if (checkoutMessage) {
                    checkoutMessage.textContent = '🎉 Order Placed Successfully! Thanks for the vibes! We\'ll be in touch.';
                    checkoutMessage.className = 'checkout-message success animate-fade-in';
               }
               if (submitOrderButton) temporaryClass(submitOrderButton, 'button-success', 1500); // Green flash feedback

               // --- Post-Success Actions ---
               cart = []; // Clear the local cart array
               localStorage.removeItem('vibeTreatsCart'); // Clear cart from storage
               updateCartUI(); // Update the UI (cart count, sidebar)

               // Close the checkout modal after a delay to show the success message
               setTimeout(() => {
                   closeCheckout();
               }, 4000); // Keep modal open for 4 seconds

           } catch (error) {
               console.error('🔥 ORDER SUBMISSION FAILED:', error);
               if (checkoutMessage) {
                   // Provide a user-friendly error message
                   checkoutMessage.textContent = `😥 Oops! Couldn't place the order. ${error.message}. Please try again or contact us.`;
                   checkoutMessage.className = 'checkout-message error animate-fade-in';
               }
               if (bodyElement) temporaryClass(bodyElement, 'shake-error', 400); // Shake effect on error

               // --- Reset form on error to allow retry ---
               if(submitOrderButton) submitOrderButton.disabled = false; // IMPORTANT: Re-enable button
               if(submitOrderButton) submitOrderButton.textContent = 'Try Sending Order Again?';
               isSubmitting = false; // Reset submitting flag
           }
      };


    // --- EVENT LISTENERS SETUP ---
     const setupEventListeners = () => {
         // Check if all required elements for listeners exist
         if (!cartButton || !closeCartButton || !cartOverlay || !checkoutButton || !closeCheckoutButton || !checkoutOverlay || !checkoutForm || !cartItemsContainer || !productGrid) {
             console.error("Cannot setup all event listeners - one or more crucial elements are missing!");
             showNotification("Page setup error. Some buttons might not work.", "error");
             return; // Don't proceed if core elements for interaction are missing
         }
        console.log("Attaching event listeners...");

        // Cart Toggle Buttons
        cartButton.addEventListener('click', openCart);
        closeCartButton.addEventListener('click', closeCart);
        cartOverlay.addEventListener('click', closeCart); // Click outside cart to close

        // Checkout Modal Buttons & Overlay
        checkoutButton.addEventListener('click', openCheckout);
        closeCheckoutButton.addEventListener('click', closeCheckout);
        checkoutOverlay.addEventListener('click', (event) => {
            // Check if the direct click target *IS* the overlay itself
            if (event.target === checkoutOverlay) {
                console.log("Clicked on overlay background, closing checkout.");
                closeCheckout();
            } else {
                console.log("Clicked inside modal content (or on modal itself), NOT closing.");
                // Do nothing, the click was inside the modal area
            }
        }); // Click outside modal to close

        // Checkout Form Submission
        checkoutForm.addEventListener('submit', handleCheckout);

        // Cart Item Actions (Event Delegation on the container)
        cartItemsContainer.addEventListener('click', (event) => {
            // Find the closest ancestor button with '.action-button' class
            const targetButton = event.target.closest('.action-button');
            if (!targetButton) return; // Click was not on an action button or its child

            const productId = targetButton.dataset.id;
            if (!productId) {
                 console.warn("Cart action button clicked, but missing 'data-id' attribute.");
                 return;
             }

             console.log(`Cart action detected: Classes=${targetButton.className}, ID=${productId}`);
            temporaryClass(targetButton, 'button-clicked', 200); // Visual feedback on click

             // Determine action based on button class
             if (targetButton.classList.contains('increase-quantity')) {
                 increaseQuantity(productId);
             } else if (targetButton.classList.contains('decrease-quantity')) {
                 decreaseQuantity(productId);
             } else if (targetButton.classList.contains('remove-item')) {
                 // Optional: Add a confirmation dialog before removing
                 // if (confirm(`Are you sure you want to remove this item?`)) {
                 //    removeFromCart(productId);
                 // }
                 removeFromCart(productId); // Remove directly for now
             }
        });

        // Add to Cart Buttons (Event Delegation on the product grid)
        productGrid.addEventListener('click', (event) => {
            // Find the closest ancestor button with '.add-to-cart-btn' class
             const button = event.target.closest('.add-to-cart-btn');
             if (button) {
                event.preventDefault(); // Good practice if the button is inside a link/form
                const productId = button.dataset.id;
                 console.log(`Product grid click: Found 'add-to-cart-btn', ID: ${productId}`);
                 if (productId) {
                    addToCart(productId, button); // Pass button for feedback
                 } else {
                     console.warn("'Add To Stash' button clicked but missing 'data-id' attribute!");
                     showNotification("Error identifying treat.", "error");
                 }
             }
         });

        console.log("✅ Event listeners setup complete.");
     };

    // --- PAGE INITIALIZATION ---
    const initializePage = () => {
        console.log("----- Initializing Vibe Treats Page -----");
         try {
             // 1. Load cart from localStorage *before* fetching products or setting up UI
             const storedCart = localStorage.getItem('vibeTreatsCart');
             if (storedCart) {
                 try {
                     cart = JSON.parse(storedCart);
                     // Basic validation of loaded cart structure (optional but good)
                     if (!Array.isArray(cart) || cart.some(item => typeof item.id === 'undefined' || typeof item.quantity === 'undefined')) {
                         console.warn("Invalid cart data found in localStorage. Resetting cart.");
                         cart = [];
                         localStorage.removeItem('vibeTreatsCart');
                     } else {
                         console.log("Loaded cart from localStorage:", cart);
                     }
                 } catch (e) {
                     console.error("Failed to parse cart from localStorage. Resetting cart.", e);
                     cart = [];
                     localStorage.removeItem('vibeTreatsCart'); // Clear corrupted data
                 }
            }

             // 2. Set Dynamic Year in Footer (if element exists)
             if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
             } else {
                console.warn("Footer year span element (#year) not found.");
             }

             // 3. Setup Event Listeners for user interactions
             setupEventListeners();

            // 4. Fetch Products from Supabase (this will trigger renderProducts and updateCartUI)
             fetchProducts(); // This is async, rest of the initialization doesn't wait for it

            console.log("----- Page Initialized (Async operations like fetchProducts may still be running) -----");

        } catch (error) {
            console.error("☠️ FATAL ERROR during page initialization:", error);
             alert("A critical error occurred while loading the page. Please try refreshing.");
             // Display a prominent error message on the page
             if(bodyElement) bodyElement.innerHTML = `<h1 style="color: #FF3399; text-align: center; padding: 50px;">CRITICAL PAGE LOAD ERROR</h1><p style="text-align:center;">Something went very wrong. Please refresh.</p><p style="text-align:center; color: grey;"><small>${error.message}</small></p>`;
        }
     };

    // --- Engage! ---
    initializePage();

}); // === END OF DOMCONTENTLOADED ===
