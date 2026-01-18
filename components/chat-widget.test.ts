
import { shouldTriggerLeadForm } from './chat-widget';
import assert from 'assert';

console.log('Running functionality tests for chat-widget...');

// Test 1: Boolean true
try {
    assert.strictEqual(shouldTriggerLeadForm({ "Leave Message": true }), true);
    console.log('PASS: "Leave Message": true');
} catch (e) {
    console.error('FAIL: "Leave Message": true', e);
}

// Test 2: String "true"
try {
    assert.strictEqual(shouldTriggerLeadForm({ "leaveMessage": "true" }), true);
    console.log('PASS: "leaveMessage": "true"');
} catch (e) {
    console.error('FAIL: "leaveMessage": "true"', e);
}

// Test 3: Case insensitive key
try {
    assert.strictEqual(shouldTriggerLeadForm({ "leave_message": true }), true);
    console.log('PASS: "leave_message": true');
} catch (e) {
    console.error('FAIL: "leave_message": true', e);
}

// Test 4: False
try {
    assert.strictEqual(shouldTriggerLeadForm({ "Leave Message": false }), false);
    console.log('PASS: "Leave Message": false');
} catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('FAIL: "Leave Message": false', msg);
}

// Test 5: Invalid Input
try {
    assert.strictEqual(shouldTriggerLeadForm(null), false);
    console.log('PASS: null input');
} catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('FAIL: null input', msg);
}

console.log('Tests completed.');
