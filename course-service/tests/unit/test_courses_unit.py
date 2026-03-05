# ============================================================
# tests/unit/test_courses_unit.py
# Unit tests for Course Service.
# ALL external dependencies mocked — no real DB, no real JWT.
# Run: pytest tests/unit/ -v
# ============================================================
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from datetime import datetime, timezone


# ── Override settings before importing app ────────────────────
@pytest.fixture(autouse=True, scope="module")
def mock_settings():
    """Patch settings to use test values — prevents real DB connection."""
    with patch("app.core.config.get_settings") as mock:
        settings = MagicMock()
        settings.app_name = "emart-course-service-test"
        settings.app_version = "1.0.0"
        settings.app_env = "test"
        settings.port = 8083
        settings.debug = False
        settings.jwt_secret = "unit_test_secret_key_for_course_service"
        settings.jwt_algorithm = "HS256"
        settings.is_production = False
        settings.database_url = "postgresql+asyncpg://test:test@localhost/coursedb_test"
        settings.log_level = "DEBUG"
        settings.log_json = False
        mock.return_value = settings
        yield settings


# ── Fixtures ──────────────────────────────────────────────────
@pytest.fixture
def sample_course_orm():
    """Mock SQLAlchemy ORM course object."""
    course = MagicMock()
    course.id = 1
    course.name = "Python for Beginners"
    course.author = "Guido van Rossum"
    course.cost = Decimal("499.00")
    course.description = "Learn Python from scratch"
    course.category = "programming"
    course.duration_hours = 10
    course.level = "beginner"
    course.stock = 100
    course.image_url = None
    course.video_url = None
    course.is_active = True
    course.schema_version = 1
    course.created_at = datetime.now(timezone.utc)
    course.updated_at = datetime.now(timezone.utc)
    return course


@pytest.fixture
def mock_db():
    """Mock async SQLAlchemy session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def mock_user():
    """Mock authenticated user."""
    from app.middleware.auth import AuthenticatedUser
    return AuthenticatedUser({
        "userId": "user-001",
        "sub": "testuser@emart.com",
        "name": "Test User",
        "roles": ["ROLE_USER"],
    })


# ============================================================
# Health Controller Tests
# ============================================================
class TestHealthEndpoints:
    """Tests for /health, /health/live, /health/ready"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_health_returns_200(self):
        from app.routers.health import health
        response = await health()
        assert response.status_code == 200
        import json
        body = json.loads(response.body)
        assert body["status"] == "UP"
        assert "service" in body
        assert "timestamp" in body

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_liveness_returns_200(self):
        from app.routers.health import liveness
        response = await liveness()
        assert response.status_code == 200
        import json
        body = json.loads(response.body)
        assert body["status"] == "UP"
        assert body["probe"] == "liveness"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_readiness_up_when_db_healthy(self):
        with patch("app.routers.health.ping_db", return_value=True):
            from app.routers.health import readiness
            response = await readiness()
            assert response.status_code == 200
            import json
            body = json.loads(response.body)
            assert body["status"] == "UP"
            assert body["checks"]["postgresql"] == "UP"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_readiness_503_when_db_down(self):
        with patch("app.routers.health.ping_db", return_value=False):
            from app.routers.health import readiness
            response = await readiness()
            assert response.status_code == 503
            import json
            body = json.loads(response.body)
            assert body["status"] == "DOWN"
            assert body["checks"]["postgresql"] == "DOWN"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_readiness_503_when_db_throws(self):
        with patch("app.routers.health.ping_db", side_effect=Exception("Connection refused")):
            from app.routers.health import readiness
            response = await readiness()
            assert response.status_code == 503


