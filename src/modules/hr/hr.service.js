const StaffProfile = require('../../models/StaffProfile');
const LeaveRequest = require('../../models/LeaveRequest');
const User = require('../../models/User');
const School = require('../../models/School');
const Class = require('../../models/Class');
const Timetable = require('../../models/Timetable');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');
const { encrypt, decrypt } = require('../../utils/encryption');
const { sendNotification } = require('../../services/notification.service');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toSafeProfile(profile) {
  const obj = profile.toObject ? profile.toObject() : { ...profile };
  delete obj.bankAccount;
  delete obj.nationalId;
  return obj;
}

// Dates arrive as UTC-midnight (date-only ISO strings parse that way regardless of
// server timezone), so this walks days in UTC too — otherwise a server running behind
// UTC would shift every date back a day and miscount which weekday it falls on.
function countWorkingDays(startDate, endDate, workingDays) {
  const workingSet = new Set(workingDays);
  let count = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (workingSet.has(DAY_NAMES[cursor.getUTCDay()])) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

async function getNextEmployeeId(schoolId) {
  const last = await StaffProfile.findOne({ school: schoolId }).sort({ employeeId: -1 }).lean();
  if (!last) return 'EMP001';
  const num = parseInt(last.employeeId.replace(/\D/g, ''), 10) || 0;
  return `EMP${String(num + 1).padStart(3, '0')}`;
}

async function createStaffProfile(schoolId, data, adminId) {
  const user = await User.findOne({ _id: data.user, school: schoolId, role: { $in: ['teacher', 'school_admin'] } });
  if (!user) throw new AppError('User not found for this school, or not a staff role.', 404);

  const existing = await StaffProfile.findOne({ user: data.user });
  if (existing) throw new AppError('This user already has a staff profile.', 409);

  const employeeId = await getNextEmployeeId(schoolId);

  const profile = await StaffProfile.create({
    school: schoolId,
    user: data.user,
    employeeId,
    department: data.department || null,
    qualification: data.qualification || null,
    contractType: data.contractType || 'permanent',
    contractStart: data.contractStart || null,
    contractEnd: data.contractEnd || null,
    salary: data.salary || 0,
    bankName: data.bankName || null,
    bankAccount: encrypt(data.bankAccount),
    nationalId: encrypt(data.nationalId),
    emergencyContact: data.emergencyContact || {},
    createdBy: adminId,
  });

  user.staffProfileId = profile._id;
  await user.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'hr.profile.create',
    targetId: profile._id, targetType: 'StaffProfile',
  });

  return toSafeProfile(profile);
}

async function getStaffProfile(schoolId, userId, requestingUserId, requestingRole) {
  const profile = await StaffProfile.findOne({ user: userId, school: schoolId, isDeleted: false })
    .populate('user', 'firstName lastName email');
  if (!profile) throw new AppError('Staff profile not found.', 404);

  if (requestingRole === 'teacher' && String(requestingUserId) !== String(userId)) {
    throw new AppError('You are not authorized to view this profile.', 403);
  }

  if (requestingRole === 'teacher') {
    return toSafeProfile(profile);
  }

  const full = profile.toObject();
  full.bankAccount = decrypt(profile.bankAccount);
  full.nationalId = decrypt(profile.nationalId);
  return full;
}

async function getAllStaffProfiles(schoolId) {
  const profiles = await StaffProfile.find({ school: schoolId, isDeleted: false })
    .populate('user', 'firstName lastName email role');
  return profiles.map(toSafeProfile);
}

async function updateStaffProfile(schoolId, userId, data, adminId) {
  const profile = await StaffProfile.findOne({ user: userId, school: schoolId, isDeleted: false });
  if (!profile) throw new AppError('Staff profile not found.', 404);

  const updates = { ...data };
  if ('bankAccount' in updates) updates.bankAccount = encrypt(updates.bankAccount);
  if ('nationalId' in updates) updates.nationalId = encrypt(updates.nationalId);

  Object.assign(profile, updates, { updatedBy: adminId });
  await profile.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'hr.profile.update',
    targetId: profile._id, targetType: 'StaffProfile',
  });

  return toSafeProfile(profile);
}

async function submitLeaveRequest(schoolId, staffId, data) {
  const school = await School.findById(schoolId);
  const workingDays = school?.settings?.workingDays ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const totalDays = countWorkingDays(data.startDate, data.endDate, workingDays);

  const request = await LeaveRequest.create({
    school: schoolId,
    staff: staffId,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    totalDays,
    reason: data.reason,
  });

  const staff = await User.findById(staffId);
  const admins = await User.find({ school: schoolId, role: 'school_admin', isActive: true });
  await Promise.all(admins.map((admin) => sendNotification(
    admin._id, 'leave_status', 'New Leave Request',
    `${staff.firstName} ${staff.lastName} has submitted a ${data.leaveType} leave request for `
      + `${data.startDate.toDateString()} to ${data.endDate.toDateString()} (${totalDays} days).`,
    { schoolId, leaveRequestId: request._id },
  )));

  await AuditLog.record({
    school: schoolId, user: staffId, action: 'hr.leave.submit',
    targetId: request._id, targetType: 'LeaveRequest',
  });

  return request;
}

