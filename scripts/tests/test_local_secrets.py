import argparse
import json
import shutil
import stat
import subprocess

import pytest
from dotenv import dotenv_values

from scripts import local_secrets as secrets


def test_two_worktrees_receive_secrets_without_overwriting_ports_or_exposing_backend_keys(tmp_path):
    values = {
        "ANTHROPIC_API_KEY": "test-$literal#'quote\\slash",
        "TAVILY_API_KEY": "test-search",
        "VITE_GOOGLE_MAPS_API_KEY": "test-browser",
    }
    for name in ("first", "second"):
        root = tmp_path / name
        root.mkdir()
        (root / ".env").write_text(
            "# Local ports\nTRAVELLA_FRONTEND_PORT=6123\nANTHROPIC_API_KEY=old\n"
        )
        secrets.pull(root, values)
        result = dotenv_values(root / ".env", interpolate=False)
        assert result["ANTHROPIC_API_KEY"] == values["ANTHROPIC_API_KEY"]
        assert result["TRAVELLA_FRONTEND_PORT"] == "6123"
        assert "# Local ports" in (root / ".env").read_text()
        assert dotenv_values(root / "frontend/.env.local") == {
            "VITE_GOOGLE_MAPS_API_KEY": "test-browser"
        }
        assert dotenv_values(root / "services/mcps/.env") == {"TAVILY_API_KEY": "test-search"}
        for relative in secrets.DESTINATIONS:
            assert stat.S_IMODE((root / relative).stat().st_mode) == 0o600


def test_removed_and_misplaced_shared_credentials_are_removed(tmp_path):
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend/.env.local").write_text("ANTHROPIC_API_KEY=wrong-location\n")
    (tmp_path / ".env").write_text("ANTHROPIC_API_KEY=revoked\nCUSTOM_SETTING=keep\n")
    secrets.pull(tmp_path, {})
    assert dotenv_values(tmp_path / ".env") == {"CUSTOM_SETTING": "keep"}
    assert dotenv_values(tmp_path / "frontend/.env.local") == {}


def test_recovers_empty_docker_mount_directory_but_preserves_nonempty_directory(tmp_path):
    target = tmp_path / "frontend/.env.local"
    target.mkdir(parents=True)
    secrets.pull(tmp_path, {"VITE_GOOGLE_MAPS_API_KEY": "test-browser"})
    assert target.is_file()
    target.unlink()
    target.mkdir()
    (target / "keep").write_text("existing data")
    with pytest.raises(secrets.SetupError, match="nonempty directory"):
        secrets.pull(tmp_path, {})
    assert (target / "keep").read_text() == "existing data"


@pytest.mark.parametrize(
    "value",
    [
        {"AWS_SECRET_ACCESS_KEY": "not-allowed"},
        {"ANTHROPIC_API_KEY": "injection\nEVIL=1"},
        {"ANTHROPIC_API_KEY": 42},
        [],
    ],
)
def test_invalid_cloud_values_do_not_write_files(tmp_path, value):
    with pytest.raises(secrets.SetupError):
        secrets.pull(tmp_path, value)
    assert not (tmp_path / ".env").exists()


def test_all_destinations_are_checked_before_any_write(tmp_path):
    (tmp_path / ".env").write_text("ANTHROPIC_API_KEY=old\n")
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend/.env.local").symlink_to(tmp_path / ".env")
    with pytest.raises(secrets.SetupError):
        secrets.pull(tmp_path, {"ANTHROPIC_API_KEY": "new"})
    assert (tmp_path / ".env").read_text() == "ANTHROPIC_API_KEY=old\n"


class FakeClient:
    class exceptions:
        class ResourceNotFoundException(Exception):
            pass

    def __init__(self, values=None):
        self.values = values
        self.writes = 0

    def get_secret_value(self, **kwargs):
        if self.values is None:
            raise self.exceptions.ResourceNotFoundException()
        return {"SecretString": json.dumps(self.values)}

    def create_secret(self, **kwargs):
        self.values = json.loads(kwargs["SecretString"])
        self.writes += 1

    put_secret_value = create_secret


