# ============================================================
# tests/integration/test_courses_integration.py
# Integration tests using FastAPI TestClient + real PostgreSQL.
# Requires: coursedb_test database with Flyway migrations applied.
#
# Setup:
#   createdb coursedb_test
#   DB_NAME=coursedb_test bash db/run-flyway.sh migrate
#
# Run:
#   TEST_DB_NAME=coursedb_test pytest tests/integration/ -v
# ============================================================
import os
import pytest
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# ── Environment setup BEFORE importing app ────────────────────
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("PORT", "8083")
os.environ.setdefault("JWT_SECRET", "integration_test_jwt_secret_course_service_2024")
os.environ.setdefault("DB_HOST", os.getenv("TEST_DB_HOST", "localhost"))
os.environ.setdefault("DB_PORT", os.getenv("TEST_DB_PORT", "5432"))
os.environ.setdefault("DB_NAME", os.getenv("TEST_DB_NAME", "coursedb_test"))
os.environ.setdefault("DB_USER", os.getenv("TEST_DB_USER", "emart_course"))
os.environ.setdefault("DB_PASSWORD", os.getenv("TEST_DB_PASSWORD", ""))

from httpx import AsyncClient, ASGITransport
from app.main import app

JWT_SECRET = "integration_test_jwt_secret_course_service_2024"


