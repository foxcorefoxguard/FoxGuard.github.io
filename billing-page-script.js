document.addEventListener('DOMContentLoaded', () => {
  // Change Card Modal Interactions
  const changeCardButton = document.querySelector('#visa-card button');
  const changeCardModal = document.querySelector('#change-card-modal');
  const changeCardCloseButtons = changeCardModal.querySelectorAll('button');

  // Open Change Card Modal
  changeCardButton.addEventListener('click', () => {
    changeCardModal.classList.remove('hidden');
    changeCardModal.classList.add('flex');
  });

  // Close Change Card Modal
  changeCardCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      changeCardModal.classList.add('hidden');
      changeCardModal.classList.remove('flex');
    });
  });

  // Other Modal Interactions
  // Manage Subscription Modal
  const manageSubscriptionButtons = document.querySelectorAll('[aria-labelledby="subscription-modal-title"]');
  const subscriptionModal = document.querySelector('#subscription-modal');
  const subscriptionCloseButtons = subscriptionModal.querySelectorAll('button');

  manageSubscriptionButtons.forEach(button => {
    button.addEventListener('click', () => {
      subscriptionModal.classList.remove('hidden');
      subscriptionModal.classList.add('flex');
    });
  });

  subscriptionCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      subscriptionModal.classList.add('hidden');
      subscriptionModal.classList.remove('flex');
    });
  });

  // Add Payment Method Modal
  const addPaymentMethodButton = document.querySelector('#add-payment-method-modal + button');
  const addPaymentMethodModal = document.querySelector('#add-payment-method-modal');
  const addPaymentMethodCloseButtons = addPaymentMethodModal.querySelectorAll('button');

  addPaymentMethodButton.addEventListener('click', () => {
    addPaymentMethodModal.classList.remove('hidden');
    addPaymentMethodModal.classList.add('flex');
  });

  addPaymentMethodCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      addPaymentMethodModal.classList.add('hidden');
      addPaymentMethodModal.classList.remove('flex');
    });
  });

  // Unlink PayPal Modal
  const unlinkPayPalButton = document.querySelector('#paypal-method button');
  const unlinkPayPalModal = document.querySelector('#unlink-paypal-modal');
  const unlinkPayPalCloseButtons = unlinkPayPalModal.querySelectorAll('button');

  unlinkPayPalButton.addEventListener('click', () => {
    unlinkPayPalModal.classList.remove('hidden');
    unlinkPayPalModal.classList.add('flex');
  });

  unlinkPayPalCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      unlinkPayPalModal.classList.add('hidden');
      unlinkPayPalModal.classList.remove('flex');
    });
  });
});
