import { connect } from 'mongoose';

const connectDB = async () => {
    try {
        const dbURI = process.env.DB_QUERY;
        await connect(dbURI);
        console.log('Connected to MongoDB...');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

export default connectDB;