async function reviewLeaveRequest(schoolId, requestId, status, reviewNote, adminId) {
  const request = await LeaveRequest.findOne({ _id: requestId, school: schoolId, isDeleted: false });
  if (!request) throw new AppError('Leave request not found.', 404);
  if (request.status !== 'pending') throw new AppError('Request already reviewed.', 409);

  request.status = status;
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.reviewNote = reviewNote || null;
  await request.save();

  await sendNotification(
    request.staff, 'leave_status', `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    `Your ${request.leaveType} leave request has been ${status}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    { schoolId, leaveRequestId: request._id },
  );

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'hr.leave.review',
    targetId: request._id, targetType: 'LeaveRequest', metadata: { status },
  });

  return request;
}

async function getAllLeaveRequests(schoolId) {
  return LeaveRequest.find({ school: schoolId, isDeleted: false })
    .populate('staff', 'firstName lastName')
    .sort('-createdAt');
}

async function getMyLeaveRequests(schoolId, staffId) {
  return LeaveRequest.find({ school: schoolId, staff: staffId, isDeleted: false }).sort('-createdAt');
}

async function getPayrollSummary(schoolId, month, year) {
  const school = await School.findById(schoolId);
  const workingDays = school?.settings?.workingDays ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const workingDaysInMonth = countWorkingDays(monthStart, monthEnd, workingDays);

  const profiles = await StaffProfile.find({ school: schoolId, isDeleted: false })
    .populate('user', 'firstName lastName');

  const rows = await Promise.all(profiles.map(async (profile) => {
    const approvedLeave = await LeaveRequest.find({
      school: schoolId, staff: profile.user._id, status: 'approved', isDeleted: false,
      startDate: { $lte: monthEnd }, endDate: { $gte: monthStart },
    });
    const leaveDays = approvedLeave.reduce((sum, leave) => sum + leave.totalDays, 0);
    const grossSalary = profile.salary;

    return {
      employeeId: profile.employeeId,
      name: `${profile.user.firstName} ${profile.user.lastName}`,
      contractType: profile.contractType,
      grossSalary,
      leaveDays,
      // No unapproved-absence deduction logic yet — admin reviews the raw figures.
      netPayable: grossSalary,
    };
  }));

  return {
    workingDaysInMonth,
    rows,
    totals: {
      grossSalary: rows.reduce((sum, r) => sum + r.grossSalary, 0),
      netPayable: rows.reduce((sum, r) => sum + r.netPayable, 0),
    },
  };
}

// Derives each teacher's homeroom class(es) and teaching load (distinct classes/
// subjects) from Class.teacher and Timetable — User.subjectsTaught exists on the
// schema but nothing anywhere populates it, so it isn't a reliable source.
async function getTeachingLoad(schoolId) {
  const teachers = await User.find({ school: schoolId, role: 'teacher', isActive: true })
    .select('firstName lastName email')
    .sort('firstName');
  const teacherIds = teachers.map((t) => t._id);

  const [homeroomClasses, periods] = await Promise.all([
    Class.find({ school: schoolId, teacher: { $in: teacherIds }, isActive: true }).select('name teacher'),
    Timetable.find({ school: schoolId, teacher: { $in: teacherIds }, isDeleted: false })
      .populate('class', 'name')
      .populate('subject', 'name'),
  ]);

  return teachers.map((teacher) => {
    const homerooms = homeroomClasses
      .filter((c) => String(c.teacher) === String(teacher._id))
      .map((c) => ({ _id: c._id, name: c.name }));

    const teacherPeriods = periods.filter((p) => String(p.teacher) === String(teacher._id));
    const classMap = new Map();
    const subjectMap = new Map();
    teacherPeriods.forEach((p) => {
      if (p.class) classMap.set(String(p.class._id), p.class.name);
      if (p.subject) subjectMap.set(String(p.subject._id), p.subject.name);
    });

    return {
      teacher: {
        _id: teacher._id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email,
      },
      homeroomClasses: homerooms,
      classesTaught: Array.from(classMap, ([_id, name]) => ({ _id, name })),
      subjectsTaught: Array.from(subjectMap, ([_id, name]) => ({ _id, name })),
    };
  });
}

module.exports = {
  getNextEmployeeId,
  createStaffProfile,
  getStaffProfile,
  getAllStaffProfiles,
  updateStaffProfile,
  submitLeaveRequest,
  reviewLeaveRequest,
  getAllLeaveRequests,
  getMyLeaveRequests,
  getPayrollSummary,
  getTeachingLoad,
};
