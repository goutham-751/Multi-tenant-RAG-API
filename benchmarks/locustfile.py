"""
Locust load test for the Multi-Tenant RAG API.

Usage:
  locust -f benchmarks/locustfile.py --headless -u 20 -r 5 --run-time 5m \
    --host http://localhost:8000

Before running:
  1. Start the API: uvicorn app.main:app
  2. Register a tenant and set the API_KEY env var:
     export RAG_API_KEY="sk-your-key-here"

Traffic mix:
  - 70% query requests
  - 20% list documents
  - 10% health checks
"""

import os

from locust import HttpUser, between, task


class RAGUser(HttpUser):
    """Simulates a typical API consumer with mixed traffic patterns."""

    wait_time = between(0.5, 2.0)

    def on_start(self):
        """Set up auth headers from environment."""
        api_key = os.environ.get("RAG_API_KEY", "sk-test-key")
        self.headers = {"X-API-Key": api_key}
        self.questions = [
            "What is the refund policy?",
            "How do I contact support?",
            "What are the pricing tiers?",
            "Explain the onboarding process.",
            "What integrations are available?",
        ]
        self._q_idx = 0

    @task(7)
    def query_document(self):
        """POST /api/v1/query — main RAG query (70% of traffic)."""
        question = self.questions[self._q_idx % len(self.questions)]
        self._q_idx += 1

        self.client.post(
            "/api/v1/query",
            json={"question": question},
            headers=self.headers,
            name="/api/v1/query",
        )

    @task(2)
    def list_documents(self):
        """GET /api/v1/documents — list tenant docs (20% of traffic)."""
        self.client.get(
            "/api/v1/documents",
            headers=self.headers,
            name="/api/v1/documents",
        )

    @task(1)
    def health_check(self):
        """GET /health — health ping (10% of traffic)."""
        self.client.get("/health", name="/health")
