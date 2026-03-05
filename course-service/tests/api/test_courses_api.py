# ============================================================
# tests/api/test_courses_api.py
# API tests against a RUNNING Course Service.
# Requires: real running server + valid JWT from Login Service.
#
# Usage:
#   # Step 1: Get JWT from Login Service
#   TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
#     -H 'Content-Type: application/json' \
#     -d '{"email":"admin@emart.com","password":"Admin@Emart#2024"}' \
#     | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
#
#   # Step 2: Run API tests
#   API_BASE_URL=http://localhost:8083 JWT_TOKEN=$TOKEN pytest tests/api/ -v
# ============================================================
import os
import sys
import pytest
import httpx
from datetime import datetime

# ── Config from environment ───────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8083")
JWT_TOKEN    = os.getenv("JWT_TOKEN", "")

if not JWT_TOKEN:
    pytest.exit(
        "\n❌ JWT_TOKEN environment variable is required.\n"
        "   Get a token: POST http://localhost:8080/api/v1/auth/login\n",
        returncode=1,
    )

AUTH_HEADERS = {"Authorization": f"Bearer {JWT_TOKEN}"}

# Cleanup tracker
CREATED_IDS: list[int] = []


# ── Sync HTTP client (no event loop needed for API tests) ─────
@pytest.fixture(scope="module")
def api():
    with httpx.Client(base_url=API_BASE_URL, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="module", autouse=True)
def cleanup_after_all(api):
    yield
    for cid in CREATED_IDS:
        try:
            api.delete(f"/api/v1/courses/{cid}", headers=AUTH_HEADERS)
        except Exception:
            pass
    print(f"\nAPI Tests: cleaned up {len(CREATED_IDS)} test courses")


# ============================================================
# H001 — GET /health
# ============================================================
@pytest.mark.api
class TestApiHealth:

    def test_health_returns_200_no_auth(self, api):
        r = api.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "UP"
        assert "service" in body
        assert "course" in body["service"].lower()
        assert "version" in body
        assert "timestamp" in body

    def test_liveness_returns_200_no_auth(self, api):
        r = api.get("/health/live")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "UP"
        assert body["probe"] == "liveness"

    def test_readiness_returns_200_postgresql_up(self, api):
        r = api.get("/health/ready")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "UP"
        assert body["probe"] == "readiness"
        assert body["checks"]["postgresql"] == "UP"

    def test_health_response_time_under_500ms(self, api):
        """Health check must respond quickly — critical for K8s probes."""
        import time
        start = time.time()
        r = api.get("/health")
        elapsed = (time.time() - start) * 1000
        assert r.status_code == 200
        assert elapsed < 500, f"Health check took {elapsed:.0f}ms (limit: 500ms)"


# ============================================================
# A001 — Authentication
# ============================================================
@pytest.mark.api
class TestApiAuthentication:

    def test_courses_401_no_token(self, api):
        r = api.get("/api/v1/courses")
        assert r.status_code == 401

    def test_courses_401_malformed_token(self, api):
        r = api.get("/api/v1/courses", headers={"Authorization": "Bearer garbage.token"})
        assert r.status_code == 401

    def test_courses_401_missing_bearer_prefix(self, api):
        r = api.get("/api/v1/courses", headers={"Authorization": JWT_TOKEN})
        assert r.status_code == 401


