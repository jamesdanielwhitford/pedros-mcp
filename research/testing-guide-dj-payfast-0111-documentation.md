# Testing Guide - dj-payfast 0.1.11 documentation

Source: https://dj-payfast.readthedocs.io/en/latest/testing.html

---

```
# tests/test_views.py
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from payfast.models import PayFastPayment, PayFastNotification
import uuid

User = get_user_model()

class CheckoutViewTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')

    def test_checkout_view_requires_login(self):
        """Test checkout requires authentication"""
        self.client.logout()
        response = self.client.get(reverse('payfast:checkout'))

        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_checkout_view_creates_payment(self):
        """Test checkout creates payment record"""
        response = self.client.get(
            reverse('payfast:checkout'),
            {
                'amount': 99.99,
                'item_name': 'Test Item',
                'email_address': 'test@example.com',
            }
        )

        self.assertEqual(response.status_code, 200)

        # Check payment was created
        payment_exists = PayFastPayment.objects.filter(
            user=self.user,
            amount=99.99
        ).exists()

        self.assertTrue(payment_exists)

class WebhookViewTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.payment = PayFastPayment.objects.create(
            m_payment_id='test-123',
            amount=99.99,
            item_name='Test',
            email_address='test@example.com',
        )

    def test_webhook_post_creates_notification(self):
        """Test webhook creates notification record"""
        webhook_data = {
            'm_payment_id': 'test-123',
            'pf_payment_id': '1234567',
            'payment_status': 'COMPLETE',
            'amount_gross': '99.99',
            'amount_fee': '5.75',
            'amount_net': '94.24',
            'item_name': 'Test',
            'email_address': 'test@example.com',
        }

        response = self.client.post(
            reverse('payfast:notify'),
            data=webhook_data
        )

        # Check notification was created
        notification_exists = PayFastNotification.objects.filter(
            payment=self.payment
        ).exists()

        self.assertTrue(notification_exists)
```