# ============================================================
# Course Schema / Validation Tests
# ============================================================
class TestCourseSchemas:
    """Tests for Pydantic schema validation."""

    @pytest.mark.unit
    def test_course_create_valid(self):
        from app.schemas.course import CourseCreate
        c = CourseCreate(name="Python 101", author="Jane Doe", cost=299.99)
        assert c.name == "Python 101"
        assert c.author == "Jane Doe"
        assert c.cost == Decimal("299.99")
        assert c.category == "programming"

    @pytest.mark.unit
    def test_course_create_strips_whitespace(self):
        from app.schemas.course import CourseCreate
        c = CourseCreate(name="  Python 101  ", author="  Jane Doe  ", cost=100)
        assert c.name == "Python 101"
        assert c.author == "Jane Doe"

    @pytest.mark.unit
    def test_course_create_requires_name(self):
        from app.schemas.course import CourseCreate
        import pydantic
        with pytest.raises(pydantic.ValidationError) as exc_info:
            CourseCreate(author="Jane", cost=100)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("name",) for e in errors)

    @pytest.mark.unit
    def test_course_create_requires_author(self):
        from app.schemas.course import CourseCreate
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            CourseCreate(name="Python", cost=100)

    @pytest.mark.unit
    def test_course_create_rejects_negative_cost(self):
        from app.schemas.course import CourseCreate
        import pydantic
        with pytest.raises(pydantic.ValidationError) as exc_info:
            CourseCreate(name="Python", author="Jane", cost=-50)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("cost",) for e in errors)

    @pytest.mark.unit
    def test_course_create_zero_cost_allowed(self):
        from app.schemas.course import CourseCreate
        c = CourseCreate(name="Free Python", author="Jane", cost=0)
        assert c.cost == Decimal("0")

    @pytest.mark.unit
    def test_course_create_invalid_category(self):
        from app.schemas.course import CourseCreate
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            CourseCreate(name="Python", author="Jane", cost=100, category="invalid-cat")

    @pytest.mark.unit
    def test_course_update_all_optional(self):
        from app.schemas.course import CourseUpdate
        # Should not raise — all fields are optional
        update = CourseUpdate()
        assert update.name is None
        assert update.cost is None

    @pytest.mark.unit
    def test_course_update_partial(self):
        from app.schemas.course import CourseUpdate
        update = CourseUpdate(name="Updated Name", cost=599.00)
        assert update.name == "Updated Name"
        assert update.author is None  # Not provided

    @pytest.mark.unit
    def test_course_out_from_orm(self, sample_course_orm):
        from app.schemas.course import CourseOut
        # Simulate ORM → schema conversion
        data = {
            "id": 1,
            "name": "Python for Beginners",
            "author": "Guido van Rossum",
            "cost": Decimal("499.00"),
            "description": "Learn Python",
            "category": "programming",
            "duration_hours": 10,
            "level": "beginner",
            "stock": 100,
            "image_url": None,
            "video_url": None,
            "is_active": True,
            "schema_version": 1,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        out = CourseOut(**data)
        assert out.id == 1
        assert out.name == "Python for Beginners"
        assert out.is_active is True


# ============================================================
# Auth Middleware Tests
# ============================================================
class TestAuthMiddleware:
    """Tests for JWT validation middleware."""

    @pytest.mark.unit
    def test_authenticated_user_from_valid_payload(self):
        from app.middleware.auth import AuthenticatedUser
        payload = {
            "userId": "u-001",
            "sub": "user@emart.com",
            "name": "Test User",
            "roles": ["ROLE_USER", "ROLE_ADMIN"],
        }
        user = AuthenticatedUser(payload)
        assert user.user_id == "u-001"
        assert user.email == "user@emart.com"
        assert user.name == "Test User"
        assert user.has_role("ROLE_ADMIN")
        assert not user.has_role("ROLE_SUPERUSER")

    @pytest.mark.unit
    def test_authenticated_user_defaults_on_missing_fields(self):
        from app.middleware.auth import AuthenticatedUser
        user = AuthenticatedUser({})
        assert user.user_id == ""
        assert user.email == ""
        assert user.roles == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_current_user_with_valid_token(self, mock_settings):
        """Valid JWT should return AuthenticatedUser without hitting DB."""
        import jwt as pyjwt
        from fastapi.security import HTTPAuthorizationCredentials
        token = pyjwt.encode(
            {"userId": "u1", "sub": "u@e.com", "name": "Test", "roles": []},
            "unit_test_secret_key_for_course_service",
            algorithm="HS256",
        )
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        from app.middleware.auth import get_current_user
        user = await get_current_user(creds)
        assert user.email == "u@e.com"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_current_user_raises_401_on_expired_token(self, mock_settings):
        import jwt as pyjwt
        from fastapi import HTTPException
        from fastapi.security import HTTPAuthorizationCredentials
        from datetime import timedelta
        token = pyjwt.encode(
            {
                "userId": "u1", "sub": "u@e.com",
                "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            },
            "unit_test_secret_key_for_course_service",
            algorithm="HS256",
        )
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        from app.middleware.auth import get_current_user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(creds)
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_current_user_raises_401_on_invalid_token(self, mock_settings):
        from fastapi import HTTPException
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not.a.jwt")
        from app.middleware.auth import get_current_user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(creds)
        assert exc_info.value.status_code == 401


# ============================================================
# Course Router Logic Tests
# ============================================================
class TestCourseRouterLogic:
    """Test route handler logic with mocked DB session."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_list_courses_empty_db(self, mock_db, mock_user):
        """list_courses returns empty list when no courses exist."""
        from app.routers.courses import list_courses

        # Mock count query → 0, list query → []
        count_result = MagicMock()
        count_result.scalar_one.return_value = 0
        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = []

        mock_db.execute.side_effect = [count_result, list_result]

        response = await list_courses(
            category=None, search=None, level=None,
            limit=100, offset=0, db=mock_db, user=mock_user,
        )
        assert response.status_code == 200
        import json
        body = json.loads(response.body)
        assert body["success"] is True
        assert body["data"]["courses"] == []
        assert body["data"]["total"] == 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_course_returns_404_when_not_found(self, mock_db, mock_user):
        """get_course returns 404 when course does not exist."""
        from app.routers.courses import get_course
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        response = await get_course(999, mock_db, mock_user)
        assert response.status_code == 404
        import json
        body = json.loads(response.body)
        assert body["success"] is False
        assert "999" in body["message"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_course_returns_400_for_invalid_id(self, mock_db, mock_user):
        from app.routers.courses import get_course
        response = await get_course(-5, mock_db, mock_user)
        assert response.status_code == 400

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_create_course_success(self, mock_db, mock_user, sample_course_orm):
        from app.schemas.course import CourseCreate
        from app.routers.courses import create_course

        mock_db.refresh.side_effect = lambda obj: setattr(obj, "id", 1) or None

        payload = CourseCreate(
            name="Python for Beginners",
            author="Guido van Rossum",
            cost=Decimal("499.00"),
            description="Learn Python from scratch",
            category="programming",
        )
        # Patch CourseOut.model_validate to avoid ORM validation in unit test
        with patch("app.routers.courses.CourseOut.model_validate") as mock_validate:
            mock_validate.return_value = MagicMock(
                model_dump=lambda **kw: {
                    "id": 1, "name": "Python for Beginners",
                    "author": "Guido van Rossum", "cost": "499.00",
                    "description": "Learn Python from scratch",
                    "category": "programming", "duration_hours": None,
                    "level": None, "stock": 0, "image_url": None,
                    "video_url": None, "is_active": True,
                    "schema_version": 1,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            response = await create_course(payload, mock_db, mock_user)
        assert response.status_code == 201
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_course_returns_404_when_not_found(self, mock_db, mock_user):
        from app.routers.courses import delete_course
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result
        response = await delete_course(999, mock_db, mock_user)
        assert response.status_code == 404

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_course_soft_deletes(self, mock_db, mock_user, sample_course_orm):
        from app.routers.courses import delete_course
        result = MagicMock()
        result.scalar_one_or_none.return_value = sample_course_orm
        mock_db.execute.return_value = result
        response = await delete_course(1, mock_db, mock_user)
        # Verify soft-delete: is_active set to False
        assert sample_course_orm.is_active is False
        assert response.status_code == 200