def make_token(**overrides) -> str:
    """Generate a test JWT in the same format as the Login Service."""
    payload = {
        "userId": "integration-user-001",
        "sub": "integrationtest@emart.com",
        "name": "Integration Test User",
        "roles": ["ROLE_USER"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
        **overrides,
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


AUTH_HEADERS = {"Authorization": f"Bearer {make_token()}"}

# Track created IDs for cleanup
CREATED_IDS: list[int] = []


# ── Async test client ─────────────────────────────────────────
@pytest.fixture(scope="module")
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ── Cleanup test data ─────────────────────────────────────────
@pytest.fixture(autouse=True, scope="module")
async def cleanup(client):
    yield
    # Delete all __test__ prefixed courses created during tests
    for course_id in CREATED_IDS:
        try:
            await client.delete(f"/api/v1/courses/{course_id}", headers=AUTH_HEADERS)
        except Exception:
            pass


# ============================================================
# H001 — Health Endpoints
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestHealthIntegration:

    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "UP"
        assert "service" in body

    async def test_liveness_returns_200(self, client):
        response = await client.get("/health/live")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "UP"
        assert body["probe"] == "liveness"

    async def test_readiness_returns_200_with_postgresql(self, client):
        response = await client.get("/health/ready")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "UP"
        assert body["probe"] == "readiness"
        assert body["checks"]["postgresql"] == "UP"


# ============================================================
# A001 — Authentication
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestAuthIntegration:

    async def test_courses_returns_401_without_token(self, client):
        response = await client.get("/api/v1/courses")
        assert response.status_code == 401

    async def test_courses_returns_401_for_invalid_token(self, client):
        response = await client.get(
            "/api/v1/courses",
            headers={"Authorization": "Bearer not.a.valid.jwt.token"},
        )
        assert response.status_code == 401

    async def test_courses_returns_401_for_expired_token(self, client):
        expired = pyjwt.encode(
            {"userId": "u1", "sub": "u@e.com", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            JWT_SECRET, algorithm="HS256",
        )
        response = await client.get(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {expired}"},
        )
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()

    async def test_health_works_without_auth(self, client):
        """Health endpoints must NOT require auth."""
        response = await client.get("/health")
        assert response.status_code == 200


# ============================================================
# C001 — GET /api/v1/courses
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestListCoursesIntegration:

    async def test_returns_200_with_courses_array(self, client):
        response = await client.get("/api/v1/courses", headers=AUTH_HEADERS)
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert isinstance(body["data"]["courses"], list)
        assert "total" in body["data"]

    async def test_response_has_required_card_fields(self, client):
        """Each course must have the fields used in the card display."""
        response = await client.get("/api/v1/courses", headers=AUTH_HEADERS)
        assert response.status_code == 200
        courses = response.json()["data"]["courses"]
        if courses:
            course = courses[0]
            assert "id" in course        # Add to Cart uses id
            assert "name" in course      # 50% of card
            assert "author" in course    # 20% of card
            assert "cost" in course      # 20% of card

    async def test_filters_by_category(self, client):
        response = await client.get(
            "/api/v1/courses?category=programming", headers=AUTH_HEADERS
        )
        assert response.status_code == 200
        courses = response.json()["data"]["courses"]
        for course in courses:
            assert course["category"] == "programming"

    async def test_pagination_with_limit_offset(self, client):
        response = await client.get(
            "/api/v1/courses?limit=2&offset=0", headers=AUTH_HEADERS
        )
        assert response.status_code == 200
        body = response.json()
        assert body["data"]["limit"] == 2
        assert len(body["data"]["courses"]) <= 2


# ============================================================
# C002 — POST /api/v1/courses — Create
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestCreateCourseIntegration:

    async def test_creates_course_returns_201(self, client):
        payload = {
            "name": "__test_Integration Python Course",
            "author": "__test_Integration Author",
            "cost": 399.99,
            "description": "Created by integration test",
            "category": "programming",
            "stock": 50,
        }
        response = await client.post(
            "/api/v1/courses", json=payload, headers=AUTH_HEADERS
        )
        assert response.status_code == 201
        body = response.json()
        assert body["success"] is True
        assert body["data"]["name"] == payload["name"]
        assert body["data"]["author"] == payload["author"]
        assert float(body["data"]["cost"]) == pytest.approx(399.99)
        assert "id" in body["data"]
        CREATED_IDS.append(body["data"]["id"])

    async def test_returns_400_missing_name(self, client):
        response = await client.post(
            "/api/v1/courses",
            json={"author": "Jane", "cost": 100},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 422  # FastAPI validation

    async def test_returns_400_negative_cost(self, client):
        response = await client.post(
            "/api/v1/courses",
            json={"name": "Course", "author": "Jane", "cost": -100},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 422

    async def test_returns_400_missing_author(self, client):
        response = await client.post(
            "/api/v1/courses",
            json={"name": "Course", "cost": 100},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 422


# ============================================================
# C003 — GET /api/v1/courses/{id}
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestGetCourseIntegration:

    @pytest.fixture(scope="class")
    async def test_course_id(self, client):
        resp = await client.post(
            "/api/v1/courses",
            json={"name": "__test_GetById", "author": "__test_Author", "cost": 199},
            headers=AUTH_HEADERS,
        )
        cid = resp.json()["data"]["id"]
        CREATED_IDS.append(cid)
        yield cid

    async def test_get_returns_200_with_correct_data(self, client, test_course_id):
        response = await client.get(
            f"/api/v1/courses/{test_course_id}", headers=AUTH_HEADERS
        )
        assert response.status_code == 200
        assert response.json()["data"]["id"] == test_course_id

    async def test_get_returns_404_not_found(self, client):
        response = await client.get(
            "/api/v1/courses/999999999", headers=AUTH_HEADERS
        )
        assert response.status_code == 404


# ============================================================
# C004 — PUT /api/v1/courses/{id} — Update
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestUpdateCourseIntegration:

    @pytest.fixture(scope="class")
    async def test_course_id(self, client):
        resp = await client.post(
            "/api/v1/courses",
            json={"name": "__test_UpdateOrig", "author": "__test_Author", "cost": 100},
            headers=AUTH_HEADERS,
        )
        cid = resp.json()["data"]["id"]
        CREATED_IDS.append(cid)
        yield cid

    async def test_update_name_and_cost(self, client, test_course_id):
        response = await client.put(
            f"/api/v1/courses/{test_course_id}",
            json={"name": "__test_UpdatedName", "cost": 299.00},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["data"]["name"] == "__test_UpdatedName"
        assert float(body["data"]["cost"]) == pytest.approx(299.00)

    async def test_update_nonexistent_returns_404(self, client):
        response = await client.put(
            "/api/v1/courses/999999999",
            json={"name": "Updated"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404


# ============================================================
# C005 — DELETE /api/v1/courses/{id}
# ============================================================
@pytest.mark.integration
@pytest.mark.asyncio
class TestDeleteCourseIntegration:

    async def test_soft_delete_returns_200(self, client):
        # Create a course specifically for deletion test
        resp = await client.post(
            "/api/v1/courses",
            json={"name": "__test_DeleteMe", "author": "__test_Auth", "cost": 50},
            headers=AUTH_HEADERS,
        )
        cid = resp.json()["data"]["id"]

        response = await client.delete(
            f"/api/v1/courses/{cid}", headers=AUTH_HEADERS
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_deleted_course_returns_404_on_get(self, client):
        resp = await client.post(
            "/api/v1/courses",
            json={"name": "__test_DeleteHidden", "author": "__test_Auth", "cost": 50},
            headers=AUTH_HEADERS,
        )
        cid = resp.json()["data"]["id"]
        await client.delete(f"/api/v1/courses/{cid}", headers=AUTH_HEADERS)

        # GET after delete must return 404 (soft-deleted, not visible)
        get_resp = await client.get(f"/api/v1/courses/{cid}", headers=AUTH_HEADERS)
        assert get_resp.status_code == 404

    async def test_delete_nonexistent_returns_404(self, client):
        response = await client.delete(
            "/api/v1/courses/999999999", headers=AUTH_HEADERS
        )
        assert response.status_code == 404
