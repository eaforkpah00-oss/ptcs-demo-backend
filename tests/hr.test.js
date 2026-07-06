const School = require('../src/models/School');
const User = require('../src/models/User');
const StaffProfile = require('../src/models/StaffProfile');
const LeaveRequest = require('../src/models/LeaveRequest');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const hrService = require('../src/modules/hr/hr.service');

describe('HR service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'HR Demo School', email: `hr${Date.now()}@test.com` });
    const teacher = await User.create({
      firstName: 'Kwame', lastName: 'Teacher', email: `teacher${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    const otherTeacher = await User.create({
      firstName: 'Ama', lastName: 'Teacher', email: `otherteacher${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return {
      school, teacher, otherTeacher, admin,
    };
  }

  test('createStaffProfile auto-increments employeeId per school and encrypts sensitive fields', async () => {
    const { school, teacher, otherTeacher, admin } = await makeFixture();

    const profile1 = await hrService.createStaffProfile(school._id, {
      user: teacher._id, salary: 500000, bankAccount: '1234567890', nationalId: 'GHA-000-111',
    }, admin._id);
    expect(profile1.employeeId).toBe('EMP001');
    expect(profile1.bankAccount).toBeUndefined();
    expect(profile1.nationalId).toBeUndefined();

    const stored = await StaffProfile.findOne({ user: teacher._id });
    expect(stored.bankAccount).not.toBe('1234567890');
    expect(stored.bankAccount).toContain(':');

    const profile2 = await hrService.createStaffProfile(school._id, { user: otherTeacher._id }, admin._id);
    expect(profile2.employeeId).toBe('EMP002');

    const updatedUser = await User.findById(teacher._id);
    expect(String(updatedUser.staffProfileId)).toBe(String(stored._id));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'hr.profile.create' });
    expect(auditEntries).toHaveLength(2);
  });

  test('createStaffProfile rejects a duplicate profile for the same user', async () => {
    const { school, teacher, admin } = await makeFixture();
    await hrService.createStaffProfile(school._id, { user: teacher._id }, admin._id);

    await expect(
      hrService.createStaffProfile(school._id, { user: teacher._id }, admin._id),
    ).rejects.toThrow('This user already has a staff profile.');
  });

  test('getStaffProfile lets an admin decrypt sensitive fields but hides them from a teacher, and blocks viewing another teacher', async () => {
    const { school, teacher, otherTeacher, admin } = await makeFixture();
    await hrService.createStaffProfile(school._id, {
      user: teacher._id, bankAccount: '1234567890', nationalId: 'GHA-000-111',
    }, admin._id);

    const adminView = await hrService.getStaffProfile(school._id, teacher._id, admin._id, 'school_admin');
    expect(adminView.bankAccount).toBe('1234567890');
    expect(adminView.nationalId).toBe('GHA-000-111');

    const ownView = await hrService.getStaffProfile(school._id, teacher._id, teacher._id, 'teacher');
    expect(ownView.bankAccount).toBeUndefined();

    await expect(
      hrService.getStaffProfile(school._id, teacher._id, otherTeacher._id, 'teacher'),
    ).rejects.toThrow('You are not authorized to view this profile.');
  });

  test('submitLeaveRequest calculates working days and notifies all school admins', async () => {
    const { school, teacher, admin } = await makeFixture();

    const request = await hrService.submitLeaveRequest(school._id, teacher._id, {
      leaveType: 'annual',
      startDate: new Date('2026-03-02'), // Monday
      endDate: new Date('2026-03-06'), // Friday
      reason: 'Family trip',
    });
    expect(request.totalDays).toBe(5);
    expect(request.status).toBe('pending');

    const notifications = await Notification.find({ type: 'leave_status', title: 'New Leave Request' });
    expect(notifications.map((n) => String(n.recipient))).toContain(String(admin._id));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'hr.leave.submit' });
    expect(auditEntries).toHaveLength(1);
  });

  test('reviewLeaveRequest approves a request and notifies the requesting teacher', async () => {
    const { school, teacher, admin } = await makeFixture();
    const request = await hrService.submitLeaveRequest(school._id, teacher._id, {
      leaveType: 'sick', startDate: new Date('2026-03-02'), endDate: new Date('2026-03-02'), reason: 'Flu',
    });

    const reviewed = await hrService.reviewLeaveRequest(school._id, request._id, 'approved', 'Get well soon', admin._id);
    expect(reviewed.status).toBe('approved');
    expect(reviewed.reviewedBy.toString()).toBe(String(admin._id));

    const notifications = await Notification.find({ type: 'leave_status', title: 'Leave Request Approved' });
    expect(notifications.map((n) => String(n.recipient))).toContain(String(teacher._id));

    await expect(
      hrService.reviewLeaveRequest(school._id, request._id, 'rejected', null, admin._id),
    ).rejects.toThrow('Request already reviewed.');
  });

  test('getPayrollSummary totals gross salary and leave days for the given month', async () => {
    const { school, teacher, admin } = await makeFixture();
    await hrService.createStaffProfile(school._id, { user: teacher._id, salary: 500000 }, admin._id);
    const request = await hrService.submitLeaveRequest(school._id, teacher._id, {
      leaveType: 'annual', startDate: new Date('2026-03-02'), endDate: new Date('2026-03-04'), reason: 'Trip',
    });
    await hrService.reviewLeaveRequest(school._id, request._id, 'approved', null, admin._id);

    const summary = await hrService.getPayrollSummary(school._id, 3, 2026);
    expect(summary.rows).toHaveLength(1);
    expect(summary.rows[0].grossSalary).toBe(500000);
    expect(summary.rows[0].leaveDays).toBe(3);
    expect(summary.totals.grossSalary).toBe(500000);
  });
});
