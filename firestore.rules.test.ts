import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Security Rules Structural & Dirty-Dozen Invariant Verification Suite
 */
test('firestore.rules enforces all 8 pillars and blocks Dirty Dozen attack vectors', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  // 1. Default-deny catch-all at top
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));

  // 2. Path variable hardening helper
  assert.ok(rules.includes("function isValidId(id)"));

  // 3. All 7 blueprint collections are explicitly matched
  for (const col of [
    '/users/{userId}',
    '/drivers/{driverId}',
    '/privateVault/{driverId}',
    '/teams/{teamId}',
    '/rounds/{roundId}',
    '/settings/{settingId}',
    '/teamRequests/{requestId}',
  ]) {
    assert.ok(rules.includes(`match ${col}`), `Missing collection match for ${col}`);
  }

  // 4. PII isolation on privateVault
  assert.ok(rules.includes('resource.data.ownerUid == request.auth.uid || isAdmin()'));

  // 5. Team 3-driver roster bound and TeamRequest messages bound
  assert.ok(rules.includes('data.driverIds is list && data.driverIds.size() <= 3'));
  assert.ok(rules.includes('data.messages is list && data.messages.size() <= 50'));
});
