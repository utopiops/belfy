const path = require('path');

module.exports = {
  swaggerDefinition: {
    "info": {
        "title": "Core API",
        "version": "1.0.0",
        "description": "This is the core API Documentation.",
        "license": {
            "name": "Copyright (C) Utopiops",
        },
        "contact": {
            "name": "Utopiops",
            "email": "contact@utopiops.com",
            "url": "https://www.utopiops.com"
        }
    }
  },
  apis: [path.join(__dirname, '..', 'components', '*', 'index.js'), path.join(__dirname, '..', 'controllers', '*', 'index.js')]
};