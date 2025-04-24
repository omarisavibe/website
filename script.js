/* === ANIMATIONS & FEEDBACK STYLES === */

/* General Fade-In (can apply to sections, text) */
.fade-in {
    opacity: 0;
    animation: fadeInAnimation 0.6s ease-out forwards;
}
@keyframes fadeInAnimation {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Subtle pulse animation */
.pulse { animation: pulseAnimation 0.5s ease-in-out; }
@keyframes pulseAnimation {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
.pulse-quick { animation: pulseAnimation 0.3s ease-in-out; }

/* Subtle shake animation */
.shake-subtle { animation: shakeSubtleAnimation 0.5s ease-in-out; }
@keyframes shakeSubtleAnimation {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* Error Shake Animation */
.shake-error { animation: shakeErrorAnimation 0.4s linear; }
@keyframes shakeErrorAnimation {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Button Click/Adding Feedback */
.button-style-primary, .cta-button, .action-button { position: relative; overflow: hidden; }
.button-clicked::after, .button-adding::after {
    content: ''; position: absolute; top: 50%; left: 50%;
    width: 5px; height: 5px; background: rgba(255, 255, 255, 0.5);
    opacity: 0; border-radius: 50%;
    transform: scale(1) translate(-50%, -50%); transform-origin: 50% 50%;
    animation: ripple 0.4s ease-out;
}
@keyframes ripple {
  0% { transform: scale(0) translate(-50%, -50%); opacity: 1; }
  100% { transform: scale(15) translate(-50%, -50%); opacity: 0; }
}
.button-success { background-color: #4CAF50 !important; /* Green */ }
.button-adding { /* Maybe slight color change while adding? */
     background-color: var(--brand-teal);
     transform: scale(0.98);
}


/* Cart Item Animations */
.animate-item-enter {
    opacity: 0;
    transform: translateX(20px);
    animation: itemEnterAnimation 0.3s ease-out forwards;
}
@keyframes itemEnterAnimation {
    to { opacity: 1; transform: translateX(0); }
}

.animate-item-exit {
    animation: itemExitAnimation 0.3s ease-in forwards;
}
@keyframes itemExitAnimation {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.8); }
}

/* Product Card Entry Animation */
.animate-card-enter {
    opacity: 0;
    transform: translateY(30px);
    animation: cardEnterAnimation 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    animation-delay: var(--animation-delay, 0s); /* Use the delay set by JS */
}
@keyframes cardEnterAnimation {
    to { opacity: 1; transform: translateY(0); }
}


/* Cart Button Has Items state */
#cart-button.has-items {
    animation: cartPulse 0.6s ease;
    border: 2px solid var(--brand-yellow); /* Example visual cue */
}
@keyframes cartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Overlay active state (Controlled by body class) */
body.overlay-active .cart-overlay,
body.overlay-active .checkout-overlay {
    opacity: 1;
    visibility: visible;
    transition: opacity 0.4s ease;
}

/* Checkout Form Validation Error Highlight */
input.input-error, textarea.input-error {
    border-color: #FF3399 !important; /* Pink border */
    background-color: #FFF5F9; /* Light pink background */
    animation: shakeErrorAnimation 0.3s linear; /* Shake the input */
}

/* Notification Styling (Basic) */
.notification {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px); /* Start below screen */
    padding: 15px 25px;
    border-radius: var(--radius-main);
    background-color: var(--text-dark);
    color: var(--text-light);
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bounce effect */
}
.notification.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}
.notification-success { background-color: var(--brand-teal); }
.notification-error { background-color: #c62828; } /* Red */
.notification-warn { background-color: #FFC107; color: var(--text-dark);} /* Amber */
.notification-info { background-color: #546E7A; } /* Blue Grey */


/* Loading Indicator */
#loading-indicator {
  font-size: 1.2rem;
  color: var(--brand-teal);
  font-weight: 600;
  text-align: center;
  padding: 3rem;
  /* Add a spinner maybe? */
}
