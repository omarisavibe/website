// --- VIBE TREATS SCRIPT - CONSOLIDATED & COMPLETE (with Telda & Instapay) ---
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
    // const customerEmailInput = document.getElementById('customer_email'); // Assuming still removed from HTML
    const checkoutSummary = document.getElementById('checkout-summary'); // Used in openCheckout
    const checkoutTotalPrice = document.getElementById('checkout-total-price'); // Used in openCheckout
    const submitOrderButton = document.getElementById('submit-order-button');
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingIndicator = document.getElementById('loading-indicator');
    const bodyElement = document.body;
    // NEW: Add payment method elements for validation/update
    const paymentMethodSelection = document.querySelector('.payment-method-selection'); // The container div
    const paymentTotalReminders = document.querySelectorAll('.payment-total-reminder'); // Select ALL reminder spans

    // Check if crucial elements were found (Combined check)
    if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !cartCount || !cartItemsContainer || !cartTotalPrice ||
        !checkoutButton || !checkoutModal || !checkoutOverlay || !closeCheckoutButton || !checkoutForm || !submitOrderButton ||
        !customerNameInput || !customerAddressInput || !customerPhoneInput || !checkoutSummary || !checkoutTotalPrice || !paymentMethodSelection || paymentTotalReminders.length === 0) {
        console.error("🛑 Critical HTML elements missing! Check IDs/Classes in your HTML file against the script.");
        alert("Woops! Some essential parts of the page (like product grid, cart, checkout form, payment details) are missing in the HTML. Can't run properly.");
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

    /**
     * Updates the cart sidebar UI (items, total price, item count).
     * Saves the cart state to localStorage.
     * Enables/disables the checkout button based on cart content.
     */
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
                    return; // Skip this item
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
        if (!isCartOpen) openCart();
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

    /** Opens the checkout modal and overlay, populates summary and payment reminders. */
    const openCheckout = () => {
        // Re-check elements needed specifically for this function
        if (!checkoutModal || !checkoutOverlay || !bodyElement || !checkoutSummary || !checkoutTotalPrice || !checkoutForm || !submitOrderButton || paymentTotalReminders.length === 0) {
            console.error("Cannot open checkout - required elements missing.");
            showNotification("Checkout unavailable due to page error.", "error");
            return;
        }

        if (cart.length === 0) {
            showNotification("Add some treats to your cart first!", "warn");
            return;
        }

        console.log("Opening checkout modal (Telda & Instapay Flow).");

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
        checkoutTotalPrice.textContent = totalFormatted; // Update the total in the summary box

        // --- Update ALL Payment Total Reminders ---
        paymentTotalReminders.forEach(span => {
            span.textContent = totalFormatted;
        });
        console.log("Updated payment reminder spans with total:", totalFormatted);

        // Reset form state and messages
        checkoutForm.reset(); // Resets text fields and radio buttons
        if(checkoutMessage) checkoutMessage.textContent = '';
        if(checkoutMessage) checkoutMessage.className = 'checkout-message';
        if(submitOrderButton) submitOrderButton.disabled = false;
        // Set the correct default submit button text
        if(submitOrderButton) submitOrderButton.textContent = 'Confirm Details & Payment Method Used ✅';
        isSubmitting = false;

         // Clear previous validation errors visually
        checkoutForm.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
            el.removeAttribute('aria-invalid');
        });
        if(paymentMethodSelection) paymentMethodSelection.classList.remove('input-error'); // Clear radio group error


        // Show the modal and overlay
        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        bodyElement.classList.add('overlay-active', 'checkout-open');
        isCheckoutOpen = true;

        if (isCartOpen) closeCart(); // Close cart if open

        // Focus first non-radio input
        const firstInput = checkoutForm.querySelector('input:not([type=radio]), textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
     };

    /** Closes the checkout modal and overlay. */
    const closeCheckout = () => {
        if (!checkoutModal || !checkoutOverlay || !bodyElement) return;
        console.log("Closing checkout modal.");
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        bodyElement.classList.remove('overlay-active', 'checkout-open');
        isCheckoutOpen = false;

        // Reset button state
        if (submitOrderButton) {
             submitOrderButton.disabled = false;
             // Reset to correct default text
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
             renderProducts(); // Render whatever was fetched (or error/empty message)
             updateCartUI();   // Update cart display based on potentially new prices/state
             console.log("Product fetch sequence complete.");
        }
     };


     // --- Validation ---
      /**
       * Validates the checkout form fields (Name, Address, Phone, Payment Method).
       * Adds/removes 'input-error' class and sets aria-invalid attributes.
       * @returns {boolean} True if the form is valid, false otherwise.
       */
     // --- Validation ---
      /**
       * Validates the checkout form fields (Name, Address, Phone, Payment Method).
       * Adds/removes 'input-error' class and sets aria-invalid attributes.
       * Checks if the address is within allowed delivery zones (New Cairo / Nasr City).
       * @returns {boolean} True if the form is valid, false otherwise.
       */
      const validateCheckoutForm = () => {
          // Re-check required elements for validation
          if (!checkoutForm || !customerNameInput || !customerAddressInput || !customerPhoneInput || !paymentMethodSelection) {
               console.error("Checkout form validation skipped: Required elements missing.");
               showNotification("Checkout form error. Please contact support.", "error");
               return false;
           }

         let isValid = true;
         let firstInvalidField = null;
          console.log("Validating checkout form (Telda/Instapay Flow)...");

          // Helper to apply error state
          const applyError = (inputElement, isGroup = false) => {
              const elementToStyle = isGroup ? inputElement : inputElement;
              // Use temporaryClass for shake/highlight effect, but also keep the class for persistence until next validation
              elementToStyle.classList.add('input-error'); // Keep the error class
              temporaryClass(elementToStyle, 'shake-subtle', 500); // Add a temporary shake
              if (!isGroup) inputElement.setAttribute('aria-invalid', 'true');
              if (!firstInvalidField) {
                  firstInvalidField = isGroup ? inputElement.querySelector('input') : inputElement;
              }
          };

          // Helper to remove error state
          const removeError = (inputElement, isGroup = false) => {
              const elementToStyle = isGroup ? inputElement : inputElement;
              elementToStyle.classList.remove('input-error'); // Remove class
               if (!isGroup) inputElement.removeAttribute('aria-invalid'); // Use removeAttribute for boolean attributes
          };

          // --- Reset previous errors ---
          checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
          [customerNameInput, customerAddressInput, customerPhoneInput].forEach(el => el.removeAttribute('aria-invalid'));
          removeError(paymentMethodSelection, true); // Reset radio group border/bg


         // --- Field Validations ---

         // 1. Name
         if (customerNameInput.value.trim().length < 2) {
             isValid = false; applyError(customerNameInput); console.warn("Validation Fail: Name");
          } else { removeError(customerNameInput); }

         // 2. Address
         const addressValue = customerAddressInput.value.trim();
         if (addressValue.length < 10) {
             // Basic length check first
             isValid = false; applyError(customerAddressInput); console.warn("Validation Fail: Address too short");
          } else {
             // **** START: NEW LOCATION CHECK ****
             const addressValueLower = addressValue.toLowerCase();
    const allowedLocationsKeywords = [
  // New Cairo variations
  'new cairo', 
  'newcairo', 
  'n.cairo', 
  'nc',
  'القاهرة الجديدة', 
  'القاهره الجديده', 
  'نيو كايرو',
  'tagamoa', // Common spelling
  'tagamou', // Alternate spelling
  'tagamo3', // Numeric replacement
  'التجمع', // Arabic

  // Specific Settlements
  'first settlement', '1st settlement', 'tagamoa el awal', 'tagamou el awal', 'التجمع الاول', 'التجمع الأول',
  'second settlement', '2nd settlement', 'tagamoa el thani', 'tagamou el thani', 'south extension', 'التجمع الثاني', 'الامتداد الجنوبي',
  'third settlement', '3rd settlement', 'tagamoa el thaleth', 'tagamou el thaleth', 'التجمع الثالث',
  'fifth settlement', '5th settlement', 'tagamoa el khames', 'tagamou el khames', 'التجمع الخامس',

  // Compounds
  'rehab city', 'al rehab', 'el rehab', 'rehabcity', 'مدينة الرحاب', 'مدينه الرحاب', 'الرحاب',
  'madinaty', 'madinati', 'madinty', 'مدينتي', 'مدينة مدينتي',
  'katameya', 'katamya', 'katameya heights', 'القطامية', 'قطامية', 'قطاميه',
  'south investors', 'north investors', 'مستثمرين جنوب', 'مستثمرين شمال',
  'al narges', 'narges', 'النرجس',
  'al yasmeen', 'yasmeen', 'الياسمين',
  'banafseg', 'al banafseg', 'البنفسج',
  'lotus', 'west lotus', 'east lotus', 'اللوتس', 'اللوتس الغربية', 'اللوتس الشرقية',

  // Nasr City variations
  'nasr city',
  'nasrcity',
  'naser city',
  'nasercity',
  'nasr', // Easy short form
  'naser', // Common typo
  'مدينة نصر',
  'مدينه نصر',
  'madinet nasr',
  'madinat nasr',
  'madint nasr', // Misspelling
  'm. nasr',
  'm nasr',

  // Districts inside Nasr City
  '7th district', 'hay el sabea', 'el hay el sabea', 'hay el saba', 'الحى السابع', 'الحي السابع',
  '8th district', 'hay el tamen', 'el hay el tamen', 'الحى الثامن', 'الحي الثامن',
  '9th district', 'hay el tasie', 'el hay el tasie', 'الحى التاسع', 'الحي التاسع',
  '10th district', 'hay el asher', 'el hay el asher', 'hay al asher', 'الحى العاشر', 'الحي العاشر',

  // Subdivisions
  'gharb madinet nasr', 'sharq madinet nasr',
  'gharb nasr city', 'sharq nasr city',
  'غرب مدينة نصر', 'شرق مدينة نصر',
  'west nasr city', 'nasr city west', 'east nasr city', 'nasr city east',
  
  // New area
  'nasr city third', 'nasr city 3', 'nasr city iii', 'al-amal', 'al amal', 'الأمل',

  // Famous streets (optional but helpful)
  'abbas el akkad', 'عباس العقاد',
  'makram ebaid', 'مكرم عبيد',
  'mostafa el nahas', 'مصطفى النحاس'
];

             // Check if the address contains ANY of the allowed keywords
             const isLocationAllowed = allowedLocationsKeywords.some(keyword => addressValueLower.includes(keyword));

             if (!isLocationAllowed) {
                 isValid = false;
                 applyError(customerAddressInput); // Apply error style to address field
                 console.warn("Validation Fail: Address not in allowed delivery area (New Cairo/Nasr City). Address provided:", addressValue);
                 // Set this field as the first invalid one if others were okay
                 if (!firstInvalidField) firstInvalidField = customerAddressInput;
                 // Provide a specific notification
                 showNotification("Sorry, we only deliver to New Cairo & Nasr City for now! Please check your address.", 'warn', 5000);
             } else {
                 // Location is valid, remove potential error style from address field
                 removeError(customerAddressInput);
                 console.log("Address validation passed: Location seems valid.");
             }
             // **** END: NEW LOCATION CHECK ****
          }

         // 3. Phone
         // Use checkValidity() which respects the 'required' and 'pattern' attributes
         if (!customerPhoneInput.checkValidity() || customerPhoneInput.value.trim() === '') {
             isValid = false; applyError(customerPhoneInput); console.warn("Validation Fail: Phone number invalid or missing.");
         } else { removeError(customerPhoneInput); }

         // 4. Payment Method Selection
         const selectedPaymentMethod = checkoutForm.querySelector('input[name="payment_method"]:checked');
         if (!selectedPaymentMethod) {
             isValid = false;
             applyError(paymentMethodSelection, true); // Style the container
             console.warn("Validation Fail: Payment method not selected.");
             // Don't set firstInvalidField here if other fields already failed
             if (!firstInvalidField) firstInvalidField = paymentMethodSelection.querySelector('input[type="radio"]');
         } else {
             removeError(paymentMethodSelection, true); // Remove container style
         }
         // --- End Field Validations ---

          if (!isValid) {
              console.error("Checkout validation failed.");
             // General failure message (specific one might have been shown already for location)
             if (!firstInvalidField || firstInvalidField !== customerAddressInput) { // Avoid double notification if location was the only issue
                showNotification("Please check the highlighted details & select payment method!", 'warn', 3000);
             }
             if (firstInvalidField) {
                 setTimeout(() => {
                     firstInvalidField.focus();
                     // Optional: Scroll into view if needed, especially on mobile
                     // firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }, 100); // Small delay to ensure focus works after potential modal shake
                 // Shake the modal only if it wasn't the location error that already triggered a notification
                 if (checkoutModal && (!firstInvalidField || firstInvalidField !== customerAddressInput)) {
                     temporaryClass(checkoutModal, 'shake-error', 400);
                 }
             }
         } else {
              console.log("✅ Checkout validation passed.");
          }
         return isValid;
     };

    // --- Checkout Handler ---
      /**
       * Handles the checkout form submission: validates, prepares data, sends to Supabase.
       * Assumes payment is made OUTSIDE the website (Telda/Instapay app).
       * @param {Event} event - The form submission event.
       */
      const handleCheckout = async (event) => {
           event.preventDefault();
           console.log("handleCheckout initiated (Telda/Instapay Flow).");

           if (!supabase) { /* ... (initial checks) */ return; }
           if (isSubmitting) { /* ... */ return; }
           if (cart.length === 0) { /* ... */ return; }

          // --- Frontend Validation ---
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
               customer_address: formData.get('customer_address')?.trim() || 'N/A',
               customer_phone: formData.get('customer_phone')?.trim() || 'N/A',
               payment_method: formData.get('payment_method') || 'Not Selected' // Get 'Telda' or 'Instapay'
           };

           const orderItems = cart.map(item => {
               const product = products.find(p => p.id === item.id);
               return {
                   product_id: item.id, quantity: item.quantity,
                   name_at_purchase: product ? product.name : 'Unknown',
                   price_at_purchase: (product && typeof product.price === 'number') ? product.price : 0
               };
           });

           const calculatedTotalPrice = orderItems.reduce((sum, item) => {
                return sum + (item.price_at_purchase * item.quantity);
            }, 0);

           // --- Prepare Payload for Supabase 'orders' Table ---
           // *** ENSURE 'orders' table has a 'payment_method' (text) column ***
           const orderPayload = {
               customer_name: customerData.customer_name,
               customer_address: customerData.customer_address,
               customer_phone: customerData.customer_phone,
               payment_method: customerData.payment_method, // <<< ADDED
               order_items: orderItems,
               total_price: calculatedTotalPrice,
               status: 'Pending Payment Confirmation' // Default status
           };

           console.log("Attempting to insert order:", orderPayload);

           // --- Insert into Supabase ---
           try {
               const { data, error } = await supabase
                   .from('orders') // <<< YOUR ORDERS TABLE NAME
                   .insert([orderPayload])
                   .select();

               if (error) throw new Error(`Database Error: ${error.message}`);

               console.log("✅ Order successfully logged:", data);

               // --- Success Actions ---
               if (checkoutMessage) {
                   checkoutMessage.textContent = `🎉 Order Logged! Please complete payment via ${customerData.payment_method}. We'll confirm & process once received. Thanks!`;
                   checkoutMessage.className = 'checkout-message success animate-fade-in';
               }
               showNotification("Order details sent! Awaiting payment confirmation.", 'success', 5000);
               cart = []; // Clear the cart
               updateCartUI(); // Update UI and localStorage

               // Close modal after delay
               setTimeout(() => {
                    closeCheckout(); // This also resets button text via its own logic
                    checkoutForm.reset();
               }, 4000); // 4-second delay

           } catch (error) {
               console.error("🔥 Order logging FAILED:", error);
               if (checkoutMessage) {
                   checkoutMessage.textContent = `😭 Oops! Couldn't save order details. Please try again or contact us. Error: ${error.message}`;
                   checkoutMessage.className = 'checkout-message error animate-fade-in';
               }
               showNotification(`Order logging failed: ${error.message}`, 'error', 5000);
               // Re-enable button on error
               isSubmitting = false;
               if(submitOrderButton) {
                    submitOrderButton.disabled = false;
                    submitOrderButton.textContent = 'Try Confirming Again?'; // Error state text
               }
           }
       }; // --- END OF handleCheckout ---


    // --- EVENT LISTENERS SETUP ---
     const setupEventListeners = () => {
         // Re-check essential elements for listeners
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
        checkoutOverlay.addEventListener('click', (event) => { // Click outside modal to close
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

        // --- Copy Buttons Listener (Delegation on Modal) ---
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
                // Fallback: Try to select text
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
        console.log("----- Initializing Vibe Treats Page -----");
         try {
             // 1. Load cart from localStorage
             const storedCart = localStorage.getItem('vibeTreatsCart');
             if (storedCart) {
                 try {
                     const parsedCart = JSON.parse(storedCart);
                     // Basic validation
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

             // 2. Set Dynamic Year
             if (yearSpan) yearSpan.textContent = new Date().getFullYear();
             else console.warn("Footer year span #year not found.");

             // 3. Setup Event Listeners
             setupEventListeners();

            // 4. Fetch Products (async - triggers render and cart update in finally block)
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
