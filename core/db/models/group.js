const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const modelName = 'Group';

const Group = new Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

Group.index({ name: 1, accountId: 1 }, { unique: true });

Group.methods.getGroupsList = getGroupsList;
Group.methods.getGroup = getGroup;
Group.methods.addGroup = addGroup;
Group.methods.deleteGroup = deleteGroup;
Group.methods.updateGroup = updateGroup;
Group.methods.removeUsersFromGroup = removeUsersFromGroup;
Group.methods.addUsersToGroup = addUsersToGroup;
Group.methods.getGroupMembers = getGroupMembers;

async function getGroupsList(accountId) {
  try {
    const filter = { accountId: new ObjectId(accountId) };
    const groups = await GroupModel.find(filter, { _id: 1, name: 1, description: 1 }).exec();
    const result = groups.map(g => {
      return {
        id: g._id,
        name: g.name,
        description: g.description
      };
    });
    return {
      success: true,
      output: {
        groups: result
      }
    };
  } catch (e) {
    console.log(`error: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

async function getGroup(accountId, name) {
  try {
    const filter = { accountId: new ObjectId(accountId), name };
    const group = await GroupModel.findOne(filter, { _id: 0, name: 1, description: 1, members: 1 })
      .populate(
        {
          path: 'members',
          select: '-_id username',
          match: { isDeleted: false }
        }).exec();
    return {
      success: true,
      output: {
        group
      }
    };
  } catch (e) {
    console.log(`error: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

async function addGroup(data) {
  try {
    const group = new GroupModel(data);
    const saved = await group.save();
    return {
      success: true
    };
  } catch (e) {
    let message = e.message;
    if (e.message.indexOf('username_1 dup key') !== -1) {
      message = 'duplicate username';
    } else if (e.message.indexOf('email_1 dup key') !== -1) {
      message = 'duplicate email';
    }
    return {
      success: false,
      message: message
    };
  }
}

async function deleteGroup(accountId, name) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: name, members: { $size: 0 } };
    const result = await GroupModel.findOneAndDelete(filter).exec();
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

async function updateGroup(accountId, name, dto) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: name };
    const update = {
      description: dto.description
    };
    const result = await GroupModel.findOneAndUpdate(filter, update).exec();
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

async function removeUsersFromGroup(accountId, name, users) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: name };
    const update = {
      $pullAll: { // avoiding duplicate
        members: users
      }
    };
    const result = await GroupModel.findOneAndUpdate(filter, update).exec();
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
    console.log(`error: ${JSON.stringify(e.message)}`);
    return {
      success: false,
      message: e.message
    };
  }
}

async function addUsersToGroup(accountId, name, users) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: name };
    const update = {
      $addToSet: { // avoiding duplicate
        members: users
      }
    };
    const result = await GroupModel.findOneAndUpdate(filter, update).exec();
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
    console.log(`error: ${JSON.stringify(e.message)}`);
    return {
      success: false,
      message: e.message
    };
  }
}

async function getGroupMembers(accountId, name) {
  try {
    const filter = { accountId: new ObjectId(accountId), name };
    const group = await GroupModel.findOne(filter, { _id: 0, members: 1 })
      .populate(
        {
          path: 'members',
          select: '-_id username',
          match: { isDeleted: false }
        }).exec();
    if (!group) {
      return {
        success: false,
        message: 'Not found'
      };
    }
    return {
      success: true,
      output: {
        members: group.members
      }
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}

const GroupModel = mongoose.model(modelName, Group);
module.exports = GroupModel;