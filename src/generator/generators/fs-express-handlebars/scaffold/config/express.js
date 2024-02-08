// config/express.js

const express = require('express');
const exphbs = require('express-handlebars');

module.exports = function(app) {
  // Express middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Handlebars setup
  app.engine('handlebars', exphbs());
  app.set('view engine', 'handlebars');
  
  // Static folder
  app.use(express.static('public'));
};
