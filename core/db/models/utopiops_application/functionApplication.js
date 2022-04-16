const { Schema } = require("mongoose");
const UtopiopsApplication = require('./utopiopsApplication');
const constants = require("../../../utils/constants");

const functionApplicationSchema = new Schema(
  {
    repositoryUrl: {
      type: String,
      required: true
    },
    domain: {
      type: String,
      required: true
    },
    integrationName: {
      type: String
    },
    branch: {
      type: String,
      required: true
    },
    history: {
      _id: false,
      type: [
        {
          sha: String,
          functions: [ 
            {
              _id: false,
              name: {
                type: String,
                required: true
              },
              version: {
                type: Number,
                required: true
              }
            }
          ],
          createdAt: {
            type: Number,
            default: Date.now
          }
        }
      ]
    }
  }
);

module.exports = UtopiopsApplication.discriminator(
  constants.applicationKinds.function,
  functionApplicationSchema
);
