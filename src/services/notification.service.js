const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const User = require('../models/User');

const QUEUE_NAME = 'notifications';

let connection = null;
let queue = null;
let mailer = null;

if (process.env.REDIS_URL) {
  connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (err) => console.error('[notification.service] Redis error:', err.message));
  queue = new Queue(QUEUE_NAME, { connection });
} else {
  console.warn('[notification.service] REDIS_URL not set — external channels (sms/email/whatsapp/push) will be delivered inline instead of queued.');
}

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function deliverEmail(user, title, body) {
  if (!mailer || !user?.email) return;
  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: title,
    text: body,
  });
}

// Africa's Talking / WhatsApp / push credentials are not yet provisioned in this
// environment. These stay as clearly-marked no-ops so callers never need their own
// delivery logic — wire a real provider here without touching any module code.
async function deliverSms(user, body) {
  if (!process.env.AFRICASTALKING_API_KEY) {
    console.warn(`[notification.service] SMS not configured — would send to ${user?.phone}: ${body}`);
    return;
  }
}

async function deliverWhatsapp(user, body) {
  console.warn(`[notification.service] WhatsApp not configured — would send to ${user?.phone}: ${body}`);
}

async function deliverPush(user, title, body) {
  console.warn(`[notification.service] Push not configured — would send to ${user?._id}: ${title} — ${body}`);
}

async function deliverExternal({ recipientId, title, body, channels }) {
  const user = await User.findById(recipientId);
  if (!user) return;
  await Promise.all(channels.map((channel) => {
    if (channel === 'email') return deliverEmail(user, title, body);
    if (channel === 'sms') return deliverSms(user, body);
    if (channel === 'whatsapp') return deliverWhatsapp(user, body);
    if (channel === 'push') return deliverPush(user, title, body);
    return Promise.resolve();
  }));
}

if (queue) {
  new Worker(QUEUE_NAME, async (job) => deliverExternal(job.data), { connection });
}

/**
 * Every module that needs to alert a user must call this instead of building
 * its own SMS/email/WhatsApp/push logic (Rule 2 of the SMS merger build).
 */
async function sendNotification(recipientId, type, title, body, data = {}, channels = ['inApp']) {
  await Notification.create({
    recipient: recipientId,
    school: data.schoolId || data.school || null,
    type,
    title,
    body,
    data,
  });

  const externalChannels = channels.filter((c) => c !== 'inApp');
  if (externalChannels.length === 0) return;

  const payload = { recipientId, type, title, body, data, channels: externalChannels };
  if (queue) {
    await queue.add('deliver', payload);
  } else {
    await deliverExternal(payload).catch((err) => console.error('[notification.service] inline delivery failed:', err.message));
  }
}

module.exports = { sendNotification };
