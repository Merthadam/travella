import pytest

from services.auth.authorization import require_owner, traveler_key
from services.auth.contracts import AuthProblem, ValidatedIdentity


@pytest.fixture
def identity():
    return ValidatedIdentity("traveler-one", "client", frozenset(), 1, 100)


def test_owner_key_comes_from_validated_subject(identity):
    assert traveler_key(identity) == "traveler-one"
    assert require_owner(identity, "traveler-one") == "traveler-one"


def test_foreign_owner_is_non_disclosing(identity):
    with pytest.raises(AuthProblem) as problem:
        require_owner(identity, "traveler-two")
    assert problem.value.code == "not_found"
    assert "traveler-two" not in problem.value.message
