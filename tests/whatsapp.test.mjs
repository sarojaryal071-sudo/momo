import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLink, buildMessage, buildOrderLink, describeItems, fillTemplate, toNationalFormat, toWhatsAppNumber } from '../frontend/js/whatsapp.js';

const lines = [
  { qty: 1, name: 'Frozen chicken momo', unitLabel: '40 pieces', linePence: 1000 },
  { qty: 2, name: 'Chutney pot', unitLabel: '1 pot', linePence: 222 },
];

test('full message layout', () => {
  const msg = buildMessage({ orderNumber: 'SS-TEST-01', lines, totalPence: 1222, pickup: 'Saturday 14 November 10:00', name: 'Asha', notes: 'Ring the bell' });
  assert.equal(msg, [
    'Hi! Order SS-TEST-01',
    '- 1 x Frozen chicken momo (40 pieces) £10',
    '- 2 x Chutney pot (1 pot) £2.22',
    'Total £12.22',
    'Pickup: Saturday 14 November 10:00',
    'Name: Asha',
    'Notes: Ring the bell',
    'Pay cash on pickup.',
  ].join('\n'));
});

test('empty optional parts are omitted and no number is handled', () => {
  const msg = buildMessage({ lines: [lines[0]], totalPence: 1000, pickup: '', name: '', notes: '' });
  assert.equal(msg, "Hi! I'd like to place an order\n- 1 x Frozen chicken momo (40 pieces) £10\nTotal £10\nPay cash on pickup.");
});

test('link encodes the text', () => {
  const link = buildLink('447413069241', 'Total £10\nHi');
  assert.equal(link, 'https://wa.me/447413069241?text=Total%20%C2%A310%0AHi');
});

test('long notes are trimmed to keep the link short', () => {
  const { link, message } = buildOrderLink({ orderNumber: 'X', lines, totalPence: 1, notes: 'é'.repeat(500) }, '447413069241', 600);
  assert.ok(link.length <= 600);
  assert.ok(message.includes('Pay cash on pickup.'));
});

test('UK phone conversion', () => {
  assert.equal(toWhatsAppNumber('07413 069241'), '447413069241');
  assert.equal(toWhatsAppNumber('+44 7413 069241'), '447413069241');
  assert.equal(toWhatsAppNumber('+44 (0)7413-069241'), '447413069241');
  assert.equal(toWhatsAppNumber('0044 7413 069241'), '447413069241');
  assert.equal(toWhatsAppNumber(''), null);
  assert.equal(toWhatsAppNumber('12345'), null);
  assert.equal(toWhatsAppNumber('+1 202 555 0100'), null);
});

test('options are listed under their line', () => {
  const msg = buildMessage({ orderNumber: 'SS-TEST-01', lines: [{ qty: 2, name: 'Frozen chicken momo', unitLabel: '40 pieces', linePence: 2100, optionText: 'No onion, Hot' }], totalPence: 2100 });
  assert.equal(msg, 'Hi! Order SS-TEST-01\n- 2 x Frozen chicken momo (40 pieces) £21\n  Customised: No onion, Hot\nTotal £21\nPay cash on pickup.');
});

test('the customer phone is listed and numbers are shown back in national format', () => {
  const msg = buildMessage({ lines: [{ qty: 1, name: 'A', unitLabel: '', linePence: 1000 }], totalPence: 1000, name: 'Asha', phone: '07413 069241' });
  assert.ok(msg.includes('Name: Asha\nPhone: 07413 069241\nPay cash'));
  assert.equal(toNationalFormat('447413069241'), '07413 069241');
  assert.equal(toNationalFormat(toWhatsAppNumber('+44 7413 069241')), '07413 069241');
  assert.equal(toNationalFormat(null), '');
});

test('admin templates are filled and items are described with their options', () => {
  const items = [{ qty: 2, name: 'Frozen chicken momo', unit_label: '40 pieces', options: [{ label: 'Hot' }, { label: 'No onion' }] }, { qty: 1, name: 'Chutney pot', unit_label: '1 pot', options: [] }];
  assert.equal(describeItems(items), '- 2 x Frozen chicken momo (40 pieces) (Hot, No onion)\n- 1 x Chutney pot (1 pot)');
  assert.equal(fillTemplate('Hi {name}, order {order_number}. {typo}', { name: 'Asha', order_number: 'SS-1112-01' }), 'Hi Asha, order SS-1112-01. {typo}');
  assert.equal(fillTemplate('Address: {address}', { address: '' }), 'Address: ');
});
