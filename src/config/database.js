import 'dotenv/config';
import mongoose from 'mongoose';
import { URL } from 'url';
import { resolveSrv, Resolver } from 'dns/promises';

const DEFAULT_URI = 'mongodb://localhost:27017/interviewace';
const GOOGLE_DNS = ['8.8.8.8', '8.8.4.4'];

const resolveSrvRecords = async (hostname) => {
  try {
    return await resolveSrv(`_mongodb._tcp.${hostname}`);
  } catch (err) {
    const resolver = new Resolver();
    resolver.setServers(GOOGLE_DNS);
    return await resolver.resolveSrv(`_mongodb._tcp.${hostname}`);
  }
};

const normalizeMongoSrvUri = async (uri) => {
  if (!uri.startsWith('mongodb+srv://')) return uri;

  const url = new URL(uri);
  const hostname = url.hostname;
  const username = url.username;
  const password = url.password;
  const dbName = url.pathname?.slice(1) || 'interviewace';
  const query = url.searchParams.toString();

  const records = await resolveSrvRecords(hostname);
  const hosts = records.map((record) => `${record.name}:${record.port}`).join(',');

  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  const queryString = query ? `?${query}` : '';

  return `mongodb://${auth}${hosts}/${dbName}${queryString}`;
};

export const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI || DEFAULT_URI;
  const uri = await normalizeMongoSrvUri(rawUri);

  mongoose.set('strictQuery', false);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    throw err;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message);
});