# ============================================================
# C001 — GET /api/v1/courses — List
# ============================================================
@pytest.mark.api
class TestApiListCourses:

    def test_list_returns_200_with_array(self, api):
        r = api.get("/api/v1/courses", headers=AUTH_HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert isinstance(body["data"]["courses"], list)
        assert isinstance(body["data"]["total"], int)

    def test_list_courses_have_card_fields(self, api):
        """Verify all fields required by the frontend card exist."""
        r = api.get("/api/v1/courses", headers=AUTH_HEADERS)
        assert r.status_code == 200
        courses = r.json()["data"]["courses"]
        if courses:
            c = courses[0]
            # Card fields: 50% name, 20% author, 20% cost, 10% Add to Cart (id)
            assert "id"     in c, "id missing — Add to Cart button needs it"
            assert "name"   in c, "name missing — 50% of card"
            assert "author" in c, "author missing — 20% of card"
            assert "cost"   in c, "cost missing — 20% of card"

    def test_filter_by_category_programming(self, api):
        r = api.get("/api/v1/courses?category=programming", headers=AUTH_HEADERS)
        assert r.status_code == 200
        for course in r.json()["data"]["courses"]:
            assert course["category"] == "programming"

    def test_filter_by_level(self, api):
        r = api.get("/api/v1/courses?level=beginner", headers=AUTH_HEADERS)
        assert r.status_code == 200
        for course in r.json()["data"]["courses"]:
            if course.get("level"):
                assert course["level"] == "beginner"

    def test_search_returns_matching_courses(self, api):
        r = api.get("/api/v1/courses?search=python", headers=AUTH_HEADERS)
        assert r.status_code == 200

    def test_pagination_limit_offset(self, api):
        r = api.get("/api/v1/courses?limit=3&offset=0", headers=AUTH_HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert body["data"]["limit"] == 3
        assert len(body["data"]["courses"]) <= 3


# ============================================================
# C002 — POST /api/v1/courses — Create
# ============================================================
@pytest.mark.api
class TestApiCreateCourse:

    def test_create_course_201(self, api):
        payload = {
            "name": f"__api_test_course_{datetime.utcnow().timestamp()}",
            "author": "API Test Instructor",
            "cost": 399.99,
            "description": "Created by API test suite",
            "category": "programming",
            "level": "beginner",
            "stock": 25,
        }
        r = api.post("/api/v1/courses", json=payload, headers=AUTH_HEADERS)
        assert r.status_code == 201
        body = r.json()
        assert body["success"] is True
        assert body["data"]["name"] == payload["name"]
        assert body["data"]["author"] == payload["author"]
        assert float(body["data"]["cost"]) == pytest.approx(399.99, rel=0.01)
        assert "id" in body["data"]
        CREATED_IDS.append(body["data"]["id"])

    def test_create_course_appears_in_list(self, api):
        """Course created via POST must appear in GET /courses (card grid updates)."""
        name = f"__api_test_appears_{datetime.utcnow().timestamp()}"
        create_r = api.post(
            "/api/v1/courses",
            json={"name": name, "author": "Author", "cost": 99},
            headers=AUTH_HEADERS,
        )
        assert create_r.status_code == 201
        cid = create_r.json()["data"]["id"]
        CREATED_IDS.append(cid)

        # Must appear in GET list
        list_r = api.get("/api/v1/courses", headers=AUTH_HEADERS)
        ids = [c["id"] for c in list_r.json()["data"]["courses"]]
        assert cid in ids, "Newly created course not found in list"

    def test_create_422_missing_name(self, api):
        r = api.post(
            "/api/v1/courses",
            json={"author": "Jane", "cost": 100},
            headers=AUTH_HEADERS,
        )
        assert r.status_code == 422

    def test_create_422_missing_author(self, api):
        r = api.post(
            "/api/v1/courses",
            json={"name": "Course", "cost": 100},
            headers=AUTH_HEADERS,
        )
        assert r.status_code == 422

    def test_create_422_negative_cost(self, api):
        r = api.post(
            "/api/v1/courses",
            json={"name": "Course", "author": "Jane", "cost": -50},
            headers=AUTH_HEADERS,
        )
        assert r.status_code == 422

    def test_create_401_no_auth(self, api):
        r = api.post(
            "/api/v1/courses",
            json={"name": "Course", "author": "Jane", "cost": 100},
        )
        assert r.status_code == 401


# ============================================================
# C003 — GET /api/v1/courses/{id}
# ============================================================
@pytest.mark.api
class TestApiGetCourse:

    def test_get_existing_course_200(self, api):
        # Create first
        r = api.post(
            "/api/v1/courses",
            json={"name": f"__api_getbyid_{datetime.utcnow().timestamp()}", "author": "A", "cost": 50},
            headers=AUTH_HEADERS,
        )
        cid = r.json()["data"]["id"]
        CREATED_IDS.append(cid)

        r2 = api.get(f"/api/v1/courses/{cid}", headers=AUTH_HEADERS)
        assert r2.status_code == 200
        assert r2.json()["data"]["id"] == cid

    def test_get_nonexistent_404(self, api):
        r = api.get("/api/v1/courses/999999999", headers=AUTH_HEADERS)
        assert r.status_code == 404
        assert r.json()["success"] is False


# ============================================================
# C004 — PUT /api/v1/courses/{id} — Update
# ============================================================
@pytest.mark.api
class TestApiUpdateCourse:

    def test_update_name_and_cost(self, api):
        r = api.post(
            "/api/v1/courses",
            json={"name": f"__api_update_orig_{datetime.utcnow().timestamp()}", "author": "A", "cost": 100},
            headers=AUTH_HEADERS,
        )
        cid = r.json()["data"]["id"]
        CREATED_IDS.append(cid)

        r2 = api.put(
            f"/api/v1/courses/{cid}",
            json={"name": "__api_update_new", "cost": 250.00},
            headers=AUTH_HEADERS,
        )
        assert r2.status_code == 200
        body = r2.json()
        assert body["data"]["name"] == "__api_update_new"
        assert float(body["data"]["cost"]) == pytest.approx(250.00, rel=0.01)

    def test_update_nonexistent_404(self, api):
        r = api.put(
            "/api/v1/courses/999999999",
            json={"name": "Updated"},
            headers=AUTH_HEADERS,
        )
        assert r.status_code == 404


# ============================================================
# C005 — DELETE /api/v1/courses/{id}
# ============================================================
@pytest.mark.api
class TestApiDeleteCourse:

    def test_delete_returns_200(self, api):
        r = api.post(
            "/api/v1/courses",
            json={"name": f"__api_delete_{datetime.utcnow().timestamp()}", "author": "A", "cost": 30},
            headers=AUTH_HEADERS,
        )
        cid = r.json()["data"]["id"]

        r2 = api.delete(f"/api/v1/courses/{cid}", headers=AUTH_HEADERS)
        assert r2.status_code == 200
        assert r2.json()["success"] is True

    def test_deleted_course_not_in_list(self, api):
        """Deleted course must not appear in card grid."""
        r = api.post(
            "/api/v1/courses",
            json={"name": f"__api_del_hidden_{datetime.utcnow().timestamp()}", "author": "A", "cost": 30},
            headers=AUTH_HEADERS,
        )
        cid = r.json()["data"]["id"]
        api.delete(f"/api/v1/courses/{cid}", headers=AUTH_HEADERS)

        list_r = api.get("/api/v1/courses", headers=AUTH_HEADERS)
        ids = [c["id"] for c in list_r.json()["data"]["courses"]]
        assert cid not in ids, "Deleted course still visible in list (card grid)"

    def test_delete_nonexistent_404(self, api):
        r = api.delete("/api/v1/courses/999999999", headers=AUTH_HEADERS)
        assert r.status_code == 404
