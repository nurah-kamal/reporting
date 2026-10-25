// Everything the demo board shows. All of it is invented.
//
// The demo is one source, not the only one. A file loaded on the Your data page is read
// by source.js, which runs before this file, and REQUESTS below points at whichever is
// in play. Everything under it is derived and does not care which.
//
// One rule worth keeping: every figure on this board is derived from REQUESTS. Nothing
// is typed in twice. A board whose headline figure and whose chart disagree is worse
// than useless, and the only way to be sure they cannot is to compute both from one list.

// When the sample figures were taken, and how far back the rows go.
const DEMO_SNAPSHOT = {
  read: 'Friday 18 September, 17:40',
  readShort: '17:40',
  days: 84
};

// The dimension a board groups by. Three is the comfortable maximum for the
// colours below; add more and they start repeating.
const DEMO_PRODUCTS = {
  delivery: 'Delivery',
  billing: 'Billing',
  accounts: 'Accounts'
};

const DEMO_PRODUCT_COLOUR = {
  delivery: 'var(--group-1)',
  billing: 'var(--group-2)',
  accounts: 'var(--group-3)'
};

const DEMO_CHANNELS = ['Email', 'Phone', 'Web form'];

const DEMO_PEOPLE = ['Ada Nkemelu', 'Tomas Brandt', 'Priya Raghunathan', 'Joel Okonkwo', 'Mireille Dufour', 'Sam Whitlock'];

