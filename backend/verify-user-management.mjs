/**
 * Exercises deleteUser against a real MongoDB, then rolls everything back.
 *
 * The guards exist to prevent unrecoverable states, and a guard that never runs
 * is indistinguishable from one that does not work. Each case is therefore
 * executed for real and reverted afterwards, so the suite asserts on behaviour
 * rather than on intent.
 *
 * NOT part of CI. It needs a reachable cluster, so it is a local verification
 * tool. `npm run verify:users`.
 *
 * Runs against a SCRATCH database, never the live one.
 *
 * Testing the "last remaining admin" guard requires the database to hold a
 * single administrator. On the live cluster that would mean demoting the real
 * admin accounts mid-test, which would lock the portal out if the process were
 * interrupted. The database name is swapped for a throwaway one on the same
 * cluster, so the guard can be exercised for real with no production data at
 * risk.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { ComplianceRecord } from './src/models/ComplianceRecord.js';
import { deleteUser } from './src/controllers/complianceController.js';

const SCRATCH_DB = 'hazard_hunt_selftest';
const scratchUri = process.env.MONGODB_URI.replace(
  /^(mongodb\+srv:\/\/[^/?]+\/)[^?]*(.*)$/,
  `$1${SCRATCH_DB}$2`
);

const makeRes = () => {
  const res = { code: 0, body: null };
  res.status = (c) => {
    res.code = c;
    return res;
  };
  res.json = (b) => {
    res.body = b;
    return res;
  };
  return res;
};
const call = async (req) => {
  const res = makeRes();
  await deleteUser(req, res);
  return res;
};

const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
};

const cleanup = [];
const track = (doc) => {
  cleanup.push(() => User.deleteOne({ _id: doc._id }));
  return doc;
};

await mongoose.connect(scratchUri, { serverSelectionTimeoutMS: 15000 });

// Start from a known-empty scratch database so admin counts are predictable.
await Promise.all([User.deleteMany({}), ComplianceRecord.deleteMany({})]);
console.log(`  scratch database: ${SCRATCH_DB}\n`);

const stamp = Date.now().toString(36);
const admin = track(
  await User.create({
    username: `tmp_admin_${stamp}`, password: 'TmpAdmin2026!', name: 'Temp Admin', role: 'admin',
  })
);
const self = track(
  await User.create({
    username: `tmp_self_${stamp}`, password: 'TmpSelf2026!', name: 'Temp Self', role: 'employee',
  })
);
const target = track(
  await User.create({
    username: `tmp_target_${stamp}`, password: 'TmpTarget2026!', name: 'Temp Target', role: 'employee',
  })
);
const onlyAdmin = track(
  await User.create({
    username: `tmp_only_${stamp}`, password: 'TmpOnly2026!', name: 'Temp Only Admin', role: 'admin',
  })
);

// A record on the target, to prove records survive the delete.
const rec = await ComplianceRecord.create({
  userId: target._id, userName: target.name, department: 'Test',
  scenarioId: new mongoose.Types.ObjectId(), scenarioTitle: 'Test',
  isPracticeMode: false, trainingMode: 'panorama360',
  hazardsFound: [], hazardsMissed: [], totalHazards: 5, foundCount: 0, missedCount: 5,
  falseClicksCount: 0, timeTakenSeconds: 30, timeLimitSeconds: 90,
  hazardScore: 0, quizScore: 0, totalScore: 0, passingThreshold: 75, passed: false,
});

// --- guards -----------------------------------------------------------------
let r = await call({ params: { id: 'not-an-id' }, user: { _id: admin._id } });
check('malformed id is rejected with 400, not a 500 cast error', r.code === 400, `got ${r.code}`);

r = await call({ params: { id: '0123456789abcdef01234567' }, user: { _id: admin._id } });
check('unknown but well-formed id returns 404', r.code === 404, `got ${r.code}`);

r = await call({ params: { id: String(admin._id) }, user: { _id: admin._id } });
check('an admin cannot delete their own account', r.code === 400, `got ${r.code}`);

// The scratch DB holds only these fixtures, so demoting every other admin makes
// onlyAdmin a genuine sole administrator. No production account is involved.
const otherAdmins = await User.find({ role: 'admin' }).select('_id');
for (const a of otherAdmins) {
  if (String(a._id) !== String(onlyAdmin._id)) {
    await User.updateOne({ _id: a._id }, { role: 'employee' });
  }
}
check('fixture: the scratch database really does have exactly one admin',
  (await User.countDocuments({ role: 'admin' })) === 1);

r = await call({ params: { id: String(onlyAdmin._id) }, user: { _id: self._id, role: 'admin' } });
check('the last remaining admin cannot be deleted', r.code === 400, `got ${r.code}`);
check('  and the refusal explains why', /last System Administrator/i.test(r.body?.message || ''), r.body?.message);
check('  and the sole admin still exists', !!(await User.findById(onlyAdmin._id)));

for (const a of otherAdmins) {
  if (String(a._id) !== String(onlyAdmin._id)) {
    await User.updateOne({ _id: a._id }, { role: 'admin' });
  }
}

// --- the actual delete ------------------------------------------------------
r = await call({ params: { id: String(target._id) }, user: { _id: admin._id, role: 'admin' } });
check('a normal employee account deletes successfully with 200', r.code === 200, `got ${r.code}: ${r.body?.message}`);
check('  the response names the deleted account', r.body?.deleted?.username === target.username, JSON.stringify(r.body?.deleted));
check('  retained compliance records are reported, not orphaned silently', r.body?.retainedComplianceRecords === 1, `got ${r.body?.retainedComplianceRecords}`);
check('  the account is actually gone from the database', !(await User.findById(target._id)));
check('  the compliance record survives the delete', !!(await ComplianceRecord.findById(rec._id)));

r = await call({ params: { id: String(target._id) }, user: { _id: admin._id, role: 'admin' } });
check('deleting the same account twice returns 404, not 500', r.code === 404, `got ${r.code}`);

const second = track(
  await User.create({
    username: `tmp_second_${stamp}`, password: 'TmpSecond2026!', name: 'Temp Second Admin', role: 'admin',
  })
);
r = await call({ params: { id: String(second._id) }, user: { _id: admin._id, role: 'admin' } });
check('an admin can be deleted while another admin remains', r.code === 200, `got ${r.code}`);

// --- credential exposure ----------------------------------------------------
await onlyAdmin.updateOne({ passwordHash: 'legacy-hash-sentinel' });

const viaLean = await User.findById(onlyAdmin._id).select('-password').lean();
check('a legacy passwordHash present in the DB is withheld even by .lean()',
  !('passwordHash' in viaLean), Object.keys(viaLean).join(','));

const loginUser = await User.findOne({ username: `tmp_only_${stamp}` }).select('+password');
check('login can still read the password hash via .select("+password")',
  !!loginUser?.password && loginUser.password !== 'legacy-hash-sentinel');

const plain = await User.findOne({ username: `tmp_only_${stamp}` });
check('a plain find omits the password entirely (schema default)',
  plain?.password === undefined, 'password was present');

// --- rollback ---------------------------------------------------------------
for (const fn of cleanup) await fn();
await ComplianceRecord.deleteMany({});
const leftovers = await User.find({ username: new RegExp(`tmp_(admin|self|target|only|second)_${stamp}`) });
check('all fixtures removed', leftovers.length === 0, `${leftovers.length} left`);

await mongoose.disconnect();

const failed = results.filter((x) => !x.ok);
console.log('');
if (failed.length) {
  console.log(`${failed.length} of ${results.length} user-management checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} user-management checks passed.`);