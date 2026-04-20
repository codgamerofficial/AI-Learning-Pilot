const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 100 });
app.use(limiter);

app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/tasks', require('./routes/tasks'));
app.use('/api/v1/wallet', require('./routes/wallet'));
app.use('/api/v1/emergency', require('./routes/emergency'));

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'LifeLink API running' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});