// One row per request.
//   days   how many days ago it arrived (0 = today, 83 = twelve weeks back)
//   reply  hours to the first recorded reply, or null when nothing was recorded
//   state  open | answered | closed
const DEMO_REQUESTS = [
  { id: 'R-1188', product: 'delivery', channel: 'Email',    person: 'Ada Nkemelu',       days: 0,  reply: 1,    state: 'answered', note: 'Parcel scanned at the depot. Customer told to expect it Tuesday.' },
  { id: 'R-1187', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 0,  reply: 3,    state: 'answered', note: 'Duplicate charge confirmed, refund raised with finance.' },
  { id: 'R-1186', product: 'accounts', channel: 'Phone',    person: 'Priya Raghunathan', days: 0,  reply: null, state: 'open',     note: '' },
  { id: 'R-1185', product: 'delivery', channel: 'Web form', person: 'Joel Okonkwo',      days: 0,  reply: 6,    state: 'answered', note: 'Asked for the tracking number.' },
  { id: 'R-1184', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 1,  reply: 2,    state: 'closed',   note: 'Explained the pro-rata line on the invoice. Customer happy.' },
  { id: 'R-1183', product: 'accounts', channel: 'Email',    person: 'Sam Whitlock',      days: 1,  reply: 4,    state: 'answered', note: 'Reset link sent.' },
  { id: 'R-1182', product: 'delivery', channel: 'Web form', person: 'Ada Nkemelu',       days: 1,  reply: null, state: 'open',     note: '' },
  { id: 'R-1181', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 1,  reply: 9,    state: 'answered', note: 'ok' },
  { id: 'R-1180', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 2,  reply: 1,    state: 'closed',   note: 'Driver returned the parcel to the depot; redelivery booked for Thursday.' },
  { id: 'R-1179', product: 'accounts', channel: 'Phone',    person: 'Priya Raghunathan', days: 2,  reply: 5,    state: 'answered', note: 'Second address added to the account.' },
  { id: 'R-1178', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 2,  reply: null, state: 'open',     note: '' },
  { id: 'R-1177', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 2,  reply: 2,    state: 'closed',   note: 'Wrong item shipped. Replacement sent and the original collected.' },
  { id: 'R-1176', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 3,  reply: 7,    state: 'answered', note: 'done' },
  { id: 'R-1175', product: 'billing',  channel: 'Web form', person: 'Tomas Brandt',      days: 3,  reply: 3,    state: 'closed',   note: 'Card on file had expired. Customer updated it on the call.' },
  { id: 'R-1174', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 3,  reply: null, state: 'open',     note: '' },
  { id: 'R-1173', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 4,  reply: 11,   state: 'answered', note: 'Asked them to confirm the email on the account before we change anything.' },
  { id: 'R-1172', product: 'billing',  channel: 'Phone',    person: 'Mireille Dufour',   days: 4,  reply: 1,    state: 'closed',   note: 'Refund already showing on their statement.' },
  { id: 'R-1171', product: 'delivery', channel: 'Web form', person: 'Sam Whitlock',      days: 4,  reply: null, state: 'open',     note: '' },
  { id: 'R-1170', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 5,  reply: 26,   state: 'answered', note: 'sorted' },
  { id: 'R-1169', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 5,  reply: 4,    state: 'closed',   note: 'Annual plan applied and the difference credited.' },
  { id: 'R-1168', product: 'delivery', channel: 'Web form', person: 'Joel Okonkwo',      days: 5,  reply: 2,    state: 'closed',   note: 'Depot confirmed the parcel is on the Friday run.' },
  { id: 'R-1167', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 6,  reply: null, state: 'open',     note: '' },
  { id: 'R-1166', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 6,  reply: 8,    state: 'answered', note: 'Sent the itemised breakdown they asked for.' },
  { id: 'R-1165', product: 'delivery', channel: 'Phone',    person: 'Sam Whitlock',      days: 6,  reply: 3,    state: 'closed',   note: 'Address corrected before dispatch.' },

  { id: 'R-1164', product: 'accounts', channel: 'Web form', person: 'Ada Nkemelu',       days: 7,  reply: 1,    state: 'closed',   note: 'Walked them through adding a second user.' },
  { id: 'R-1163', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 7,  reply: null, state: 'open',     note: '' },
  { id: 'R-1162', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 8,  reply: 14,   state: 'answered', note: 'chased' },
  { id: 'R-1161', product: 'accounts', channel: 'Web form', person: 'Priya Raghunathan', days: 8,  reply: 5,    state: 'closed',   note: 'Account merged with the older one and the duplicate closed.' },
  { id: 'R-1160', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 9,  reply: 2,    state: 'closed',   note: 'Explained why the first month is charged on signup.' },
  { id: 'R-1159', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 9,  reply: null, state: 'open',     note: '' },
  { id: 'R-1158', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 10, reply: 31,   state: 'answered', note: 'Two-step sign-in switched off at their request, with a note on the account.' },
  { id: 'R-1157', product: 'billing',  channel: 'Web form', person: 'Tomas Brandt',      days: 10, reply: 6,    state: 'closed',   note: 'Invoice reissued to the new company name.' },
  { id: 'R-1156', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 11, reply: 1,    state: 'closed',   note: 'Parcel found at the neighbour. Nothing further needed.' },
  { id: 'R-1155', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 12, reply: null, state: 'open',     note: '' },
  { id: 'R-1154', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 12, reply: 4,    state: 'closed',   note: 'Late fee waived once, and the customer told it is once.' },
  { id: 'R-1153', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 13, reply: 2,    state: 'closed',   note: 'Courier claim opened, reference passed to the customer.' },
  { id: 'R-1152', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 13, reply: 12,   state: 'answered', note: 'no' },

  { id: 'R-1151', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 14, reply: null, state: 'open',     note: '' },
  { id: 'R-1150', product: 'delivery', channel: 'Web form', person: 'Joel Okonkwo',      days: 15, reply: 3,    state: 'closed',   note: 'Redelivery completed and confirmed with the customer.' },
  { id: 'R-1149', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 15, reply: 9,    state: 'closed',   note: 'Old email removed from the account after they confirmed by phone.' },
  { id: 'R-1148', product: 'billing',  channel: 'Phone',    person: 'Mireille Dufour',   days: 16, reply: 1,    state: 'closed',   note: 'Direct debit reinstated.' },
  { id: 'R-1147', product: 'delivery', channel: 'Web form', person: 'Sam Whitlock',      days: 17, reply: null, state: 'open',     note: '' },
  { id: 'R-1146', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 17, reply: 18,   state: 'answered', note: 'Told them the export will take a few days.' },
  { id: 'R-1145', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 18, reply: 7,    state: 'closed',   note: 'Refund confirmed as received.' },
  { id: 'R-1144', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 19, reply: null, state: 'open',     note: '' },
  { id: 'R-1143', product: 'accounts', channel: 'Web form', person: 'Priya Raghunathan', days: 19, reply: 6,    state: 'closed',   note: 'Permissions on the shared account explained and written down for them.' },
  { id: 'R-1142', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 20, reply: 2,    state: 'closed',   note: 'Statement resent to the finance address.' },
  { id: 'R-1141', product: 'delivery', channel: 'Phone',    person: 'Sam Whitlock',      days: 20, reply: 22,   state: 'answered', note: 'waiting' },
  { id: 'R-1140', product: 'accounts', channel: 'Web form', person: 'Ada Nkemelu',       days: 21, reply: 1,    state: 'closed',   note: 'Name on the account corrected.' },

  { id: 'R-1139', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 22, reply: 5,    state: 'closed',   note: 'Quarterly billing set up from next cycle.' },
  { id: 'R-1138', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 22, reply: null, state: 'open',     note: '' },
  { id: 'R-1137', product: 'accounts', channel: 'Web form', person: 'Priya Raghunathan', days: 23, reply: 4,    state: 'closed',   note: 'Login loop was a stale cookie. Told them how to clear it.' },
  { id: 'R-1136', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 24, reply: 2,    state: 'closed',   note: 'Charge was the annual renewal. Reminder date moved forward.' },
  { id: 'R-1135', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 24, reply: 8,    state: 'closed',   note: 'Delivery window changed to afternoons.' },
  { id: 'R-1134', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 25, reply: null, state: 'open',     note: '' },
  { id: 'R-1133', product: 'billing',  channel: 'Web form', person: 'Tomas Brandt',      days: 26, reply: 3,    state: 'closed',   note: 'VAT number added to the account and the invoice reissued.' },
  { id: 'R-1132', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 26, reply: 1,    state: 'closed',   note: 'Parcel was at the collection point. Gave them the opening hours.' },
  { id: 'R-1131', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 27, reply: 16,   state: 'answered', note: 'ok' },
  { id: 'R-1130', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 27, reply: 6,    state: 'closed',   note: 'Overpayment credited against the next invoice.' },

  { id: 'R-1129', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 28, reply: 2,    state: 'closed',   note: 'Damaged on arrival. Replacement sent same day.' },
  { id: 'R-1128', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 29, reply: 9,    state: 'closed',   note: 'Recovery phone number updated after identity check.' },
  { id: 'R-1127', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 29, reply: null, state: 'open',     note: '' },
  { id: 'R-1126', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 30, reply: 4,    state: 'closed',   note: 'Split shipment explained; second half arrives Monday.' },
  { id: 'R-1125', product: 'accounts', channel: 'Web form', person: 'Priya Raghunathan', days: 31, reply: 1,    state: 'closed',   note: 'Added them to the existing company account.' },
  { id: 'R-1124', product: 'billing',  channel: 'Phone',    person: 'Mireille Dufour',   days: 31, reply: 12,   state: 'closed',   note: 'Disputed line removed after checking the order.' },
  { id: 'R-1123', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 32, reply: 7,    state: 'closed',   note: 'Courier confirmed the address was incomplete. Corrected.' },
  { id: 'R-1122', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 33, reply: null, state: 'open',     note: '' },
  { id: 'R-1121', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 33, reply: 3,    state: 'closed',   note: 'Plan downgraded from the start of next month.' },
  { id: 'R-1120', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 34, reply: 2,    state: 'closed',   note: 'Signature waived at the customer request, noted on the order.' },
  { id: 'R-1119', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 35, reply: 5,    state: 'closed',   note: 'Team member removed and their sessions ended.' },

  { id: 'R-1118', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 36, reply: 28,   state: 'answered', note: 'ok' },
  { id: 'R-1117', product: 'delivery', channel: 'Phone',    person: 'Sam Whitlock',      days: 36, reply: 1,    state: 'closed',   note: 'Tracking updated; parcel had been scanned late.' },
  { id: 'R-1116', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 37, reply: 6,    state: 'closed',   note: 'Explained what the audit log shows and how far back it goes.' },
  { id: 'R-1115', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 38, reply: null, state: 'open',     note: '' },
  { id: 'R-1114', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 38, reply: 3,    state: 'closed',   note: 'Redirected to a work address for the second attempt.' },
  { id: 'R-1113', product: 'accounts', channel: 'Phone',    person: 'Priya Raghunathan', days: 39, reply: 11,   state: 'closed',   note: 'Data export sent as a link with a seven-day expiry.' },
  { id: 'R-1112', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 40, reply: 2,    state: 'closed',   note: 'Refund timing explained: five working days from their bank.' },
  { id: 'R-1111', product: 'delivery', channel: 'Web form', person: 'Sam Whitlock',      days: 41, reply: 9,    state: 'closed',   note: 'Return label issued and collection booked.' },
  { id: 'R-1110', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 41, reply: 4,    state: 'closed',   note: 'Notification settings changed so only billing email goes to finance.' },

  { id: 'R-1109', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 42, reply: 1,    state: 'closed',   note: 'Receipt resent.' },
  { id: 'R-1108', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 43, reply: null, state: 'open',     note: '' },
  { id: 'R-1107', product: 'accounts', channel: 'Web form', person: 'Priya Raghunathan', days: 43, reply: 7,    state: 'closed',   note: 'Single sign-on questions passed to the account manager.' },
  { id: 'R-1106', product: 'billing',  channel: 'Phone',    person: 'Mireille Dufour',   days: 44, reply: 5,    state: 'closed',   note: 'Corrected the billing address on file.' },
  { id: 'R-1105', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 45, reply: 2,    state: 'closed',   note: 'Weekend delivery arranged as a one-off.' },
  { id: 'R-1104', product: 'accounts', channel: 'Web form', person: 'Ada Nkemelu',       days: 46, reply: 19,   state: 'answered', note: 'chased' },
  { id: 'R-1103', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 46, reply: 3,    state: 'closed',   note: 'Purchase order number added so their finance team can match it.' },
  { id: 'R-1102', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 47, reply: 6,    state: 'closed',   note: 'Missing item shipped separately with an apology.' },
  { id: 'R-1101', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 48, reply: null, state: 'open',     note: '' },
  { id: 'R-1100', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 48, reply: 1,    state: 'closed',   note: 'Invoice explained line by line on the call.' },

  { id: 'R-1099', product: 'delivery', channel: 'Phone',    person: 'Sam Whitlock',      days: 49, reply: 4,    state: 'closed',   note: 'Order held at the depot until they return from leave.' },
  { id: 'R-1098', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 50, reply: 8,    state: 'closed',   note: 'Second admin added after the owner confirmed by email.' },
  { id: 'R-1097', product: 'billing',  channel: 'Web form', person: 'Tomas Brandt',      days: 50, reply: 2,    state: 'closed',   note: 'Currency on the invoice corrected.' },
  { id: 'R-1096', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 51, reply: 13,   state: 'answered', note: 'done' },
  { id: 'R-1095', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 52, reply: 5,    state: 'closed',   note: 'Account reopened and the old data restored.' },
  { id: 'R-1094', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 53, reply: 3,    state: 'closed',   note: 'Charge matched to an order they had forgotten placing.' },
  { id: 'R-1093', product: 'delivery', channel: 'Web form', person: 'Sam Whitlock',      days: 53, reply: null, state: 'open',     note: '' },
  { id: 'R-1092', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 54, reply: 1,    state: 'closed',   note: 'Password reset over the phone after two identity questions.' },
  { id: 'R-1091', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 55, reply: 9,    state: 'closed',   note: 'Annual invoice split into quarters at their request.' },

  { id: 'R-1090', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 56, reply: 2,    state: 'closed',   note: 'Late parcel refunded the delivery charge.' },
  { id: 'R-1089', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 57, reply: 6,    state: 'closed',   note: 'Explained why the invite email lands in spam and how to fix it.' },
  { id: 'R-1088', product: 'billing',  channel: 'Phone',    person: 'Mireille Dufour',   days: 57, reply: null, state: 'open',     note: '' },
  { id: 'R-1087', product: 'delivery', channel: 'Web form', person: 'Sam Whitlock',      days: 58, reply: 4,    state: 'closed',   note: 'Collection point changed to the one near their office.' },
  { id: 'R-1086', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 59, reply: 22,   state: 'answered', note: 'no' },
  { id: 'R-1085', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 60, reply: 1,    state: 'closed',   note: 'Duplicate subscription cancelled and refunded.' },
  { id: 'R-1084', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 61, reply: 7,    state: 'closed',   note: 'Driver instructions added to the address.' },
  { id: 'R-1083', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 62, reply: 3,    state: 'closed',   note: 'Job title on the profile corrected.' },

  { id: 'R-1082', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 63, reply: 5,    state: 'closed',   note: 'Set up a reminder three days before renewal.' },
  { id: 'R-1081', product: 'delivery', channel: 'Phone',    person: 'Sam Whitlock',      days: 64, reply: 2,    state: 'closed',   note: 'Parcel located and delivered the following morning.' },
  { id: 'R-1080', product: 'accounts', channel: 'Web form', person: 'Ada Nkemelu',       days: 64, reply: null, state: 'open',     note: '' },
  { id: 'R-1079', product: 'billing',  channel: 'Email',    person: 'Tomas Brandt',      days: 65, reply: 11,   state: 'closed',   note: 'Card declined because of a bank block. Told them who to call.' },
  { id: 'R-1078', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 66, reply: 1,    state: 'closed',   note: 'Delivery date confirmed in writing.' },
  { id: 'R-1077', product: 'accounts', channel: 'Web form', person: 'Priya Raghunathan', days: 67, reply: 8,    state: 'closed',   note: 'Two accounts merged after checking both belonged to them.' },
  { id: 'R-1076', product: 'billing',  channel: 'Email',    person: 'Mireille Dufour',   days: 68, reply: 3,    state: 'closed',   note: 'Explained the change in price from the renewal notice.' },
  { id: 'R-1075', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 69, reply: 6,    state: 'closed',   note: 'Parcel returned to sender; reshipped to the corrected address.' },

  { id: 'R-1074', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 70, reply: 2,    state: 'closed',   note: 'Email preferences updated across all three products.' },
  { id: 'R-1073', product: 'billing',  channel: 'Web form', person: 'Tomas Brandt',      days: 71, reply: 14,   state: 'answered', note: 'ok' },
  { id: 'R-1072', product: 'delivery', channel: 'Email',    person: 'Joel Okonkwo',      days: 71, reply: 1,    state: 'closed',   note: 'Tracking link resent by text.' },
  { id: 'R-1071', product: 'accounts', channel: 'Phone',    person: 'Priya Raghunathan', days: 72, reply: null, state: 'open',     note: '' },
  { id: 'R-1070', product: 'billing',  channel: 'Web form', person: 'Mireille Dufour',   days: 73, reply: 4,    state: 'closed',   note: 'Historic invoices sent as one archive.' },
  { id: 'R-1069', product: 'delivery', channel: 'Email',    person: 'Sam Whitlock',      days: 74, reply: 9,    state: 'closed',   note: 'Bulk order split across two delivery days at their request.' },
  { id: 'R-1068', product: 'accounts', channel: 'Phone',    person: 'Ada Nkemelu',       days: 75, reply: 3,    state: 'closed',   note: 'Owner transferred to a colleague, both confirmed in writing.' },
  { id: 'R-1067', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 76, reply: 2,    state: 'closed',   note: 'Payment method switched to invoice on thirty-day terms.' },

  { id: 'R-1066', product: 'delivery', channel: 'Web form', person: 'Joel Okonkwo',      days: 77, reply: 5,    state: 'closed',   note: 'Packaging complaint passed to the warehouse with photographs.' },
  { id: 'R-1065', product: 'accounts', channel: 'Email',    person: 'Priya Raghunathan', days: 78, reply: 1,    state: 'closed',   note: 'Timezone on the account corrected, so reports arrive in the morning.' },
  { id: 'R-1064', product: 'billing',  channel: 'Phone',    person: 'Mireille Dufour',   days: 79, reply: 17,   state: 'answered', note: 'sorted' },
  { id: 'R-1063', product: 'delivery', channel: 'Web form', person: 'Sam Whitlock',      days: 80, reply: 3,    state: 'closed',   note: 'Standing delivery instruction added for the whole account.' },
  { id: 'R-1062', product: 'accounts', channel: 'Email',    person: 'Ada Nkemelu',       days: 81, reply: 6,    state: 'closed',   note: 'Explained what happens to their data when an account closes.' },
  { id: 'R-1061', product: 'billing',  channel: 'Phone',    person: 'Tomas Brandt',      days: 82, reply: 2,    state: 'closed',   note: 'Final invoice issued and the account closed cleanly.' },
  { id: 'R-1060', product: 'delivery', channel: 'Phone',    person: 'Joel Okonkwo',      days: 83, reply: 4,    state: 'closed',   note: 'Last outstanding parcel confirmed delivered.' }
];

