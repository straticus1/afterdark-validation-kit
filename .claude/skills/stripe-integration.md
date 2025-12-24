# Stripe Integration Skill

## Overview
This skill enables robust, PCI-compliant payment flows including checkout, subscriptions, webhooks, and refunds for the AfterDark ecosystem.

## When to Use
- Implementing payment processing on any AfterDark site
- Setting up subscription billing (n8nworkflo.ws, infrastructure.zone)
- Adding one-time purchases (lonely.fyi tokens, undatable.me premium)
- Handling refunds and disputes
- Creating marketplace flows (Stripe Connect)

## Core Payment Patterns

### 1. Hosted Checkout Sessions (Recommended)
Stripe-managed payment pages - minimal PCI burden.

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Premium Subscription' },
      unit_amount: 999, // $9.99
      recurring: { interval: 'month' }
    },
    quantity: 1
  }],
  mode: 'subscription',
  success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cancel',
  metadata: { user_id: userId }
});
```

### 2. Payment Intents (Custom UI)
Full customization with Stripe.js Elements.

```javascript
// Backend
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1999,
  currency: 'usd',
  automatic_payment_methods: { enabled: true },
  metadata: { order_id: orderId }
});

// Frontend
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: 'https://yoursite.com/complete' }
});
```

### 3. Subscriptions
```javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_xxx' }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});
```

## Critical Webhook Events

Always handle these events:
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `customer.subscription.updated` - Sub changed
- `customer.subscription.deleted` - Sub cancelled
- `charge.refunded` - Refund processed
- `invoice.payment_succeeded` - Invoice paid

### Webhook Handler
```javascript
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event idempotently
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Fulfill order
      break;
    case 'customer.subscription.deleted':
      // Revoke access
      break;
  }

  res.json({ received: true });
});
```

## Customer Portal
Let customers manage their own subscriptions:

```javascript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://yoursite.com/account'
});
// Redirect to portalSession.url
```

## Refunds
```javascript
// Full refund
await stripe.refunds.create({ payment_intent: 'pi_xxx' });

// Partial refund
await stripe.refunds.create({
  payment_intent: 'pi_xxx',
  amount: 500 // $5.00
});
```

## Test Cards
| Card Number | Scenario |
|-------------|----------|
| 4242424242424242 | Success |
| 4000000000000002 | Decline |
| 4000002500003155 | 3D Secure |
| 4000000000009995 | Insufficient funds |

## AfterDark Implementation Priority

1. **lonely.fyi** - Token purchase system (one-time payments)
2. **undatable.me** - Premium tiers ($9.99, $19.99/month subscriptions)
3. **n8nworkflo.ws** - Workflow hosting tiers
4. **infrastructure.zone** - Compute rental (usage-based billing)
5. **warp-oci** - AI agent session billing

## Environment Variables Needed
```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Best Practices
1. Always use webhooks for fulfillment (don't trust client redirects)
2. Use idempotency keys for retries
3. Store Stripe customer IDs in your database
4. Use metadata to link Stripe objects to your records
5. Test thoroughly with test mode before going live
6. Never log or store raw card numbers
