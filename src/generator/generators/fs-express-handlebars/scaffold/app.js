// app.js

const express = require('express');
const { sequelize } = require('./models');
const expressConfig = require('./config/express');
const routes = require('./routes');

const app = express();

// Express configurations
expressConfig(app);

// Routes
app.use(routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Sync database models
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
