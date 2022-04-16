const mongoose = require('mongoose'),
  Schema = mongoose.Schema;
const constants = require('../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;

const modelName = 'Integration';

const IntegrationSchema = new Schema({
  account: {
    type: ObjectId,
    ref: 'Account'
  },
  name: String,
  service: {
    type: String,
    enum: Object.values(constants.integrationServices)
  },
  tokenName: String,
  url: String,
  isDefault : {
    type: Boolean,
    default: false
  }
});

IntegrationSchema.index({ account: 1, name: 1 }, { unique: true });


IntegrationSchema.statics.listIntegrations = listIntegrations;
IntegrationSchema.statics.listIntegrationsByAccountId = listIntegrationsByAccountId;
IntegrationSchema.statics.add = add;
IntegrationSchema.statics.update = update;
IntegrationSchema.statics.get = get;
IntegrationSchema.statics.deleteIntegration = deleteIntegration;

//---------------------------------------
async function listIntegrations(accountId) {
  try {
    const filter = {
      account: accountId
    };
    
    const docs = await this.find(filter, { _id: 0, __v: 0 }).exec();
    if (docs == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        integrations: docs
      }
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}
//---------------------------------------
async function listIntegrationsByAccountId(accountId, isDefault, services) {
  try {
    let filter;
    if(isDefault === 'true'){
      filter = {
        account: accountId,
        isDefault: true,
      };
    } else {
      filter = {
        account: accountId
      };
    }
    if(services) {
      filter.service = { $in: services.split(',') };
    }
    const docs = await this.find(filter, { _id: 0, __v: 0 }).exec();
    if (docs == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        integrations: docs
      }
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}
//---------------------------------------
async function add(accountId, data) {
  try {
    const { name, tokenName, url, service, isDefault } = data;
    const integration = { name, account: accountId, tokenName, url, service, isDefault };

    // If this is the first integration for this service, set it as default
    const filter = { account: accountId, service };
    const doc1 = await this.findOne(filter).exec();
    if (!doc1) {
      integration.isDefault = true;
    }
    if(isDefault){
      await this.updateMany({ account: accountId, service, isDefault: true }, { isDefault: false });
    }
    const doc = new this(integration);
    await doc.save();
    return {
      success: true
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//---------------------------------------
async function update(accountId, name, data) {
  try {
    if(data.isDefault) {
      const doc = await this.findOne({ account: accountId, name });
      if(!doc) {
        return {
          success: false,
          message: 'Not found'
        };
      }
      await this.updateMany({ account: accountId, service: doc.service, isDefault: true }, { isDefault: false });
    }
    const filter = { account: new ObjectId(accountId), name: name };
    const update = {
      url: data.url,
      tokenName: data.tokenName,
      isDefault: data.isDefault
    };

    const result = await this.findOneAndUpdate(filter, update).exec();
    if (!result) {
      return {
        success: false,
        message: 'Not found'
      };
    }
    return {
      success: true
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}
//---------------------------------------
async function get(accountId, name) {
  try {
    const filter = { account: accountId, name };
    const doc = await this.findOne(filter, { _id: 0, __v: 0 }).exec();
    if (doc == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        integration: doc
      }
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}
//---------------------------------------
async function deleteIntegration(accountId, name) {
  try {
    const filter = { account: accountId, name };
    const doc = await this.findOneAndDelete(filter).exec();
    if (doc == null || doc.deletedCount === 0) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}

exports.Integration = mongoose.model(modelName, IntegrationSchema);
