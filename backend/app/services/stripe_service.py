"""Stripe service for ACH payments."""

import stripe
from app.config import settings
from app.utils.logger import logger


if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for Stripe ACH payments."""

    async def create_ach_payment(
        self,
        customer_id: str,
        payment_method_id: str,
        amount: int,  # in cents
        metadata: dict[str, str] | None = None,
    ) -> stripe.PaymentIntent:
        """Create an ACH payment intent."""
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            customer=customer_id,
            payment_method=payment_method_id,
            payment_method_types=["us_bank_account"],
            confirm=True,
            mandate_data={
                "customer_acceptance": {
                    "type": "online",
                    "online": {
                        "ip_address": "0.0.0.0",
                        "user_agent": "CounterCart/1.0",
                    },
                },
            },
            metadata=metadata or {},
        )

        logger.info(
            "Created ACH PaymentIntent",
            {
                "payment_intent_id": payment_intent.id,
                "customer_id": customer_id,
                "amount": amount,
                "status": payment_intent.status,
            },
        )

        return payment_intent

    async def get_payment_intent(self, payment_intent_id: str) -> stripe.PaymentIntent:
        """Get a payment intent by ID."""
        return stripe.PaymentIntent.retrieve(payment_intent_id)


# Singleton instance
stripe_service = StripeService()
