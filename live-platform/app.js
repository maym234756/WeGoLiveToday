// ✅ Replace with your actual Stripe publishable key
const stripe = Stripe("pk_test_XXXXXXXXXXXXXXXXXXXXXXXX");

const elements = stripe.elements();
const card = elements.create("card");
card.mount("#card-element");

// Handle real-time validation errors
card.on("change", (event) => {
  const displayError = document.getElementById("card-errors");
  displayError.textContent = event.error ? event.error.message : "";
});

// Handle form submission
const form = document.getElementById("payment-form");
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nameInput = document.getElementById("name");
  const cardholderName = nameInput.value;

  // 🔐 Create a PaymentMethod object
  const { error, paymentMethod } = await stripe.createPaymentMethod({
    type: "card",
    card: card,
    billing_details: {
      name: cardholderName,
    },
  });

  if (error) {
    // Display error
    document.getElementById("card-errors").textContent = error.message;
  } else {
    // ✅ Send paymentMethod.id to your backend
    console.log("PaymentMethod ID:", paymentMethod.id);

    // Example fetch call to your backend endpoint
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
    });

    const result = await response.json();
    if (result.success) {
      alert("Payment processed successfully!");
    } else {
      document.getElementById("card-errors").textContent = result.message;
    }
  }
});
