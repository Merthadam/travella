"""Receipt maintenance runs for the HTTP app, including with zero requests."""
import sqlite3
import threading
import time

from mcp.server.fastmcp import FastMCP
from starlette.testclient import TestClient

from services.mcps import travel_server
from services.mcps.sandbox_checkout import RECEIPT_TTL, prune_stay_receipts


def expired_receipt(path, identity):
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, token TEXT NOT NULL, created_at INTEGER NOT NULL)')
        db.execute('INSERT INTO receipts VALUES (?, ?, ?)',
                   (identity, 'test-receipt', int(time.time()) - RECEIPT_TTL - 1))


def count(path):
    with sqlite3.connect(path) as db:
        return db.execute('SELECT count(*) FROM receipts').fetchone()[0]


def test_http_lifespan_prunes_at_startup_and_while_idle_without_mcp_requests(tmp_path, monkeypatch):
    path = tmp_path / 'receipts.sqlite3'
    monkeypatch.setenv('STAY_CHECKOUT_JOURNAL', str(path))
    expired_receipt(path, 'before-startup')
    idle_pruned = threading.Event()
    observe_idle = threading.Event()

    def prune():
        prune_stay_receipts()
        if observe_idle.is_set() and count(path) == 0:
            idle_pruned.set()

    monkeypatch.setattr(travel_server, 'prune_stay_receipts', prune)
    app = travel_server.create_travel_app(FastMCP('maintenance-test', stateless_http=True), maintenance_interval=0.01)
    with TestClient(app):
        assert count(path) == 0
        expired_receipt(path, 'after-startup')
        observe_idle.set()
        assert idle_pruned.wait(2), 'Idle maintenance did not run'
        assert count(path) == 0


def test_cleanup_recovers_from_startup_and_periodic_failures_without_logging_details(tmp_path, monkeypatch, caplog):
    path = tmp_path / 'receipts.sqlite3'
    monkeypatch.setenv('STAY_CHECKOUT_JOURNAL', str(path))
    expired_receipt(path, 'pending-cleanup')
    recovered = threading.Event()
    calls = 0

    def prune():
        nonlocal calls
        calls += 1
        if calls == 1:
            raise OSError('PRIVATE_FILESYSTEM_DETAILS')
        if calls == 2:
            raise sqlite3.OperationalError('PRIVATE_DATABASE_DETAILS')
        prune_stay_receipts()
        recovered.set()

    monkeypatch.setattr(travel_server, 'prune_stay_receipts', prune)
    app = travel_server.create_travel_app(FastMCP('recovery-test', stateless_http=True), maintenance_interval=0.01)
    with TestClient(app):
        assert recovered.wait(2), 'Maintenance stopped after a transient failure'
        assert count(path) == 0
    assert caplog.text.count('stay_receipt_cleanup_failed') == 2
    assert 'PRIVATE_' not in caplog.text
