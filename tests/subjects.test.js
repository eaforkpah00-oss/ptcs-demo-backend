const School = require('../src/models/School');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const subjectsService = require('../src/modules/subjects/subjects.service');

describe('Subjects service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Subjects Demo School', email: `subj${Date.now()}@test.com` });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return { school, admin };
  }

  test('createSubject creates a subject and getSubjects lists it for the correct school only', async () => {
    const { school, admin } = await makeFixture();
    const otherSchool = await School.create({ name: 'Other School', email: `other${Date.now()}@test.com` });
    await subjectsService.createSubject(otherSchool._id, { name: 'Mathematics' }, admin._id);

    const subject = await subjectsService.createSubject(school._id, { name: 'Mathematics', code: 'MATH' }, admin._id);

    const subjects = await subjectsService.getSubjects(school._id);
    expect(subjects).toHaveLength(1);
    expect(subjects[0]._id.toString()).toBe(String(subject._id));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'subject.create' });
    expect(auditEntries).toHaveLength(1);
  });

  test('createSubject rejects a duplicate name within the same school', async () => {
    const { school, admin } = await makeFixture();
    await subjectsService.createSubject(school._id, { name: 'English' }, admin._id);

    await expect(
      subjectsService.createSubject(school._id, { name: 'English' }, admin._id),
    ).rejects.toThrow('A subject with this name already exists.');
  });
});
