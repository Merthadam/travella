from cryptography.fernet import Fernet

from services.auth.session_store import SessionStore


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