// The periods the segmented control offers. The longest one is the whole span the
// board holds, so there is deliberately nothing behind it to compare against.
const RANGES = [['week', '7 days'], ['month', '4 weeks'], ['quarter', '12 weeks']];
const RANGE_DAYS = { week: 7, month: 28, quarter: 84 };

// ---------- formatting ----------

const formatNumber = (value) => new Intl.NumberFormat('en-GB').format(Math.round(value));

const formatPercent = (fraction) => `${Math.round(fraction * 100)}%`;

const formatHours = (hours) => (hours === null ? 'nothing recorded' : hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`);

const plural = (count, one, many) => `${formatNumber(count)} ${count === 1 ? one : many}`;

// A change between two periods, as the shell's status chip wants it.
// Below this, a percentage says more than the numbers can support: two requests
// becoming eight is not a 300% improvement, it is six requests.
const TOO_FEW_TO_BE_A_PERCENTAGE = 5;

// `good` names the direction worth having. Pass null when neither direction is
// worth having — volume, headcount, anything the board counts without judging — and
// the change is stated in a neutral chip instead of a green or a red one. Standing
// still is neutral as well: it is not good news, it is no news.
function movement(now, before, { good = 'up', suffix = '' } = {}) {
  if (before === null || before === undefined || !before) return null;
  if (now === before) return { tone: 'move', text: `no change${suffix}` };

  const direction = now > before ? 'up' : 'down';
  const tone = good === null ? 'move' : direction === good ? 'well' : 'poor';

  // Small numbers swing wildly. Show them as they are rather than dressing them
  // up as a percentage nobody should act on.
  if (before < TOO_FEW_TO_BE_A_PERCENTAGE) {
    return { direction, tone, text: `${formatNumber(before)} to ${formatNumber(now)}${suffix}` };
  }

  const share = (now - before) / before;
  if (Math.abs(share) < 0.005) return { tone: 'move', text: `no change${suffix}` };
  return { direction, tone, text: `${formatPercent(Math.abs(share))}${suffix}` };
}

// ---------- reading the rows ----------

// The middle value, not the average, so one very old request cannot drag it.
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

const inRange = (range) => REQUESTS.filter((request) => request.days < RANGE_DAYS[range]);

// The same length of time again, immediately before the selected period.
const inPreviousRange = (range) => REQUESTS.filter((request) =>
  request.days >= RANGE_DAYS[range] && request.days < RANGE_DAYS[range] * 2);

// Whether the board actually holds an earlier period to compare against. The longest
// range reaches the start of the data, so it honestly has nothing behind it.
const hasPrevious = (range) => RANGE_DAYS[range] * 2 <= SNAPSHOT.days;

const narrow = (rows, product, person) => rows.filter((request) =>
  (product === 'All' || request.product === product) &&
  (person === 'All' || request.person === person));

const matching = (range, product, person) => narrow(inRange(range), product, person);

const matchingBefore = (range, product, person) => narrow(inPreviousRange(range), product, person);

// Nothing recorded at all. Not the same as nobody having replied — only that nobody wrote it down.
const unanswered = (rows) => rows.filter((request) => request.reply === null);

const replied = (rows) => rows.filter((request) => request.reply !== null);

const answeredWithinADay = (rows) => replied(rows).filter((request) => request.reply <= 24);

// How long a request with nothing recorded has been waiting.
const WAIT_BANDS = [
  ['same-day', 'Arrived today', (days) => days < 1],
  ['1-3', '1 to 3 days', (days) => days >= 1 && days <= 3],
  ['4-7', '4 to 7 days', (days) => days >= 4 && days <= 7],
  ['8-14', '8 to 14 days', (days) => days >= 8 && days <= 14],
  ['15-plus', '15 days or more', (days) => days >= 15]
];

const bandOf = (days) => (WAIT_BANDS.find(([, , test]) => test(days)) || WAIT_BANDS[0])[0];

// A note is graded on length alone. Nothing here judges the work.
function noteGrade(note) {
  const words = note.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 'none';
  if (words === 1) return 'one-word';
  if (words < 6) return 'thin';
  return 'full';
}

const NOTE_GRADES = {
  full: 'Says what happened',
  thin: 'Barely a note',
  'one-word': 'One word',
  none: 'Nothing written'
};

const NOTE_GRADE_TONE = { full: 'good', thin: 'waiting', 'one-word': 'changed', none: 'changed' };

// ---------- which rows the board is showing ----------
//
// One decision, made once, before anything is derived. A file that was loaded on the
// Your data page wins; otherwise it is the demo above.

const LOADED = typeof BOARD_SOURCE !== 'undefined' ? BOARD_SOURCE : null;

const REQUESTS = LOADED ? LOADED.rows : DEMO_REQUESTS;

const PRODUCTS = LOADED ? LOADED.groups : DEMO_PRODUCTS;

const CHANNELS = LOADED
  ? [...new Set(REQUESTS.map((request) => request.channel))].sort()
  : DEMO_CHANNELS;

const PEOPLE = LOADED
  ? [...new Set(REQUESTS.map((request) => request.person))].sort()
  : DEMO_PEOPLE;

// The ramp has five steps. A file with more groups than that repeats colours, which is
// survivable because every chart that splits by group names its colours in a key — and
// the Your data page says it is happening rather than leaving it to be noticed.
const PRODUCT_COLOUR = LOADED
  ? Object.fromEntries(Object.keys(PRODUCTS).map((key, index) => [key, `var(--group-${(index % 5) + 1})`]))
  : DEMO_PRODUCT_COLOUR;

const SNAPSHOT = LOADED
  ? {
    read: new Date(LOADED.read).toLocaleString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    readShort: new Date(LOADED.read).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    days: 84
  }
  : DEMO_SNAPSHOT;

// ---------- everything below is derived, never typed in twice ----------

// Requests arriving on each of the last thirty days, oldest first.
const ARRIVALS = Array.from({ length: 30 }, (unused, index) => {
  const daysAgo = 29 - index;
  return { label: `${daysAgo === 0 ? 'Today' : daysAgo + 'd ago'}`, value: REQUESTS.filter((request) => request.days === daysAgo).length };
});

// Twelve weeks, oldest first, with every measure the board reports.
const WEEKS = Array.from({ length: 12 }, (unused, index) => {
  const weeksAgo = 11 - index;
  const rows = REQUESTS.filter((request) => Math.floor(request.days / 7) === weeksAgo);
  const answered = replied(rows);
  return {
    label: weeksAgo === 0 ? 'This week' : `${weeksAgo}w ago`,
    opened: rows.length,
    answered: answered.length,
    waiting: unanswered(rows).length,
    sameDay: answered.length ? answeredWithinADay(rows).length / answered.length : null,
    hoursToReply: median(answered.map((request) => request.reply)),
    fullNotes: answered.filter((request) => noteGrade(request.note) === 'full').length
  };
});
