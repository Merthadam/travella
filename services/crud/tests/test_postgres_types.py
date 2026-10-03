"""Schema-level regression checks for the PostgreSQL typed mappings.

The CI PostgreSQL job can additionally set TEST_DATABASE_URL for live migration
coverage. These checks remain useful in the default SQLite unit-test environment.
"""

from decimal import Decimal

from sqlalchemy.dialects import postgresql

from services.crud.models import DestinationPin, PlanActionReceipt, PlanningBrief


def test_structured_columns_compile_to_postgresql_jsonb():
    assert isinstance(PlanningBrief.__table__.c.payload.type.dialect_impl(postgresql.dialect()), postgresql.JSONB)
    assert isinstance(PlanActionReceipt.__table__.c.result_json.type.dialect_impl(postgresql.dialect()), postgresql.JSONB)


def test_coordinates_are_fixed_precision_numeric():
    latitude = DestinationPin.__table__.c.latitude.type
    longitude = DestinationPin.__table__.c.longitude.type
    assert latitude.precision == longitude.precision == 9
    assert latitude.scale == longitude.scale == 6


def test_coordinates_accept_decimal_values_without_float_storage_type():
    assert isinstance(DestinationPin.__table__.c.latitude.type.python_type(Decimal("51.507351")), Decimal)
