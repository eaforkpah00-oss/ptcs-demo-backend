const School = require('../src/models/School');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const { sendNotification } = require('../src/services/notification.service');

describe('Notification service channel resolution', () => {
  async function makeSchoolAndUser(channels) {
    const school = await School.create({ name: 'Notif Demo School', email: `notif${Date.now()}${Math.random()}@test.com` });
    const user = await User.create({
      firstName: 'Ama', lastName: 'Parent', email: `notifuser${Date.now()}${Math.random()}@test.com`,
      password: 'password123', role: 'parent', school: school._id, phone: '0555000111',
      notificationPreferences: { channels },
    });
    return { school, user };
  }

  test('omitting channels resolves to the recipient\'s stored notificationPreferences', async () => {
    const { school, user } = await makeSchoolAndUser(['sms']);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await sendNotification(user._id, 'test_type', 'Test Title', 'Test Body', { schoolId: school._id });

    const notif = await Notification.findOne({ recipient: user._id, type: 'test_type' });
    expect(notif).not.toBeNull();

    const smsAttempt = warnSpy.mock.calls.find((args) => args[0].includes('SMS not configured'));
    warnSpy.mockRestore();
    expect(smsAttempt).toBeDefined();
    expect(smsAttempt[0]).toContain(user.phone);
  });

  test('an explicit channels argument overrides the recipient\'s stored preference', async () => {
    const { school, user } = await makeSchoolAndUser(['sms']);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await sendNotification(user._id, 'test_type', 'Test Title', 'Test Body', { schoolId: school._id }, ['inApp']);
    const smsAttempt = warnSpy.mock.calls.find((args) => args[0].includes('SMS not configured'));
    warnSpy.mockRestore();

    expect(smsAttempt).toBeUndefined();
  });

  test('a recipient with no stored channel preference falls back to inApp only', async () => {
    const school = await School.create({ name: 'Notif Demo School 2', email: `notif2${Date.now()}@test.com` });
    const user = await User.create({
      firstName: 'Kwame', lastName: 'Parent', email: `notifuser2${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await sendNotification(user._id, 'test_type', 'Test Title', 'Test Body', { schoolId: school._id });
    const anyExternalAttempt = warnSpy.mock.calls.find((args) => args[0].includes('not configured'));
    warnSpy.mockRestore();

    expect(anyExternalAttempt).toBeUndefined();
    const notif = await Notification.findOne({ recipient: user._id, type: 'test_type' });
    expect(notif).not.toBeNull();
  });
});
