const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const School = require('../src/models/School');
const AuditLog = require('../src/models/AuditLog');
const Subject = require('../src/models/Subject');
const AcademicTerm = require('../src/models/AcademicTerm');

describe('Phase 2 foundation', () => {
  test('health check responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  test('AuditLog.record persists an entry', async () => {
    const school = await School.create({ name: 'Test School', email: 'school@test.com' });
    const userId = new mongoose.Types.ObjectId();
    await AuditLog.record({
      school: school._id,
      user: userId,
      action: 'fee.structure.create',
      targetId: userId,
      targetType: 'FeeStructure',
    });
    const entries = await AuditLog.find({ school: school._id });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('fee.structure.create');
  });

  test('AcademicTerm only keeps one isCurrent term per school', async () => {
    const school = await School.create({ name: 'Term School', email: 'term@test.com' });
    const term1 = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const term2 = await AcademicTerm.create({
      school: school._id, name: 'Term 2', academicYear: '2025/2026',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-04-01'), isCurrent: true,
    });
    const refreshedTerm1 = await AcademicTerm.findById(term1._id);
    expect(refreshedTerm1.isCurrent).toBe(false);
    expect((await AcademicTerm.findById(term2._id)).isCurrent).toBe(true);
  });

  test('Subject enforces unique name per school', async () => {
    const school = await School.create({ name: 'Subj School', email: 'subj@test.com' });
    await Subject.create({ school: school._id, name: 'Mathematics' });
    await expect(Subject.create({ school: school._id, name: 'Mathematics' })).rejects.toThrow();
  });
});
