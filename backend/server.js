const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });

const app = require('./app');
const connectDatabase = require('./config/database');

// Connect to MongoDB
connectDatabase();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
