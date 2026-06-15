import express from 'express';
import cookieParser from 'cookie-parser';
import corsMiddleware from './middlewares/cors.js';
import userRouter from './routes/user.routes.js';
import garageRouter from './routes/garage.routes.js';
import customerRouter from './routes/customer.routes.js';
import vehicleRouter from './routes/vehicle.routes.js';
import serviceRecordRouter from './routes/serviceRecord.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(corsMiddleware);
app.use('/api/auth', userRouter);
app.use('/api/garages', garageRouter);
app.use('/api/customers', customerRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/service-records', serviceRecordRouter);


app.use(errorHandler);

export default app;
