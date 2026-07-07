const School = require('../src/models/School');
const User = require('../src/models/User');
const AcademicTerm = require('../src/models/AcademicTerm');
const AuditLog = require('../src/models/AuditLog');
const termsService = require('../src/modules/terms/terms.service');

describe('Terms service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Terms Demo School', email: `terms${Date.now()}@test.com` });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return { school, admin };
  }

  test('createTerm creates a term and getTerms lists it for the correct school only', async () => {
    const { school, admin } = await makeFixture();
    const otherSchool = await School.create({ name: 'Other School', email: `other${Date.now()}@test.com` });
    await termsService.createTerm(otherSchool._id, {
      name: 'Other Term', academicYear: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'),
    }, admin._id);

    const term = await termsService.createTerm(school._id, {
      name: 'Term 1', academicYear: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'),
    }, admin._id);

    const terms = await termsService.getTerms(school._id);
    expect(terms).toHaveLength(1);
    expect(terms[0]._id.toString()).toBe(String(term._id));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'term.create' });
    expect(auditEntries).toHaveLength(1);
  });

  test('setCurrentTerm marks one term current and unsets any previously current term', async () => {
    const { school, admin } = await makeFixture();
    const term1 = await termsService.createTerm(school._id, {
      name: 'Term 1', academicYear: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    }, admin._id);
    const term2 = await termsService.createTerm(school._id, {
      name: 'Term 2', academicYear: '2025/2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-04-01'),
    }, admin._id);

    await termsService.setCurrentTerm(school._id, term2._id, admin._id);

    expect((await AcademicTerm.findById(term1._id)).isCurrent).toBe(false);
    expect((await AcademicTerm.findById(term2._id)).isCurrent).toBe(true);
  });

  test('setCurrentTerm throws for a term belonging to another school', async () => {
    const { school, admin } = await makeFixture();
    const otherSchool = await School.create({ name: 'Other School 2', email: `other2${Date.now()}@test.com` });
    const otherTerm = await termsService.createTerm(otherSchool._id, {
      name: 'Other Term', academicYear: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'),
    }, admin._id);

    await expect(termsService.setCurrentTerm(school._id, otherTerm._id, admin._id)).rejects.toThrow('Academic term not found.');
  });
});
