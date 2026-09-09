import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const client = new MongoClient(process.env.DATABASE_URL);
await client.connect();
const db = client.db(process.env.DB_NAME || 'Peoplix');

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

const existing = await db.collection('users').findOne({ email });

if (existing) {
  await db.collection('users').updateOne(
    { email },
    {
      $set: {
        password_hash: hash,
        status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        role: 'super_admin',
        updated_at: new Date(),
      }
    }
  );
  console.log('✅ Password reset for existing user:', email);
} else {
  await db.collection('users').insertOne({
    email,
    password_hash: hash,
    role: 'super_admin',
    status: 'active',
    email_verified: true,
    failed_login_attempts: 0,
    locked_until: null,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  });
  console.log('✅ Super admin created fresh:', email);
}

await client.close();
console.log('Done. Try logging in with:', email);
