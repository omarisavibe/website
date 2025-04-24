document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE CLIENT SETUP ---
    // IMPORTANT: Replace with your actual Supabase URL and Anon Key
    const SUPABASE_URL = 'https://oljmjsegopkyqnujrzyi.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sam1qc2Vnb3BreXFudWpyenlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjY3MjIsImV4cCI6MjA2MTA0MjcyMn0.hLOLhq6UOYsLsPpM';

    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error("🚨 Supabase URL or Anon Key not configured! Please update script.js");
        alert("Website configuration missing. Please contact the site owner.");
        // Optionally disable functionality
        document.getElementById('product-grid').innerHTML = '<p style="color: red;">Store configuration error.</p>';
        return; // Stop further execution
    }

    let supabase;
    try {
         supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
         console.log("Supabase client initialized.");
    } catch (error) {
        console.error("🚨 Error initializing Supabase client:", error);
        alert("Failed to connect to the store backend. Please try again later.");
         document.getElementById('product-grid').innerHTML = '<p style="color: red;">Store connection error.</p>';
        return; // Stop further execution
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
    const checkoutMessage = document.getElementById('checkout-message');
    const yearSpan = document.getElementById('year');

    // --- CART STATE ---
    let cart = JSON.parse(localStorage.getItem('vibeTreatsCart')) || [];
    let products = []; // To store fetched products

    // --- FUNCTIONS ---

    // Update Cart UI (Sidebar & Count)
    const updateCartUI = () => {
        cartItemsContainer.innerHTML = ''; // Clear previous items
        let total = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is lookin\' kinda sad rn.</p>';
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (!product) return; // Skip if product details aren't loaded yet

                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                itemElement.innerHTML = `
                    <img src="placeholder-cookie-${product.slug}.png" alt="${product.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p>$${product.price.toFixed(2)} x ${item.quantity}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="decrease-quantity" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity" data-id="${item.id}">+</button>
                        <button class="remove-item" data-id="${item.id}">&times;</button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
                total += product.price * item.quantity;
                itemCount += item.quantity;
            });
        }

        cartTotalPrice.textContent = total.toFixed(2);
        cartCount.textContent = itemCount;
        localStorage.setItem('vibeTreatsCart', JSON.stringify(cart));

        // Disable checkout if cart is empty
        checkoutButton.disabled = cart.length === 0;
    };

    // Add Item to Cart
    const addToCart = (productId) => {
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ id: productId, quantity: 1 });
        }
        updateCartUI();
        // Optionally open cart sidebar briefly
        openCart();
        setTimeout(closeCart, 1500); // Close after 1.5 seconds
    };

    // Remove Item from Cart
     const removeFromCart = (productId) => {
        cart = cart.filter(item => item.id !== productId);
        updateCartUI();
    };

     // Increase Quantity
    const increaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            updateCartUI();
        }
    };

    // Decrease Quantity
    const decreaseQuantity = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                updateCartUI();
            }
        }
    };

    // Open Cart Sidebar
    const openCart = () => {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
    };

    // Close Cart Sidebar
    const closeCart = () => {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
    };

     // Open Checkout Modal
    const openCheckout = () => {
        if (cart.length === 0) return; // Don't open if cart is empty

        let summaryHTML = '';
        let total = 0;
         cart.forEach(item => {
            const product = products.find(p => p.id === item.id);
             if (!product) return;
             summaryHTML += `<div class="item">${item.quantity}x ${product.name} - $${(product.price * item.quantity).toFixed(2)}</div>`;
             total += product.price * item.quantity;
         });

        checkoutSummary.innerHTML = summaryHTML;
        checkoutTotalPrice.textContent = total.toFixed(2);

        checkoutModal.classList.add('active');
        checkoutOverlay.classList.add('active');
        closeCart(); // Close cart when opening checkout
    };

     // Close Checkout Modal
    const closeCheckout = () => {
        checkoutModal.classList.remove('active');
        checkoutOverlay.classList.remove('active');
        checkoutMessage.textContent = ''; // Clear any previous messages
        checkoutMessage.className = 'checkout-message'; // Reset class
        checkoutForm.reset(); // Clear form fields
    };

    // Render Products on Page Load
    const renderProducts = () => {
        if (!productGrid) return; // Exit if grid doesn't exist
         if (products.length === 0) {
            productGrid.innerHTML = '<p>No treats available right now... check back later?</p>';
            return;
        }

        productGrid.innerHTML = ''; // Clear loading message or previous products

        products.forEach(product => {
            const card = document.createElement('div');
            card.classList.add('product-card');
            // Use a placeholder naming convention
            const imageSrc = `placeholder-cookie-${product.slug}.png`;

            card.innerHTML = `
                <img src="${imageSrc}" alt="${product.name}" loading="lazy">
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button class="cta-button add-to-cart" data-id="${product.id}">Add to Cart (Do It)</button>
            `;
            productGrid.appendChild(card);
        });
    };

     // Fetch Products from Supabase
    const fetchProducts = async () => {
        try {
            console.log("Fetching products from Supabase...");
            let { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: true }); // Or order by name, etc.

            if (error) {
                throw error;
            }

             if (data) {
                console.log("Products fetched:", data);
                products = data; // Store fetched products globally
                renderProducts();
                updateCartUI(); // Update cart in case prices were fetched after load
            } else {
                 console.log("No products found in database.");
                  productGrid.innerHTML = '<p>Hmm, no treats found. Maybe I ate them all?</p>';
            }


        } catch (error) {
            console.error('Error fetching products:', error.message);
             productGrid.innerHTML = '<p style="color: red;">Could not load treats. Vibe check failed.</p>';
        }
    };


    // Handle Checkout Form Submission
    const handleCheckout = async (event) => {
        event.preventDefault(); // Prevent default form submission
        const submitButton = document.getElementById('submit-order-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        checkoutMessage.textContent = '';
         checkoutMessage.className = 'checkout-message';

        const formData = new FormData(checkoutForm);
        const customerData = {
            customer_name: formData.get('customer_name'),
            customer_email: formData.get('customer_email'),
            customer_address: formData.get('customer_address'),
            customer_phone: formData.get('customer_phone') || null // Send null if empty
        };

        const orderItems = cart.map(item => {
             const product = products.find(p => p.id === item.id);
             return {
                product_id: item.id,
                quantity: item.quantity,
                name: product ? product.name : 'Unknown Product', // Include name for easier reading
                price_at_purchase: product ? product.price : 0 // Store price when ordered
            };
        });

        const totalPrice = cart.reduce((sum, item) => {
             const product = products.find(p => p.id === item.id);
             return sum + (product ? product.price * item.quantity : 0);
         }, 0);


        try {
            const { data, error } = await supabase
                .from('orders')
                .insert([
                    {
                        customer_name: customerData.customer_name,
                        customer_email: customerData.customer_email,
                        customer_address: customerData.customer_address,
                        customer_phone: customerData.customer_phone,
                        items: orderItems, // Store the structured item data
                        total_price: totalPrice,
                        is_fulfilled: false // Default value
                    }
                ])
                .select(); // select() returns the inserted data

            if (error) {
                throw error; // Throw error to be caught below
            }

             console.log('Order submitted successfully:', data);
             checkoutMessage.textContent = 'Success! Your order is in. We\'ll judge your choices later.';
             checkoutMessage.classList.add('success');

            // Clear cart after successful order
            cart = [];
            localStorage.removeItem('vibeTreatsCart');
            updateCartUI();

            // Close modal after a delay
            setTimeout(closeCheckout, 3000);


        } catch (error) {
            console.error('Error submitting order:', error.message);
            checkoutMessage.textContent = `Error: ${error.message}. Try again maybe? Or just cry.`;
             checkoutMessage.classList.add('error');

        } finally {
             submitButton.disabled = false;
            submitButton.textContent = 'Send It (No Take-Backs!)';
        }
    };

    // --- EVENT LISTENERS ---

    // Toggle Cart Sidebar
    if (cartButton) {
        cartButton.addEventListener('click', openCart);
    }
    if (closeCartButton) {
        closeCartButton.addEventListener('click', closeCart);
    }
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCart);
    }

    // Add to Cart, Quantity, Remove actions (delegated listener)
     if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (event) => {
            const target = event.target;
            const productId = target.dataset.id;

            if (!productId) return; // Exit if clicked element doesn't have data-id

             if (target.classList.contains('add-to-cart')) {
                 // Note: add-to-cart is handled on productGrid listener below
             } else if (target.classList.contains('increase-quantity')) {
                increaseQuantity(productId);
             } else if (target.classList.contains('decrease-quantity')) {
                decreaseQuantity(productId);
             } else if (target.classList.contains('remove-item')) {
                if (confirm('Really remove this? No regrets?')) { // Optional confirmation
                     removeFromCart(productId);
                 }
             }
         });
     }

    // Add to Cart button on product cards (delegated listener)
    if (productGrid) {
        productGrid.addEventListener('click', (event) => {
             if (event.target.classList.contains('add-to-cart')) {
                const productId = event.target.dataset.id;
                if (productId) {
                    addToCart(productId);
                }
            }
        });
    }


     // Checkout Process
    if (checkoutButton) {
        checkoutButton.addEventListener('click', openCheckout);
    }
    if (closeCheckoutButton) {
        closeCheckoutButton.addEventListener('click', closeCheckout);
    }
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener('click', closeCheckout);
    }
     if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }


    // --- INITIALIZATION ---
     if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear(); // Set current year in footer
    }
     fetchProducts(); // Fetch products when the page loads
    // updateCartUI(); // Initial cart rendering handled within fetchProducts' success now

}); // End DOMContentLoaded
