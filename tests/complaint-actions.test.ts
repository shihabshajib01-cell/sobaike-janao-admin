import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMPLAINT_ACTION_DEFINITIONS,
  getAvailableComplaintActions,
  getComplaintStatusGuidance,
} from '../src/utils/complaintActions';

const matrix = {
  submitted: ['publish', 'reject'],
  published: ['unpublish'],
  unpublished: ['publish'],
  rejected: [],
  edited: [],
} as const;

for (const [status, expected] of Object.entries(matrix)) {
  test(`moderation actions for ${status}`, () => {
    assert.deepEqual(
      getAvailableComplaintActions(status as keyof typeof matrix).map(action => action.id),
      expected,
    );
  });
  test(`status guidance for ${status} is available in EN and BN`, () => {
    const en = getComplaintStatusGuidance(status as keyof typeof matrix, 'en');
    const bn = getComplaintStatusGuidance(status as keyof typeof matrix, 'bn');
    assert.ok(en.trim());
    assert.match(bn, /[\u0980-\u09ff]/);
    assert.notEqual(en, bn);
  });
}

test('unknown lifecycle status fails closed', () => {
  assert.deepEqual(getAvailableComplaintActions('unexpected' as never), []);
  assert.equal(getComplaintStatusGuidance('unexpected' as never), '');
});

test('all moderation action labels are bilingual', () => {
  for (const action of Object.values(COMPLAINT_ACTION_DEFINITIONS)) {
    assert.ok(action.labelEn.trim());
    assert.match(action.labelBn, /[\u0980-\u09ff]/);
  }
});
