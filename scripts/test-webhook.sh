#!/usr/bin/env bash
# Quick webhook test: sends a sample Meta-style payload to your Cloud Run webhook.
# Usage: WEBHOOK_URL=https://YOUR_CLOUD_RUN_URL/webhook ./scripts/test-webhook.sh
# Or:   ./scripts/test-webhook.sh https://YOUR_CLOUD_RUN_URL/webhook

set -e
URL="${WEBHOOK_URL:-$1}"
if [ -z "$URL" ]; then
  echo "Usage: WEBHOOK_URL=https://kweka-jeeto-XXXX.asia-south1.run.app/webhook ./scripts/test-webhook.sh"
  echo "   Or: ./scripts/test-webhook.sh https://kweka-jeeto-XXXX.asia-south1.run.app/webhook"
  exit 1
fi

# Sample payload: one text message (like Meta sends when a user sends "hi")
# Replace the "from" number with your WhatsApp number (with country code, no +) to receive the flow reply.
BODY='{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "1054253247766327",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "123" },
        "messages": [{
          "from": "919876543210",
          "id": "wamid.test123",
          "timestamp": "1234567890",
          "type": "text",
          "text": { "body": "hi" }
        }]
      },
      "field": "messages"
    }]
  }]
}'

echo "Sending sample webhook payload to $URL ..."
HTTP=$(curl -s -o /tmp/webhook-test-out.txt -w "%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$BODY")

if [ "$HTTP" = "200" ]; then
  echo "OK: Webhook returned 200. Subscription is reachable; backend processed the payload."
  echo "Check Cloud Run logs to see the incoming message and any flow send."
  echo "To receive the flow on your phone, edit this script and set \"from\" to your WhatsApp number (e.g. 919876543210)."
else
  echo "Unexpected status: $HTTP"
  cat /tmp/webhook-test-out.txt
  exit 1
fi
