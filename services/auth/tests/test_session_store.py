from cryptography.fernet import Fernet, InvalidToken

from services.auth.session_store import SessionStore


def test_account_scans_ignore_unreadable_unrelated_sessions_without_deleting_them(tmp_path):
    path = str(tmp_path / 'mixed-key.sqlite3')
    old = SessionStore(path, Fernet.generate_key().decode())
    old_sid = old.create({'kind': 'session', 'subject': 'other', 'email': 'private@example.test'}, 500, 10)
    old_payload = old.db.execute('SELECT payload FROM auth_sessions').fetchone()[0]
    current = SessionStore(path, Fernet.generate_key().decode())
    sid = current.create({'kind': 'session', 'subject': 'one', 'email': 'old@example.test'}, 500, 10)
    try:
        current.reconcile_email('one', 'new@example.test')
    except InvalidToken:
        assert False, 'An unrelated unreadable session must not break current-account reconciliation'
    assert current.get(sid, 20)['email'] == 'new@example.test'
    assert len(current.live_records(20)) == 1
    assert current.account_records('one', 20) == []
    assert old.get(old_sid, 20)['email'] == 'private@example.test'
    assert old.db.execute('SELECT payload FROM auth_sessions WHERE id=?', (old.digest(old_sid),)).fetchone()[0] == old_payload
    old.close()
    current.close()


def test_session_survives_restart_but_not_its_original_expiry(tmp_path):
    path = str(tmp_path / "sessions.sqlite3")
    key = Fernet.generate_key().decode()
    first = SessionStore(path, key)
    with first.transaction():
        sid = first.create({"access": "secret", "started": 10}, expires=100, now=10)
    first.close()
    second = SessionStore(path, key)
    with second.transaction():
        assert second.get(sid, 99) == {"access": "secret", "started": 10}
        assert second.get(sid, 100) is None
    second.close()


def test_account_journal_survives_restart_and_reconciliation_preserves_hashes_and_expiry(tmp_path):
    import json
    path = str(tmp_path / 'account.sqlite3')
    key = Fernet.generate_key().decode()
    first = SessionStore(path, key)
    sid = first.create({'kind': 'session', 'subject': 'one', 'email': 'old@example.com'}, 500, 10)
    first.put_recovery_codes('one', 'old@example.com', ['hash-one'], 10)
    record = first.create_account_record({'subject': 'one', 'owner_sid_hash': first.digest(sid), 'purpose': 'email_change', 'status': 'reconciliation_required', 'new_email': 'new@example.com'}, 300, 10)
    first.close()
    second = SessionStore(path, key)
    assert second.get(record['id'], 20)['new_email'] == 'new@example.com'
    with second.account_guard('one'):
        second.reconcile_email('one', 'new@example.com')
    assert second.get(sid, 20)['email'] == 'new@example.com'
    assert second.expiry(sid) == 500
    row = second.db.execute('SELECT email, payload FROM auth_recovery_codes').fetchone()
    assert row[0] == 'new@example.com'
    assert json.loads(second.cipher.decrypt(row[1])) == {'email': 'new@example.com', 'hashes': ['hash-one']}
    assert second.get(record['id'], 301) is None
    second.close()


def test_recovery_hash_replacement_survives_restart_and_retains_legacy_consumption(tmp_path):
    path = str(tmp_path / 'codes.sqlite3')
    key = Fernet.generate_key().decode()
    first = SessionStore(path, key)
    legacy = first.digest('LEGACY01')
    first.put_recovery_codes('one', 'fixture@example.com', [legacy], 10)
    first.close()
    second = SessionStore(path, key)
    assert second.consume_recovery_code('one', legacy)
    assert not second.consume_recovery_code('one', legacy)
    strong = second.digest('0' * 32)
    with second.account_guard('one'), second.transaction():
        second.put_recovery_codes('one', 'fixture@example.com', [strong], 20)
    second.close()
    third = SessionStore(path, key)
    assert third.recovery_count('one') == 1
    assert third.consume_recovery_code_for_email('fixture@example.com', strong) == 'one'
    assert third.consume_recovery_code_for_email('fixture@example.com', strong) is None
    third.close()
