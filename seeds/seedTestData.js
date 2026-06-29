require('dotenv').config();
const mongoose = require('mongoose');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Class = require('../src/models/Class');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ptcs');
  console.log('Connected to MongoDB');

  // Clean existing test data
  await Promise.all([
    School.deleteOne({ email: 'admin@testschool.edu' }),
    User.deleteMany({ email: { $in: ['admin@testschool.edu', 'teacher@testschool.edu', 'parent@testschool.edu'] } }),
  ]);

  // 1. Create School
  const school = await School.create({
    name: 'Test School PTCS',
    email: 'admin@testschool.edu',
    phone: '+1-555-0100',
    type: 'secondary',
    address: { street: '1 Academy Road', city: 'Testville', state: 'TS', country: 'US', zip: '00001' },
  });
  console.log(`School created: ${school.name} (${school._id})`);

  // 2. Create Users
  const [admin, teacher, parent] = await User.create([
    {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@testschool.edu',
      password: 'AdminPass123',
      role: 'school_admin',
      school: school._id,
    },
    {
      firstName: 'Sarah',
      lastName: 'Teacher',
      email: 'teacher@testschool.edu',
      password: 'TeacherPass123',
      role: 'teacher',
      school: school._id,
      phone: '+1-555-0101',
    },
    {
      firstName: 'Mike',
      lastName: 'Parent',
      email: 'parent@testschool.edu',
      password: 'ParentPass123',
      role: 'parent',
      school: school._id,
      phone: '+1-555-0102',
    },
  ]);
  console.log('Users created: Admin, Teacher, Parent');

  // 3. Create Classes
  const [class10A, class10B] = await Class.create([
    { name: 'Grade 10-A', grade: '10', section: 'A', school: school._id, teacher: teacher._id, academicYear: '2025-2026' },
    { name: 'Grade 10-B', grade: '10', section: 'B', school: school._id, teacher: teacher._id, academicYear: '2025-2026' },
  ]);
  console.log('Classes created: Grade 10-A, Grade 10-B');

  // 4. Create Students
  const [john, jane, michael] = await Student.create([
    {
      firstName: 'John',
      lastName: 'Doe',
      studentId: '1001',
      school: school._id,
      class: class10A._id,
      parents: [parent._id],
      gender: 'male',
      dateOfBirth: new Date('2008-05-15'),
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      studentId: '1002',
      school: school._id,
      class: class10A._id,
      parents: [parent._id],
      gender: 'female',
      dateOfBirth: new Date('2008-03-20'),
    },
    {
      firstName: 'Michael',
      lastName: 'Johnson',
      studentId: '1003',
      school: school._id,
      class: class10B._id,
      parents: [parent._id],
      gender: 'male',
      dateOfBirth: new Date('2008-07-10'),
    },
  ]);
  console.log('Students created: John Doe (1001), Jane Smith (1002), Michael Johnson (1003)');

  // 5. Add students to classes
  await Class.findByIdAndUpdate(class10A._id, { students: [john._id, jane._id] });
  await Class.findByIdAndUpdate(class10B._id, { students: [michael._id] });

  console.log('\n========================================');
  console.log('  Test Data Seeded Successfully!');
  console.log('========================================');
  console.log('\nLOGIN CREDENTIALS');
  console.log('  Admin:   admin@testschool.edu   / AdminPass123');
  console.log('  Teacher: teacher@testschool.edu / TeacherPass123');
  console.log('  Parent:  parent@testschool.edu  / ParentPass123');
  console.log('\nSTUDENTS');
  console.log('  John Doe     | ID: 1001 | DOB: 2008-05-15 | Grade 10-A');
  console.log('  Jane Smith   | ID: 1002 | DOB: 2008-03-20 | Grade 10-A');
  console.log('  Michael J.   | ID: 1003 | DOB: 2008-07-10 | Grade 10-B');
  console.log('========================================\n');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
