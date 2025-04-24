// --- VIBE TREATS SCRIPT - MAX VIBE DEBUG EDITION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("----- VIBE TREATS STARTUP ----- DOM loaded.");

    // --- SUPABASE CLIENT SETUP ---
    const SUPABASE_URL = 'https://oljmjsegopkyqnujrzyi.supabase.co'; // ✅ Double-check URL
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sam1qc2Vnb3BreXFudWpyenlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjY3MjIsImV4cCI6MjA2MTA0MjcyMn0.hLOLhq6UOYsLsPpM-nQf4VM1p7uXKv2SaQ8_ffVl8Y4'; // ✅ Double-check Key

    // --- Basic Config Check ---
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR_SUPABASE_URL") || SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")) { // Improved check
        console.error("🛑 HALT! Supabase keys MISSING or DEFAULT in script.js. Fix it!");
        alert("ADMIN ALERT! Fix the Supabase keys in script.js! Nothing works without 'em!");
        const grid = document.getElementById('product-grid');
        if(grid) grid.innerHTML = '<p style="color: #FF3399; text-align: center; font-weight: bold; font-size: 1.5rem; padding: 2rem;">💀 CONFIG ERROR: Backend connection failed.</p>';
        return;
    }

    let supabase;
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase client looks okay. Let's vibe.");
    } catch (error) {
        console.error("🔥 Supabase client init FAILED:", error);
        alert("Supabase connection burped. Refresh maybe?");
        const grid = document.getElementById('product-grid');
        if(grid) grid.innerHTML = '<p style="color: red; text-align: center; font-weight: bold;">🗼 Connection Error: Failed loading treats.</p>';
        return;
    }

    // --- DOM ELEMENTS CACHE (Check each one!) ---
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
    // Add email input if you uncommented it in HTML:
    const customerEmailInput = document.getElementById('customer_email');
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const submitOrderButton = document.getElementById('submit-order-button');
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingIndicator = document.getElementById('loading-indicator');
    const bodyElement = document.body;

    // Check if crucial elements were found
    if (!productGrid || !cartButton || !cartSidebar || !cartOverlay || !checkoutModal || !checkoutOverlay || !checkoutForm) {
         console.error("🛑 Critical HTML elements missing! Check IDs:", {
            productGrid: !!productGrid, cartButton: !!cartButton, cartSidebar: !!cartSidebar,
             cartOverlay: !!cartOverlay, checkoutModal: !!checkoutModal, checkoutOverlay: !!checkoutOverlay, checkoutForm: !!checkoutForm
        });
         alert("Woops! Some parts of the page are missing in the HTML. Can't run properly.");
         return; // Stop if layout is fundamentally broken
     }
    console.log("✅ HTML elements found.");

    // --- STATE MANAGEMENT ---
    let cart = []; // Initialize empty, then load
    let products = [];
    let isCartOpen = false;
    let isCheckoutOpen = false;
    let isSubmitting = false;

    // --- UTILITY FUNCTIONS --- (Keep formatCurrency, temporaryClass, showNotification as before)
    const formatCurrency = (amount) => `LE ${amount.toFixed(2)}`;
    const temporaryClass = (element, className, duration = 500) => { /* ... implementation ... */ };
    const showNotification = (message, type = 'info') => { /* ... implementation ... */ };


    // --- CORE FUNCTIONS ---

    const updateCartUI = () => {
        if (!cartItemsContainer || !cartTotalPrice || !cartCount || !checkoutButton) return; // Guard clause
        console.log("Updating Cart UI. Current cart:", JSON.stringify(cart));

        cartItemsContainer.innerHTML = ''; // Clear first
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-empty-message fade-in">Lonely cart seeks delicious treats...</p>';
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (!product || typeof product.price !== 'number' || !product.image_url) {
                    console.warn(`Cart render: Data missing for ID: ${item.id}. Product Data:`, product);
                    cartItemsContainer.innerHTML += `<p class="error-message">Error loading item: ${item.id || 'Unknown ID'}</p>`; // Show error in cart
                    return;
                }
                // Rest of itemElement creation (ensure class="add-to-cart-btn" and data-id are correct if modifying HTML generation)
                // ... (innerHTML code as before) ...
                 const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item', 'animate-item-enter');
                itemElement.dataset.itemId = item.id; // Use data-item-id for clarity

                itemElement.innerHTML = `
                     <img src="${product.image_url}" alt="${product.name}" class="cart-item-img" onerror="this.onerror=null; this.src='fallback-cookie.png';">
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
        localStorage.setItem('vibeTreatsCart', JSON.stringify(cart)); // Save changes
        checkoutButton.disabled = cart.length === 0;
        checkoutButton.textContent = cart.length === 0 ? 'Cart = Sad' : 'Checkout (Final Boss)';
        console.log(`Cart UI updated: ${itemCount} items, Total: ${formatCurrency(total)}`);
    };

    // --- Cart Actions ---
     const addToCart = (productId, buttonElement) => {
        console.log(`Attempting to add product ID: ${productId}`);
         const product = products.find(p => p.id === productId);
         if (!product) {
             console.error(`addToCart: Product with ID ${productId} not found in local 'products' array!`);
             showNotification("Error: Couldn't identify that treat.", 'error');
            return;
        }
        console.log(`Product found: ${product.name}`);

         // Rest of addToCart logic... (as before)
         // ... existingItem check, cart.push, showNotification ...
          const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
             showNotification(`+1 ${product.name}! More vibes!`, 'info'); // Shortened msg
        } else {
            cart.push({ id: productId, quantity: 1 });
            showNotification(`Added ${product.name}! Solid choice.`, 'success');
        }

          if(buttonElement) temporaryClass(buttonElement, 'button-adding', 400);
         temporaryClass(cartCount, 'pulse', 500);
        temporaryClass(cartButton, 'shake-subtle', 500);

        updateCartUI();
        if (!isCartOpen) {
            openCart();
        }
    };

     // --- removeFromCart, increaseQuantity, decreaseQuantity ---
     // (Keep the improved logic with animation delays and notifications from the previous good JS version)
      const removeFromCart = (productId) => { /* ... (keep previous JS version's logic with animation) ... */ };
      const increaseQuantity = (productId) => { /* ... (keep previous JS version's logic) ... */ };
      const decreaseQuantity = (productId) => { /* ... (keep previous JS version's logic) ... */ };

    // --- Sidebar/Modal Toggles --- (Keep as before, ensure body class toggles happen)
    const openCart = () => { /* ... (keep previous JS version's logic) ... */ };
    const closeCart = () => { /* ... (keep previous JS version's logic) ... */ };
    const openCheckout = () => { /* ... (keep previous JS version's logic, check form fields exist) ... */ };
    const closeCheckout = () => { /* ... (keep previous JS version's logic) ... */ };

    // --- Render Products ---
    const renderProducts = () => {
        if (!productGrid) {
            console.error("renderProducts: productGrid element not found!");
            return;
         }
        console.log(`Rendering ${products.length} products.`);
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        productGrid.innerHTML = ''; // Clear grid always

        if (products.length === 0) {
            productGrid.innerHTML = '<p class="empty-message">Inventory mystery... vanished! Or maybe I ate it? 🍪❓</p>';
            return;
        }

        products.forEach((product, index) => {
             // *More Robust Check*
             if (!product || !product.id || !product.name || typeof product.price !== 'number' || !product.image_url) {
                 console.warn("Skipping product render due to INCOMPLETE data:", product);
                 const errorCard = document.createElement('article');
                errorCard.classList.add('product-card', 'error-card'); // Style this differently if needed
                errorCard.innerHTML = `<div class="product-details"><h3 class="product-name">Loading Error</h3><p>Couldn't load details for one treat.</p></div>`;
                productGrid.appendChild(errorCard);
                 return;
             }

            // ... (rest of card creation as before using product.image_url)
              const card = document.createElement('article');
            card.classList.add('product-card', 'animate-card-enter');
             card.style.setProperty('--animation-delay', `${index * 0.05}s`);
             const priceFormatted = formatCurrency(product.price);

            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${product.image_url}" alt="${product.name}" class="product-main-image" loading="lazy" onerror="this.onerror=null; this.src='fallback-cookie.png'; this.alt='Image failed to load';">
                 </div>
                 <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || 'Pure vibes, probably.'}</p>
                    <p class="product-price">${priceFormatted}</p>
                     <button class="cta-button add-to-cart-btn" data-id="${product.id}">Add To Stash ✨</button>
                </div>
            `;
             productGrid.appendChild(card);
            setTimeout(() => card.classList.remove('animate-card-enter'), 600 + (index * 50));

        });
        console.log("Product rendering complete.");
    };

    // --- Fetch Products ---
     const fetchProducts = async () => {
         if (!productGrid) {
            console.error("Cannot fetch products, productGrid missing.");
            return;
        }
         if (loadingIndicator) loadingIndicator.style.display = 'block';
         productGrid.innerHTML = ''; // Clear grid while loading
         console.log("🚀 Initiating Product Fetch...");

         try {
             let { data, error, status } = await supabase
                 .from('products')
                 .select('id, name, description, price, slug, image_url, created_at') // Select explicitly
                 .order('created_at', { ascending: true });

             if (error) {
                 console.error(`🔥 Supabase fetch error! Status: ${status}`, error);
                throw new Error(`Supabase Error: ${error.message}`); // Re-throw specific error
             }

             if (data) {
                console.log(`✅ Fetch SUCCESS! Found ${data.length} products. Data:`, data);
                 products = data; // Store data
             } else {
                 console.warn("🤔 Fetch weirdness: No error, but no data received.");
                 products = []; // Ensure it's empty
             }

         } catch (error) {
            console.error('🔥 PRODUCT FETCH FAILED (Catch Block):', error);
             products = []; // Clear products on error
             if (loadingIndicator) loadingIndicator.style.display = 'none';
             // Display user-friendly error message IN the product grid area
            productGrid.innerHTML = `<p class="error-message">Could not load treats! Server might be taking a nap. 😴 Error: ${error.message}</p>`;

         } finally {
             // Render happens even if empty or failed (shows appropriate message)
             renderProducts();
            // Update cart AFTER products (and prices) are loaded/confirmed empty
            updateCartUI();
             console.log("Product fetch sequence complete.");
        }
     };


     // --- Validation ---
      const validateCheckoutForm = () => {
          if (!checkoutForm) return false; // Shouldn't happen, but check
         let isValid = true;
         let firstInvalidField = null;
          const fieldsToValidate = [customerNameInput, customerAddressInput, customerPhoneInput];
        // Add email back here if using: const fieldsToValidate = [customerNameInput, customerEmailInput, ...];

         console.log("Validating checkout form...");

          // Reset previous errors
         checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

         // Check fields
         if (!customerNameInput || customerNameInput.value.trim().length < 2) {
             isValid = false;
             if (customerNameInput) temporaryClass(customerNameInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerNameInput;
              console.warn("Validation Fail: Name");
          }
         if (!customerAddressInput || customerAddressInput.value.trim().length < 10) {
             isValid = false;
            if (customerAddressInput) temporaryClass(customerAddressInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerAddressInput;
             console.warn("Validation Fail: Address");
          }
        // Check phone using built-in pattern check
        if (!customerPhoneInput || !customerPhoneInput.checkValidity()) {
             isValid = false;
            if (customerPhoneInput) temporaryClass(customerPhoneInput, 'input-error', 3000);
             if (!firstInvalidField) firstInvalidField = customerPhoneInput;
             console.warn("Validation Fail: Phone");
        }
         // Add email validation here if using

          if (!isValid) {
              console.error("Checkout validation failed.");
             showNotification("Looks like some info is missing/wrong. Check the red fields!", 'warn');
             if (firstInvalidField) {
                 firstInvalidField.focus();
                 temporaryClass(bodyElement, 'shake-error', 400);
             }
         } else {
              console.log("Checkout validation passed.");
          }

         return isValid;
     };


    // --- Checkout Handler --- (Keep validation check, clearer messages)
      const handleCheckout = async (event) => {
           event.preventDefault();
           console.log("handleCheckout initiated.");
           if (isSubmitting) {
              console.warn("Already submitting order, please wait.");
               return;
          }

          if (!validateCheckoutForm()) { // Validate frontend first
              console.error("Frontend validation failed. Stopping submission.");
              return; // Stop if validation fails
           }

           isSubmitting = true;
          submitOrderButton.disabled = true;
           submitOrderButton.textContent = 'Beam It Up... 🛸'; // Funky loading text
          checkoutMessage.textContent = '';
          checkoutMessage.className = 'checkout-message'; // Reset

         // Gather Data
          const formData = new FormData(checkoutForm);
         const customerData = {
             customer_name: formData.get('customer_name').trim(),
            // Add email back here if needed:
            // customer_email: formData.get('customer_email')?.trim() || null,
            customer_address: formData.get('customer_address').trim(),
             customer_phone: formData.get('customer_phone').trim() || null
        };
         const orderItems = cart.map(/* ... as before ... */);
         const totalPrice = cart.reduce(/* ... as before ... */);

          console.log("Data prepared, sending to Supabase:", { customerData, orderItems, totalPrice });

          // --- Sending to Supabase ---
           try {
               await new Promise(resolve => setTimeout(resolve, 700)); // SLIGHT simulated delay

              const { data, error } = await supabase
                   .from('orders')
                   .insert([{ /* ... data mapping ... */ }]) // Ensure all fields map correctly
                   .select();

              if (error) throw error;

               console.log('✅ ORDER SUCCESS! Supabase Response:', data);
               checkoutMessage.textContent = 'BOOM! Order In! ✨ We *might* ship it. Check phone/vibes later!';
               checkoutMessage.className = 'checkout-message success animate-fade-in';
               temporaryClass(submitOrderButton, 'button-success', 1500); // Show green flash
               cart = [];
              localStorage.removeItem('vibeTreatsCart');
               updateCartUI(); // Update counts, clear local cart

               setTimeout(() => { // Close modal AFTER success message/animation
                   closeCheckout(); // This will also re-enable button via its reset logic
               }, 4500);

           } catch (error) {
               console.error('🔥 ORDER SUBMISSION FAILED (Supabase):', error.message);
               checkoutMessage.textContent = `Womp Womp. Error: ${error.message}. Server said 'nah'. Try again?`;
               checkoutMessage.className = 'checkout-message error animate-fade-in';
               temporaryClass(bodyElement, 'shake-error', 400);
              submitOrderButton.disabled = false; // IMPORTANT: Re-enable button on error
               submitOrderButton.textContent = 'Try Sending Again?';
              isSubmitting = false;
           }
      };


    // --- EVENT LISTENERS SETUP ---
     const setupEventListeners = () => {
         if (!cartButton || !productGrid) { // Add check for productGrid too
            console.error("Cannot setup listeners - cartButton or productGrid missing!");
            return;
        }
        console.log("Attaching event listeners...");

        // Cart Toggle (Make sure button exists!)
         if(cartButton) cartButton.addEventListener('click', openCart);
         else console.warn("Cart button not found for listener.");

         if(closeCartButton) closeCartButton.addEventListener('click', closeCart);
         else console.warn("Close cart button not found.");

          // Overlays
         if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
         else console.warn("Cart overlay not found.");

        if (checkoutOverlay) checkoutOverlay.addEventListener('click', closeCheckout);
        else console.warn("Checkout overlay not found.");


        // Cart Item Actions (Check container exists)
         if (cartItemsContainer) {
            console.log("Attaching cart item listeners...");
            cartItemsContainer.addEventListener('click', (event) => {
                const targetButton = event.target.closest('.action-button'); // Find closest action button
                if (!targetButton) return; // Didn't click a button inside the items area

                const productId = targetButton.dataset.id;
                 if (!productId) {
                     console.warn("Cart action button missing data-id.");
                     return;
                 }

                 console.log(`Cart action detected: ${targetButton.className}, ID: ${productId}`);
                temporaryClass(targetButton, 'button-clicked', 200);

                 if (targetButton.classList.contains('increase-quantity')) increaseQuantity(productId);
                 else if (targetButton.classList.contains('decrease-quantity')) decreaseQuantity(productId);
                else if (targetButton.classList.contains('remove-item')) removeFromCart(productId);
            });
         } else {
             console.error("Cart items container missing! Cannot attach item listeners.");
        }

        // Add to Cart Button (Check grid exists)
         if (productGrid) {
            console.log("Attaching product grid 'Add To Stash' listeners...");
             productGrid.addEventListener('click', (event) => {
                 const button = event.target.closest('.add-to-cart-btn'); // Target correct class
                 if (button) {
                    const productId = button.dataset.id;
                     console.log(`Product grid click: Found add-to-cart-btn, ID: ${productId}`);
                     if (productId) {
                        addToCart(productId, button);
                     } else {
                         console.warn("Add-to-cart button clicked but missing data-id!");
                     }
                 }
             });
         } else {
             console.error("Product grid missing! Cannot attach 'Add To Stash' listeners.");
         }


        // Checkout Actions (Check elements exist)
         if (checkoutButton) checkoutButton.addEventListener('click', openCheckout);
         else console.warn("Checkout button not found.");

         if (closeCheckoutButton) closeCheckoutButton.addEventListener('click', closeCheckout);
         else console.warn("Close checkout button not found.");

         if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckout);
         else console.warn("Checkout form not found.");

        console.log("✅ Event listeners setup seems complete.");
     };

    // --- PAGE INITIALIZATION ---
    const initializePage = () => {
        console.log("----- Initializing Vibe Treats Page -----");
         try {
             // 0. Load cart from storage FIRST
             const storedCart = localStorage.getItem('vibeTreatsCart');
             if (storedCart) {
                 cart = JSON.parse(storedCart);
                 console.log("Loaded cart from localStorage:", cart);
            }

             // 1. Set Year
             if (yearSpan) yearSpan.textContent = new Date().getFullYear();
             else console.warn("Year span not found.");

             // 2. Setup Listeners
             setupEventListeners();

            // 3. Fetch Products (This will also call updateCartUI on completion/failure)
             fetchProducts();

            console.log("----- Page Initialized Successfully -----");
        } catch (error) {
            console.error("☠️ MAJOR ERROR during page initialization:", error);
             alert("Big oopsie loading the page. Maybe try refreshing?");
             // Display a major error message if possible
             bodyElement.innerHTML = '<h1 style="color: red; text-align: center; padding: 50px;">CRITICAL PAGE LOAD ERROR</h1>';
        }
     };

    // --- Engage! ---
    initializePage();

}); // === END OF DOMCONTENTLOADED ===
