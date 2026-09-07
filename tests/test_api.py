import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_register_and_login():
    user_data = {
        "email": "test_user@example.com",
        "full_name": "Test User",
        "password": "testpassword123"
    }
    register_res = client.post("/api/v1/auth/register", json=user_data)
    assert register_res.status_code in [201, 400]

    login_data = {
        "username": "test_user@example.com",
        "password": "testpassword123"
    }
    login_res = client.post("/api/v1/auth/login", data=login_data)
    assert login_res.status_code == 200
    token = login_res.json()
    assert "access_token" in token
    assert token["token_type"] == "bearer"

def test_calculate_route():
    payload = {
        "origin_id": "plaza_mayor",
        "destination_id": "mirador"
    }
    response = client.post("/api/v1/routes/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "total_time_minutes" in data
    assert "route" in data
    assert len(data["route"]) > 0
