process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const mongoose = require('mongoose');

// Uses the local MongoDB instance (already running on this machine for dev)
// with a dedicated, disposable database — never the app's real MONGODB_URI.
const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ptcs_test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  // Index creation (e.g. unique constraints) happens async in the background —
  // wait for it so uniqueness is actually enforced on a freshly created test DB.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