def args(root, command):
    return argparse.Namespace(
        root=root, command=command, secret_id="test-secret", from_checkout=[], key=None
    )


def test_bootstrap_fills_missing_keys_without_rotating_cloud_credentials(tmp_path, capsys):
    (tmp_path / ".env").write_text("ANTHROPIC_API_KEY=local-private\nCOGNITO_APP_CLIENT_ID=test-id\n")
    client = FakeClient({"ANTHROPIC_API_KEY": "cloud-private"})
    secrets.run(args(tmp_path, "bootstrap"), client)
    assert client.values == {"ANTHROPIC_API_KEY": "cloud-private", "COGNITO_APP_CLIENT_ID": "test-id"}
    secrets.run(args(tmp_path, "bootstrap"), client)
    assert client.writes == 1
    assert "private" not in capsys.readouterr().out


def test_missing_secret_fails_instead_of_using_stale_local_values(tmp_path):
    (tmp_path / ".env").write_text("ANTHROPIC_API_KEY=old\n")
    with pytest.raises(secrets.SetupError, match="missing"):
        secrets.run(args(tmp_path, "pull"), FakeClient())
    assert (tmp_path / ".env").read_text() == "ANTHROPIC_API_KEY=old\n"


def test_access_failure_leaves_local_files_untouched(tmp_path):
    class Denied(FakeClient):
        def get_secret_value(self, **kwargs):
            raise PermissionError("denied")

    with pytest.raises(PermissionError):
        secrets.run(args(tmp_path, "pull"), Denied())
    assert not (tmp_path / ".env").exists()


def test_partial_secret_reports_names_only_and_blocks_startup(tmp_path, capsys):
    with pytest.raises(secrets.SetupError, match="COGNITO_USER_POOL_ID") as error:
        secrets.run(args(tmp_path, "pull"), FakeClient({"ANTHROPIC_API_KEY": "test-private"}))
    assert "test-private" not in str(error.value) + capsys.readouterr().out


def test_set_updates_cloud_using_hidden_prompt_without_printing_value(
    tmp_path, monkeypatch, capsys
):
    client = FakeClient({"ANTHROPIC_API_KEY": "old"})
    request = args(tmp_path, "set")
    request.key = "ANTHROPIC_API_KEY"
    monkeypatch.setattr(secrets.sys.stdin, "isatty", lambda: True)
    monkeypatch.setattr(secrets.getpass, "getpass", lambda prompt: "new-test-private")
    secrets.run(request, client)
    assert client.values["ANTHROPIC_API_KEY"] == "new-test-private"
    assert "new-test-private" not in capsys.readouterr().out


@pytest.mark.skipif(not shutil.which("docker-compose"), reason="Docker Compose CLI unavailable")
def test_compose_preserves_literal_credential_characters(tmp_path):
    value = "test-$literal#'quote\\slash"
    secrets.pull(tmp_path, {"ANTHROPIC_API_KEY": value, "TAVILY_API_KEY": value})
    config_path = tmp_path / "compose.yaml"
    config_path.write_text(
        "services:\n  agent:\n    image: test\n    environment:\n"
        "      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}\n"
        "  mcp:\n    image: test\n    env_file: services/mcps/.env\n"
    )
    # No containers or network calls; capture expanded config rather than printing it.
    result = subprocess.run(
        [
            "docker-compose",
            "-f",
            str(config_path),
            "--project-directory",
            str(tmp_path),
            "config",
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        check=True,
        env={k: v for k, v in secrets.os.environ.items() if k not in secrets.ALLOWED_KEYS},
    )
    config = json.loads(result.stdout)
    for service, key in [("agent", "ANTHROPIC_API_KEY"), ("mcp", "TAVILY_API_KEY")]:
        # Compose escapes literal dollars in its serialized, reusable configuration.
        assert config["services"][service]["environment"][key].replace("$$", "$") == value
