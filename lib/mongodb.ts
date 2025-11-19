import { JobCard } from '@/models/job-card';
import { Collection, Db, MongoClient } from 'mongodb';

// ✅ Ensure this file runs only on the server
import 'server-only';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'jobcarddb';

if (!uri) {
  throw new Error('❌ Missing environment variable: MONGODB_URI');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
let db: Db;

// Global caching ensures connection reuse in development (hot reload-safe)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    console.log('using cached mongo client');
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  console.log('creating new mongo client');
  clientPromise = client.connect();
}

/**
 * Connect to the MongoDB database.
 * Uses global caching for performance and avoids reconnects.
 */
export async function connectToDatabase(): Promise<Db> {
  if (db){
    console.log('using cached database');
    return db;
  } 
  const client = await clientPromise;
  console.log('connecting to new database');
  db = client.db(dbName);
  return db;
}

/**
 * Get the JobCards collection from the connected database.
 */
export async function getJobCardsCollection(): Promise<Collection<JobCard>> {
  const database = await connectToDatabase();
  return database.collection<JobCard>('job_cards');
}

/**
 * Generate a sequential job card number (atomic counter).
 * Format: JC-00001
 */
export async function generateJobCardNumber(): Promise<string> {
  const database = await connectToDatabase();
  const counters = database.collection('counters');

  const result = await counters.findOneAndUpdate(
    { _id: 'job_card_number' as any },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' as const }
  );

  const seq = (result.value?.seq as number) || 1;
  return `JC-${String(seq).padStart(5, '0')}`;
}

/**
 * Cleanly close the MongoDB connection (used in rare teardown scenarios).
 */
export async function closeConnection() {
  if (client) {
    await client.close();
    db = undefined as unknown as Db;
  }
}
