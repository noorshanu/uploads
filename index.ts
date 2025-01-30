import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectDB from './config/db';
import tokenRoutes from './routes/tokenRoutes';
import projectRoutes from './routes/projectRoutes';
import transactionRoutes from './routes/transactionRoutes';
import marketplaceRoutes from './routes/marketPlaceRoutes';
import telegramRoutes from './routes/telegramRoutes';

dotenv.config();
const app = express();


const corsOptions = {
    credentials: true,
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Caches preflight request for 10 minutes
};
// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Routes
app.use('/api/token', tokenRoutes);  
app.use('/api/project', projectRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/telegram', telegramRoutes);

const PORT = process.env.PORT || 5000;               
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



