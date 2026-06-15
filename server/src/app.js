import express from 'express';
import cookieParser from 'cookie-parser';
import corsMiddleware from './middlewares/cors.js';
import userRouter from './routes/user.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(corsMiddleware);
app.use('/api/auth', userRouter);


app.use(errorHandler);

export default app;
