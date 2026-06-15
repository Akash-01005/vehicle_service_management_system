import 'dotenv/config';
import './libs/logger.js';
import connectDB from './config/connectDB.js';
import startServer from './config/startServer.js';
import './app.js';

connectDB();
startServer();
