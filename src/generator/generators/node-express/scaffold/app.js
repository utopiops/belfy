// app.js

const express = require('express');
const path = require('path');
const handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
const { sequelize } = require('./models/config');
const routes = require('./routes');


const hbs = handlebars.create({
  defaultLayout: 'default',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
})

const app = express();
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
