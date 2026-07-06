const cron = require('node-cron');
const School = require('../models/School');
const AcademicTerm = require('../models/AcademicTerm');
const User = require('../models/User');
const libraryService = require('../modules/library/library.service');
const feesService = require('../modules/fees/fees.service');
const examsService = require('../modules/exams/exams.service');
const analyticsService = require('../modules/analytics/analytics.service');
const { sendNotification } = require('../services/notification.service');

// No School.settings has a per-school timezone field, so every job runs on this
// single deployment timezone rather than a nonexistent "school local time".
const TIMEZONE = process.env.SCHOOL_TIMEZONE || 'Africa/Accra';

async function forEachActiveSchool(jobName, handler) {
  const schools = await School.find({ isActive: true });
  for (const school of schools) {
    try {
      await handler(school);
    } catch (err) {
      console.error(`[smsJobs] ${jobName} failed for school ${school._id}:`, err.message);
    }
  }
}

async function checkOverdueLibraryBooksJob() {
  await forEachActiveSchool('checkOverdueLibraryBooks', (school) => libraryService.checkOverdueBooks(school._id.toString()));
}

async function sendFeePaymentRemindersJob() {
  await forEachActiveSchool('sendFeePaymentReminders', (school) => feesService.sendPaymentReminders(school._id.toString()));
}

async function sendExamRemindersJob() {
  await forEachActiveSchool('sendExamReminders', (school) => examsService.sendExamReminders(school._id.toString()));
}

async function studentAtRiskWeeklyCheckJob() {
  await forEachActiveSchool('studentAtRiskWeeklyCheck', async (school) => {
    const currentTerm = await AcademicTerm.findOne({ school: school._id, isCurrent: true });
    if (!currentTerm) return;

    const atRisk = await analyticsService.getStudentAtRisk(school._id.toString(), currentTerm._id.toString());
    if (atRisk.length === 0) return;

    const admins = await User.find({ school: school._id, role: 'school_admin', isActive: true });
    await Promise.all(admins.map((admin) => sendNotification(
      admin._id, 'system', 'At-Risk Students Alert',
      `${atRisk.length} student(s) in your school are flagged as at-risk this term. Review them in your analytics dashboard.`,
      { schoolId: school._id }, ['inApp', 'email'],
    )));
  });
}

function registerSmsJobs() {
  cron.schedule('0 7 * * *', checkOverdueLibraryBooksJob, { timezone: TIMEZONE });
  cron.schedule('0 8 * * 1', sendFeePaymentRemindersJob, { timezone: TIMEZONE });
  cron.schedule('0 8 * * *', sendExamRemindersJob, { timezone: TIMEZONE });
  cron.schedule('0 17 * * 5', studentAtRiskWeeklyCheckJob, { timezone: TIMEZONE });
}

module.exports = {
  registerSmsJobs,
  checkOverdueLibraryBooksJob,
  sendFeePaymentRemindersJob,
  sendExamRemindersJob,
  studentAtRiskWeeklyCheckJob,
};
