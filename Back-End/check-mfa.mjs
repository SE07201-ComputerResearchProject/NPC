import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
const users = await mongoose.connection.db.collection('users').find(
  {},
  { projection: { email: 1, 'mfa.enabled': 1, 'emailMfa.enabled': 1 } }
).toArray();
console.log('=== MFA Status per user ===');
users.forEach(u => {
  const totp = u.mfa?.enabled ? 'YES' : 'no';
  const email= u.emailMfa?.enabled ? 'YES' : 'no';
  console.log(`${u.email} | TOTP: ${totp} | EmailOTP: ${email}`);
});
console.log(`\nTotal users: ${users.length}`);
console.log(`Both enabled: ${users.filter(u => u.mfa?.enabled && u.emailMfa?.enabled).length}`);
await mongoose.disconnect();
