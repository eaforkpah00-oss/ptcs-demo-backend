require('dotenv').config();
const mongoose = require('mongoose');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Class = require('../src/models/Class');
const Attendance = require('../src/models/Attendance');
const Behavior = require('../src/models/Behavior');
const Academic = require('../src/models/Academic');
const Event = require('../src/models/Event');
const Announcement = require('../src/models/Announcement');
const Message = require('../src/models/Message');

function getWorkdays(weeksBack) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = weeksBack * 7; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
  }
  return days;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function gradeFromPercent(pct) {
  if (pct >= 0.8) return 'A';
  if (pct >= 0.65) return 'B';
  if (pct >= 0.5) return 'C';
  return 'D';
}

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ptcs');
  console.log('Connected to MongoDB\n');

  // ── WIPE ──────────────────────────────────────────────────────────────────
  await Promise.all([
    School.deleteMany({}),
    User.deleteMany({}),
    Student.deleteMany({}),
    Class.deleteMany({}),
    Attendance.deleteMany({}),
    Behavior.deleteMany({}),
    Academic.deleteMany({}),
    Event.deleteMany({}),
    Announcement.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log('Database cleared');

  // ── SCHOOL ────────────────────────────────────────────────────────────────
  const school = await School.create({
    name: 'PTCS International School',
    email: 'info@ptcs.edu',
    phone: '+233-30-200-1234',
    type: 'secondary',
    address: {
      street: '14 Independence Avenue',
      city: 'Accra',
      state: 'Greater Accra',
      country: 'Ghana',
      zip: 'GA-001',
    },
    website: 'https://ptcs.edu',
  });

  // ── SUPER ADMIN ───────────────────────────────────────────────────────────
  await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@ptcs.edu',
    password: 'Super@123',
    role: 'super_admin',
    isActive: true,
  });

  // ── SCHOOL ADMIN ──────────────────────────────────────────────────────────
  const schoolAdmin = await User.create({
    firstName: 'Kweku',
    lastName: 'Mensah',
    email: 'admin@ptcs.edu',
    password: 'Admin@123',
    role: 'school_admin',
    school: school._id,
    phone: '+233-24-100-0001',
    isActive: true,
  });

  // ── TEACHER ───────────────────────────────────────────────────────────────
  const teacher = await User.create({
    firstName: 'Kwabena',
    lastName: 'Adjei',
    email: 'kwabena.adjei@ptcs.edu',
    password: 'Teacher@123',
    role: 'teacher',
    school: school._id,
    phone: '+233-24-100-0002',
    isActive: true,
  });

  // ── PARENTS ───────────────────────────────────────────────────────────────
  const parentRecords = [
    { firstName: 'Grace',    lastName: 'Mensah',   email: 'grace.mensah@email.com',    phone: '+233-24-200-0001' },
    { firstName: 'Samuel',   lastName: 'Boateng',  email: 'samuel.boateng@email.com',  phone: '+233-24-200-0002' },
    { firstName: 'Linda',    lastName: 'Darko',    email: 'linda.darko@email.com',     phone: '+233-24-200-0003' },
    { firstName: 'Kwame',    lastName: 'Asante',   email: 'kwame.asante@email.com',    phone: '+233-24-200-0004' },
    { firstName: 'Adwoa',    lastName: 'Frimpong', email: 'adwoa.frimpong@email.com',  phone: '+233-24-200-0005' },
    { firstName: 'Ernest',   lastName: 'Ofori',    email: 'ernest.ofori@email.com',    phone: '+233-24-200-0006' },
    { firstName: 'Beatrice', lastName: 'Amoah',    email: 'beatrice.amoah@email.com',  phone: '+233-24-200-0007' },
    { firstName: 'Philip',   lastName: 'Agyei',    email: 'philip.agyei@email.com',    phone: '+233-24-200-0008' },
    { firstName: 'Margaret', lastName: 'Owusu',    email: 'margaret.owusu@email.com',  phone: '+233-24-200-0009' },
    { firstName: 'Daniel',   lastName: 'Ansah',    email: 'daniel.ansah@email.com',    phone: '+233-24-200-0010' },
  ];

  const parents = await User.create(
    parentRecords.map((p) => ({
      ...p,
      password: 'Parent@123',
      role: 'parent',
      school: school._id,
      isActive: true,
    }))
  );

  // ── CLASS ─────────────────────────────────────────────────────────────────
  const cls = await Class.create({
    name: 'Grade 10 - Gold',
    grade: '10',
    section: 'Gold',
    school: school._id,
    teacher: teacher._id,
    academicYear: '2025-2026',
    isActive: true,
  });

  // ── STUDENTS ──────────────────────────────────────────────────────────────
  const studentRecords = [
    { firstName: 'Ama',    lastName: 'Mensah',   studentId: 'STU-1001', gender: 'female', dob: '2010-03-14', pi: 0 },
    { firstName: 'Kofi',   lastName: 'Boateng',  studentId: 'STU-1002', gender: 'male',   dob: '2010-07-22', pi: 1 },
    { firstName: 'Abena',  lastName: 'Darko',    studentId: 'STU-1003', gender: 'female', dob: '2010-01-05', pi: 2 },
    { firstName: 'Yaw',    lastName: 'Asante',   studentId: 'STU-1004', gender: 'male',   dob: '2010-11-30', pi: 3 },
    { firstName: 'Akosua', lastName: 'Frimpong', studentId: 'STU-1005', gender: 'female', dob: '2010-06-18', pi: 4 },
    { firstName: 'Kojo',   lastName: 'Ofori',    studentId: 'STU-1006', gender: 'male',   dob: '2010-09-02', pi: 5 },
    { firstName: 'Efua',   lastName: 'Amoah',    studentId: 'STU-1007', gender: 'female', dob: '2010-04-27', pi: 6 },
    { firstName: 'Nana',   lastName: 'Agyei',    studentId: 'STU-1008', gender: 'male',   dob: '2010-12-09', pi: 7 },
    { firstName: 'Adwoa',  lastName: 'Owusu',    studentId: 'STU-1009', gender: 'female', dob: '2010-08-15', pi: 8 },
    { firstName: 'Kweku',  lastName: 'Ansah',    studentId: 'STU-1010', gender: 'male',   dob: '2010-02-20', pi: 9 },
  ];

  const students = await Student.create(
    studentRecords.map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      studentId: s.studentId,
      gender: s.gender,
      dateOfBirth: new Date(s.dob),
      school: school._id,
      class: cls._id,
      parents: [parents[s.pi]._id],
      isActive: true,
    }))
  );
  await Class.findByIdAndUpdate(cls._id, { students: students.map((s) => s._id) });
  console.log('School, users, class, and 10 students created');

  // ── ATTENDANCE (2 weeks x 10 students = ~100 records) ─────────────────────
  const workdays = getWorkdays(2);
  // [present=P, absent=A, tardy=T] pattern per student across 10 days
  const patterns = [
    ['present','present','present','present','present','present','present','present','present','tardy'],
    ['present','present','absent', 'present','present','present','present','present','present','present'],
    ['present','present','present','present','tardy', 'present','present','present','present','present'],
    ['present','absent', 'present','present','present','present','present','present','tardy', 'present'],
    ['present','present','present','present','present','present','absent', 'present','present','present'],
    ['present','present','present','tardy', 'present','present','present','present','present','present'],
    ['present','present','present','present','present','absent', 'present','present','present','present'],
    ['absent', 'present','present','present','present','present','present','tardy', 'present','present'],
    ['present','present','present','present','present','present','present','present','absent', 'present'],
    ['present','present','tardy', 'present','present','present','present','present','present','present'],
  ];

  const attendanceDocs = [];
  students.forEach((student, si) => {
    workdays.forEach((date, di) => {
      attendanceDocs.push({
        student: student._id,
        class: cls._id,
        school: school._id,
        date,
        status: patterns[si][di % patterns[si].length],
        markedBy: teacher._id,
      });
    });
  });
  await Attendance.insertMany(attendanceDocs);
  console.log(`${attendanceDocs.length} attendance records created (${workdays.length} days)`);

  // ── ACADEMIC (30 assessments: 3 per student) ──────────────────────────────
  const assessments = [
    { subject: 'Mathematics',     type: 'Mid-term Exam', title: 'Term 2 Mid-term Exam - Mathematics',     max: 100 },
    { subject: 'Science',         type: 'Quiz',          title: 'Term 2 Science Quiz',                   max: 50  },
    { subject: 'English Language',type: 'Assignment',    title: 'Term 2 Written Assignment - English',   max: 30  },
  ];

  // scores[studentIndex][assessmentIndex]
  const scores = [
    [78, 41, 25],   // Ama
    [65, 35, 22],   // Kofi
    [88, 46, 28],   // Abena
    [52, 28, 16],   // Yaw
    [91, 48, 29],   // Akosua
    [84, 43, 27],   // Kojo
    [73, 38, 24],   // Efua
    [60, 32, 20],   // Nana
    [95, 49, 30],   // Adwoa
    [69, 37, 23],   // Kweku
  ];

  const academicDocs = [];
  students.forEach((student, si) => {
    assessments.forEach((a, ai) => {
      const score = scores[si][ai];
      const pct = score / a.max;
      academicDocs.push({
        student: student._id,
        teacher: teacher._id,
        class: cls._id,
        school: school._id,
        subject: a.subject,
        assessmentType: a.type,
        title: a.title,
        score,
        maxScore: a.max,
        grade: gradeFromPercent(pct),
        feedback: pct >= 0.8
          ? 'Excellent work. Keep it up!'
          : pct >= 0.65
          ? 'Good effort. A little more focus will push you to the top.'
          : pct >= 0.5
          ? 'Satisfactory, but there is room for improvement. Please attend extra lessons.'
          : 'Below expectations. Please see the teacher for additional support.',
        date: daysAgo((ai + 1) * 7),
      });
    });
  });
  await Academic.insertMany(academicDocs);
  console.log('30 academic assessments created');

  // ── BEHAVIOR (6 logs) ─────────────────────────────────────────────────────
  await Behavior.insertMany([
    {
      student: students[0]._id, teacher: teacher._id, class: cls._id, school: school._id,
      date: daysAgo(3), type: 'positive', category: 'Academic',
      description: 'Ama demonstrated outstanding leadership during the group project presentation. She helped peers grasp complex concepts and kept the group on track.',
      severity: 'low', parentNotified: true,
    },
    {
      student: students[1]._id, teacher: teacher._id, class: cls._id, school: school._id,
      date: daysAgo(5), type: 'negative', category: 'Discipline',
      description: 'Kofi was found using his phone during the Mathematics lesson despite two prior verbal warnings. His device was confiscated for the remainder of the school day.',
      actionTaken: 'Phone confiscated. Parents contacted. Reminder sent about device policy.',
      severity: 'medium', parentNotified: true, followUpRequired: true,
    },
    {
      student: students[3]._id, teacher: teacher._id, class: cls._id, school: school._id,
      date: daysAgo(4), type: 'concern', category: 'Academic',
      description: 'Yaw has submitted incomplete homework for the third consecutive week. Classroom engagement has also noticeably declined.',
      actionTaken: 'Private conversation held with student. Recommended enrolment in after-school support sessions.',
      severity: 'medium', followUpRequired: true,
    },
    {
      student: students[5]._id, teacher: teacher._id, class: cls._id, school: school._id,
      date: daysAgo(2), type: 'positive', category: 'Participation',
      description: 'Kojo achieved the highest score in the Science quiz and voluntarily offered to tutor three classmates who struggled with the topic.',
      severity: 'low', parentNotified: true,
    },
    {
      student: students[7]._id, teacher: teacher._id, class: cls._id, school: school._id,
      date: daysAgo(1), type: 'negative', category: 'Punctuality',
      description: 'Nana arrived 45 minutes late without a valid excuse. This is the third incident this month. Morning registration was missed.',
      actionTaken: 'One-hour after-school detention issued. Parents notified by phone call.',
      severity: 'high', parentNotified: true, followUpRequired: true,
    },
    {
      student: students[9]._id, teacher: teacher._id, class: cls._id, school: school._id,
      date: daysAgo(6), type: 'neutral', category: 'General',
      description: 'Kweku requested a seat change due to distractions from nearby students. Request was reviewed and approved. Focus has visibly improved since.',
      severity: 'low',
    },
  ]);
  console.log('6 behavior logs created');

  // ── EVENTS (3 upcoming) ───────────────────────────────────────────────────
  await Event.insertMany([
    {
      title: 'Parent-Teacher Conference',
      description: 'End-of-term parent-teacher consultation day. Parents are invited to meet their ward\'s class teacher to review academic progress, attendance, and overall development.',
      school: school._id, organizer: schoolAdmin._id,
      type: 'Academic',
      startDate: daysFromNow(7), endDate: daysFromNow(7),
      startTime: '09:00', endTime: '15:00',
      location: 'Main Hall, PTCS International School',
      status: 'upcoming', targetAudience: ['all', 'parents', 'teachers'],
    },
    {
      title: 'Inter-School Science Fair',
      description: 'Students from Grade 9 and 10 will present original science and technology projects to a panel of judges. All parents and guardians are warmly invited.',
      school: school._id, organizer: teacher._id,
      type: 'Academic',
      startDate: daysFromNow(14), endDate: daysFromNow(14),
      startTime: '10:00', endTime: '16:00',
      location: 'School Gymnasium',
      status: 'upcoming', targetAudience: ['all'],
    },
    {
      title: 'End of Term 2 Examinations',
      description: 'Final examinations for Term 2. Individual timetables will be distributed to students by their class teachers. Please ensure students arrive by 07:45 AM on each examination day.',
      school: school._id, organizer: schoolAdmin._id,
      type: 'Exam',
      startDate: daysFromNow(21), endDate: daysFromNow(28),
      startTime: '08:00', endTime: '13:00',
      location: 'Examination Hall, Block C',
      status: 'upcoming', targetAudience: ['all', 'parents', 'students'],
    },
  ]);
  console.log('3 upcoming events created');

  // ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
  await Announcement.insertMany([
    {
      title: 'Welcome to the PTCS School Portal',
      content: 'We are delighted to launch the PTCS Parent-Teacher Collaborative System. This platform allows parents to monitor attendance, track academic performance, communicate directly with teachers, and stay informed about school events in real time. Please complete your profile to get started.',
      school: school._id, author: schoolAdmin._id,
      targetAudience: ['all'], priority: 'normal',
      isPinned: false, isPublished: true,
    },
    {
      title: 'Term 2 School Fees — Payment Deadline',
      content: 'This is a reminder that the deadline for Term 2 school fees payment is the 15th of next month. Parents who have not yet made payment are strongly urged to settle their balance at the school bursar\'s office or via the online payment portal. Failure to pay by the deadline may result in limited access to certain school services.',
      school: school._id, author: schoolAdmin._id,
      targetAudience: ['all', 'parents'], priority: 'important',
      isPinned: true, isPublished: true,
    },
    {
      title: 'Upcoming Parent-Teacher Conference — Book Your Slot',
      content: 'The school will host its Term 2 Parent-Teacher Conference. Appointment slots are available from 9:00 AM to 3:00 PM. Each session is 15 minutes. To reserve your slot, please contact the school office or reply to this announcement. Attendance is highly encouraged as it is a valuable opportunity to discuss your child\'s progress.',
      school: school._id, author: teacher._id,
      targetAudience: ['all', 'parents', 'teachers'], priority: 'urgent',
      isPinned: true, isPublished: true,
    },
  ]);
  console.log('3 announcements created');

  // ── MESSAGES (teacher ↔ parents) ──────────────────────────────────────────
  const threads = [
    {
      pi: 0,
      subject: 'Ama\'s Outstanding Performance This Term',
      teacherMsg: 'Dear Mrs. Mensah,\n\nI am writing to commend Ama on her exceptional performance this term. She achieved 78% in Mathematics and 82% in Science, and has been a consistent positive presence in class. Her recent group presentation was particularly impressive.\n\nPlease continue to encourage her at home. She has real potential.\n\nWarm regards,\nMr. Adjei',
      parentReply: 'Dear Mr. Adjei,\n\nThank you so much for taking the time to share this. We are incredibly proud of Ama and grateful for your encouragement. She speaks very fondly of your lessons.\n\nKind regards,\nGrace Mensah',
      teacherRead: true, parentRead: true,
    },
    {
      pi: 1,
      subject: 'Regarding Kofi\'s Mobile Phone Incident',
      teacherMsg: 'Dear Mr. Boateng,\n\nI wish to bring to your attention that Kofi was found using his mobile phone during our Mathematics lesson today, despite two prior warnings. In line with school policy, his phone was confiscated for the day and will be returned tomorrow.\n\nI would greatly appreciate your support in reinforcing our device policy at home.\n\nRegards,\nMr. Adjei',
      parentReply: 'Dear Mr. Adjei,\n\nI sincerely apologise for this. I have spoken to Kofi and made it clear that this behaviour is unacceptable. Thank you for handling it so professionally. It will not happen again.\n\nSamuel Boateng',
      teacherRead: true, parentRead: true,
    },
    {
      pi: 2,
      subject: 'Abena\'s Term 2 Assessment Summary',
      teacherMsg: 'Dear Mrs. Darko,\n\nI am pleased to share Abena\'s Term 2 results. She achieved a B in Mathematics, an A in Science, and an A in the English assignment. Overall, she is performing very well and is a delight to teach.\n\nPlease keep encouraging her at home.\n\nBest regards,\nMr. Adjei',
      parentReply: null,
      teacherRead: false, parentRead: false,
    },
    {
      pi: 3,
      subject: 'Concern: Yaw\'s Academic Engagement',
      teacherMsg: 'Dear Mr. Asante,\n\nI am reaching out because I have noticed a decline in Yaw\'s classroom engagement over the past two weeks. He has also submitted incomplete homework on three occasions. I would like to work together to identify how best we can support him.\n\nCould we arrange a brief call this week? Please let me know your availability.\n\nRegards,\nMr. Adjei',
      parentReply: 'Dear Mr. Adjei,\n\nThank you for bringing this to my attention — I was not aware. I will speak with Yaw this evening. Friday morning works for a call if that suits you.\n\nKwame Asante',
      teacherRead: false, parentRead: true,
    },
    {
      pi: 7,
      subject: 'Punctuality Issue — Urgent Attention Required',
      teacherMsg: 'Dear Mr. Agyei,\n\nI must bring to your urgent attention that Nana has arrived late to school on three occasions this month, including today, where he missed the first 45 minutes of the school day without a valid explanation. Detention has been issued in line with school policy.\n\nThis pattern needs to be addressed promptly. Your support is very important.\n\nMr. Adjei',
      parentReply: 'Dear Mr. Adjei,\n\nI sincerely apologise. We have had transport difficulties but I am arranging a new solution this week. I assure you this will be resolved. Thank you for your patience.\n\nPhilip Agyei',
      teacherRead: false, parentRead: true,
    },
  ];

  for (const t of threads) {
    const sent = await Message.create({
      sender: teacher._id,
      recipient: parents[t.pi]._id,
      school: school._id,
      subject: t.subject,
      content: t.teacherMsg,
      isRead: t.parentRead,
    });
    if (t.parentReply) {
      await Message.create({
        sender: parents[t.pi]._id,
        recipient: teacher._id,
        school: school._id,
        subject: 'Re: ' + t.subject,
        content: t.parentReply,
        parentId: sent._id,
        isRead: t.teacherRead,
      });
    }
  }
  console.log('5 message threads created\n');

  console.log('========================================');
  console.log('  Live Data Seeded Successfully!');
  console.log('========================================');
  console.log('  School:  PTCS International School');
  console.log('  Class:   Grade 10 - Gold (10 students)');
  console.log('');
  console.log('  Role         Email                          Password');
  console.log('  Super Admin  superadmin@ptcs.edu            Super@123');
  console.log('  School Admin admin@ptcs.edu                 Admin@123');
  console.log('  Teacher      kwabena.adjei@ptcs.edu         Teacher@123');
  console.log('  Parents (10) [name]@email.com               Parent@123');
  console.log('');
  console.log('  Attendance:    ' + attendanceDocs.length + ' records (' + workdays.length + ' school days)');
  console.log('  Academic:      30 assessments (3 per student)');
  console.log('  Behavior:       6 logs (2 positive, 2 negative, 1 concern, 1 neutral)');
  console.log('  Events:         3 upcoming');
  console.log('  Announcements:  3 published');
  console.log('  Messages:       5 threads (some unread)');
  console.log('========================================\n');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
