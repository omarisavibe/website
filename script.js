document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE CLIENT SETUP ---
    const SUPABASE_URL = 'https://oljmjsegopkyqnujrzyi.supabase.co'; // <<< REPLACE
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sam1qc2Vnb3BreXFudWpyenlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjY3MjIsImV4cCI6MjA2MTA0MjcyMn0.hLOLhq6UOYsLsPpM-nQf4VM1p7uXKv2SaQ8_ffVl8Y4'; // <<< REPLACE

    // --- Basic Config Check ---
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error("🚨 Supabase URL or Anon Key not configured in script.js!");
        alert("Yo, website admin! Fix the Supabase keys in script.js!");
        document.getElementById('product-grid').innerHTML = '<p style="color: red; text-align: center; font-weight: bold;">CONFIG ERROR: Store vibes offline.</p>';
        return; // Stop
    }

    let supabase;
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client vibing.");
    } catch (error) {
        console.error("🚨 Supabase client failed to vibe:", error);
        alert("Can't connect to the backend rn. Try refreshing? Or blaming Mercury retrograde?");
        document.getElementById('product-grid').innerHTML = '<p style="color: red; text-align: center; font-weight: bold;">CONNECTION ERROR: Failed to load treats.</p>';
        return; // Stop
    }

    // --- DOM ELEMENTS ---
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
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const submitOrderButton = document.getElementById('submit-order-button'); // Get submit button
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');
    const loadingMsg = document.querySelector('.loading-msg'); // Get loading indicator

    // --- CART STATE ---
    let cart = JSON.parse(localStorage.getItem('vibeTreatsCart')) || [];
    let products = []; // Store fetched products WITH image URLs now

    // --- FUNCTIONS ---

    // Update Cart UI
    const updateCartUI = () => {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Cart\'s empty. Treat deficiency detected.</p>';
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                // Make sure product AND its price/image_url are loaded
                if (!product || typeof product.price !== 'number' || !product.image_url) {
                    console.warn(`Product data missing for cart item ID: ${item.id}`);
                    return; // Skip rendering this item if essential data is missing
                }

                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                // ** Using product.image_url now **
                itemElement.innerHTML = `
                    <img src="${product.image_url}" alt="${product.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p>LE ${product.price.toFixed(2)} x ${item.quantity}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="decrease-quantity" data-id="${item.id}" aria-label="Decrease quantity">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity" data-id="${item.id}" aria-label="Increase quantity">+</button>
                        <button class="remove-item" data-id="${item.id}" aria-label="Remove item">×</button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
                total += product.price * item.quantity;
                itemCount += item.quantity;
            });
        }

        cartTotalPrice.textContent = `LE ${total.toFixed(2)}`; // Add LE currency
        cartCount.textContent = itemCount;
        localStorage.setItem('vibeTreatsCart', JSON.stringify(cart));

        checkoutButton.disabled = cart.length === 0;
        checkoutButton.textContent = cart.length === 0 ? 'Cart Empty :(' : 'Checkout (Final Boss)';
    };

    // Add, Remove, Increase, Decrease functions (mostly same logic, ensure IDs are handled)
    const addToCart = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) {
             console.error(`Tried to add non-existent product ID: ${productId}`);
             alert("Uh oh, couldn't find that treat. Maybe it vanished?");
             return;
         }

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ id: productId, quantity: 1 });
        }
        updateCartUI();
        openCart();
        // Remove auto-close or make it shorter/optional based on preference
        // setTimeout(closeCart, 1500);
    };

    const removeFromCart = (productId) => {
        cart = cart.filter(item => item.id !== productId);
        updateCartUI();
    };

    const increaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            updateCartUI();
        }
    };

    const decreaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) {
                removeFromCart(productId); // Remove completely if quantity is 0 or less
            } else {
                updateCartUI();
            }
        }
    };


    // Open/Close Cart Sidebar
    const openCart = () => {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
    };
    const closeCart = () => {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
    };

    // Open/Close Checkout Modal
    const openCheckout = () => {
        if (cart.length === 0) return;

        let summaryHTML = '';
        let total = 0;
        cart.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (!product || typeof product.price !== 'number') return;
            summaryHTML += `<div class="item">${item.quantity}x ${product.name}</div>`; // Simpler summary line
            total += product.price * item.quantity;
        });

        checkoutSummary.innerHTML = summaryHTML;
        checkoutTotalPrice.textContent = `LE ${total.toFixed(2)}`; // Add LE

        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        closeCart(); // Close cart sidebar
    };

    const closeCheckout = () => {
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        checkoutMessage.textContent = '';
        checkoutMessage.className = 'checkout-message';
        checkoutForm.reset();
        submitOrderButton.disabled = false; // Re-enable button on close
        submitOrderButton.textContent = 'Confirm Order (No Undos!) 💸';
    };

    // Render Products - **UPDATED FOR IMAGE URL**
    const renderProducts = () => {
        if (!productGrid) return;

        // Hide loading message once we have data (or know there's none)
         if(loadingMsg) loadingMsg.style.display = 'none';

        if (products.length === 0) {
            productGrid.innerHTML = '<p>No treats available rn. Refresh? Blame cosmic interference?</p>';
            return;
        }

        productGrid.innerHTML = ''; // Clear

        products.forEach(product => {
             // Basic check for essential data before rendering a card
             if (!product.id || !product.name || typeof product.price !== 'number' || !product.image_url) {
                 console.warn("Skipping product due to missing data:", product);
                 return;
             }

            const card = document.createElement('div');
            card.classList.add('product-card');

            // ** Using product.image_url directly for the src **
            card.innerHTML = `
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name || 'Vibe Treat'}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="description">${product.description || 'It\'s probably good.'}</p>
                    <p class="price">LE ${product.price.toFixed(2)}</p>
                     <button class="cta-button add-to-cart-btn" data-id="${product.id}">Add To Stash</button>
                 </div>
            `;
            productGrid.appendChild(card);
        });
    };

    // Fetch Products from Supabase - **FETCHING image_url**
    const fetchProducts = async () => {
         if(loadingMsg) loadingMsg.style.display = 'block'; // Show loading message
        try {
            console.log("Fetching vibes (products)...");
            // ** Selecting specific columns including image_url **
            let { data, error } = await supabase
                .from('products')
                .select('id, name, description, price, slug, image_url, created_at') // Be explicit
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                console.log("Vibes fetched:", data);
                products = data; // Store fetched products globally
                renderProducts();
                updateCartUI(); // Update cart display (useful if page loaded before products)
            } else {
                 console.log("Treat database empty? How?");
                 products = []; // Ensure products array is empty
                 renderProducts(); // Render the "no products" message
                 if(loadingMsg) loadingMsg.style.display = 'none';
            }

        } catch (error) {
            console.error('Error fetching products:', error.message);
             if(loadingMsg) loadingMsg.style.display = 'none';
            if(productGrid) productGrid.innerHTML = '<p style="color: red; text-align:center;">Failed to load treats. Maybe try sacrificing a stale croissant?</p>';
        }
    };


    // Handle Checkout Form Submission
    const handleCheckout = async (event) => {
        event.preventDefault();
        submitOrderButton.disabled = true;
        submitOrderButton.textContent = 'Sending Order...';
        checkoutMessage.textContent = '';
        checkoutMessage.className = 'checkout-message';

        const formData = new FormData(checkoutForm);
        const customerData = {
            customer_name: formData.get('customer_name'),
            customer_email: formData.get('customer_email'),
            customer_address: formData.get('customer_address'),
            customer_phone: formData.get('customer_phone') || null
        };

        // Prepare items array for Supabase (storing price at time of purchase)
        const orderItems = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            return {
                product_id: item.id,
                quantity: item.quantity,
                name: product ? product.name : 'Unknown Treat', // Store name for admin ease
                price_at_purchase: product && typeof product.price === 'number' ? product.price : 0 // Store price
            };
        });

        // Recalculate total on the backend side ideally, but also here for insertion
        const totalPrice = cart.reduce((sum, item) => {
             const product = products.find(p => p.id === item.id);
             return sum + (product && typeof product.price === 'number' ? product.price * item.quantity : 0);
         }, 0);

        // Basic validation (more robust validation recommended)
        if (!customerData.customer_name || !customerData.customer_email || !customerData.customer_address || cart.length === 0) {
            checkoutMessage.textContent = 'Hold up! Fill in Name, Email, Address & add stuff to cart!';
            checkoutMessage.classList.add('error');
            submitOrderButton.disabled = false;
            submitOrderButton.textContent = 'Confirm Order (No Undos!) 💸';
            return;
        }

        try {
            const { data, error } = await supabase
                .from('orders')
                .insert([
                    {
                        customer_name: customerData.customer_name,
                        customer_email: customerData.customer_email,
                        customer_address: customerData.customer_address,
                        customer_phone: customerData.customer_phone,
                        items: orderItems, // JSONB column in Supabase
                        total_price: totalPrice,
                        is_fulfilled: false
                    }
                ])
                .select(); // Return the inserted data

            if (error) throw error;

            console.log('Order Confirmed:', data);
            checkoutMessage.textContent = 'AYY! Order sent. We\'ll maybe ship it eventually. Check email!';
            checkoutMessage.classList.add('success');
            cart = []; // Clear cart
            localStorage.removeItem('vibeTreatsCart');
            updateCartUI();
            setTimeout(closeCheckout, 4000); // Close modal after longer success msg

        } catch (error) {
            console.error('Order submission failed:', error.message);
            checkoutMessage.textContent = `Error: ${error.message}. Did you try turning it off and on again?`;
            checkoutMessage.classList.add('error');
            submitOrderButton.disabled = false; // Re-enable on error
            submitOrderButton.textContent = 'Confirm Order (No Undos!) 💸';
        }
    };


    // --- EVENT LISTENERS ---

    // Cart Toggle
    if (cartButton) cartButton.addEventListener('click', openCart);
    if (closeCartButton) closeCartButton.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // Cart Item Actions (Delegated)
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (event) => {
            const target = event.target;
            const productId = target.dataset.id;
            if (!productId) return;

            if (target.classList.contains('increase-quantity')) {
                increaseQuantity(productId);
            } else if (target.classList.contains('decrease-quantity')) {
                decreaseQuantity(productId);
            } else if (target.classList.contains('remove-item')) {
                // Maybe skip confirm for faster removal? Depends on preference.
                // if (confirm('Sure you wanna ditch this treat?')) {
                     removeFromCart(productId);
                // }
            }
        });
    }

    // Add to Cart Button (Product Grid - Delegated)
    if (productGrid) {
        productGrid.addEventListener('click', (event) => {
            // Use closest to handle clicks inside the button (like on the text)
            const button = event.target.closest('.add-to-cart-btn');
             if (button) {
                 const productId = button.dataset.id;
                 if (productId) {
                    addToCart(productId);
                 }
             }
         });
     }

    // Checkout Modal Triggers
    if (checkoutButton) checkoutButton.addEventListener('click', openCheckout);
    if (closeCheckoutButton) closeCheckoutButton.addEventListener('click', closeCheckout);
    if (checkoutOverlay) checkoutOverlay.addEventListener('click', closeCheckout);
    if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckout);

    // --- INITIALIZATION ---
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    fetchProducts(); // Load products on page load
    // updateCartUI() called after products are fetched

}); // End DOMContentLoaded
