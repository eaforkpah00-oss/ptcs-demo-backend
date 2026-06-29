require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const create = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ptcs');
  console.log('Connected to MongoDB');

  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@ptcs.io';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const user = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email,
    password,
    role: 'super_admin',
    isActive: true,
  });

  console.log('\n========================================');
  console.log('  Super Admin Created!');
  console.log('========================================');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('========================================\n');

  await mongoose.disconnect();
};

create().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
