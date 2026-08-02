import mongoose from 'mongoose';

import { config } from '../config';

import { logger } from '../utils/logger';



export async function connectMongo(): Promise<void> {

  mongoose.set('strictQuery', true);



  await mongoose.connect(config.MONGODB_URI, {

    dbName: config.MONGODB_DB_NAME,

  });



  logger.info('Connected to MongoDB', {

    db: config.MONGODB_DB_NAME,

  });

}



export function isMongoConnected(): boolean {

  return mongoose.connection.readyState === 1;

}



export async function disconnectMongo(): Promise<void> {

  if (mongoose.connection.readyState !== 0) {

    await mongoose.disconnect();

  }

}


