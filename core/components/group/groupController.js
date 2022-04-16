const constants     = require('../../utils/constants');
const Group         = require('../../db/models/group');
const tokenService  = require('../../utils/auth/tokenService');
const User          = require('../../db/models/user');
const yup           = require('yup');
const HttpService = require('../../utils/http/index');
const http = new HttpService();
const config = require('../../utils/config').config;
const { defaultLogger: logger } = require('../../logger');

exports.getGroupsList = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const group = new Group();
  const result = await group.getGroupsList(accountId);
  // TODO: Check the role of the user (roles).

  if (result.success) {
    res.send(result.output.groups);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }

}
exports.getGroup = async (req, res) => {
  const accountId = res.locals.accountId;
  const name = req.params.name;
  const group = new Group();
  const result = await group.getGroup(accountId, name);
  // TODO: Check the role of the user (roles).

  if (result.success) {
    res.send(result.output.group);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}

exports.addGroup = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const dto = req.body;
  const validationSchema = yup.object().shape({
    name: yup.string().required(""),
    description: yup.string()
  });

  try {
    validationSchema.validateSync(dto);
  } catch (e) {
    res.status(constants.statusCodes.ue).send(e.message);
    return;
  }
  
  const groupDetails = {
    accountId,
    ...dto
  };
  const group = new Group();
  const result = await group.addGroup(groupDetails);
  if (result.success) {
    res.sendStatus(constants.statusCodes.ok);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.deleteGroup = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const name = req.params.name;

  const group = new Group();
  const result = await group.deleteGroup(accountId, name);
  // TODO: Check the role of the user (roles)

  if (result.success) {
    res.sendStatus(constants.statusCodes.ok);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
exports.updateGroup = async (req, res, next) => {
  const dto = req.body;
  const validationSchema = yup.object().shape({
    description: yup.string()
  });
  try {
    delete dto.name; // Cannot change the name, just in case it was provided in an api call delete it
    validationSchema.validateSync(dto);
  } catch (e) {
    res.status(constants.statusCodes.ue).send(e.message);
    return;
  }

  const accountId = res.locals.accountId;
  const name = req.params.name;

  const group = new Group();
  const result = await group.updateGroup(accountId, name, dto);
  // TODO: Check the role of the user (roles)

  if (result.success) {
    res.sendStatus(constants.statusCodes.ok);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}

exports.removeUsersFromGroup = async (req, res, next) => {
  const dto = req.body;
  const validationSchema = yup.object().shape({
    users: yup.array().of(yup.string()).unique('Duplicate users').required()
  });
  try {
    delete dto.name; // Cannot change the name, just in case it was provided in an api call delete it
    validationSchema.validateSync(dto);
  } catch (e) {
    res.status(constants.statusCodes.ue).send(e.message);
    return;
  }

  try {
    const accountId = res.locals.accountId;
    const user = new User();
    const allExist = await user.usersExist(accountId, dto.users);
    if (!allExist.success) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
    const name = req.params.name;
    const group = new Group();
    const result = await group.removeUsersFromGroup(accountId, name, allExist.output.users);
    if(!result.success) {
      if (result.message === 'Not found') {
        res.sendStatus(constants.statusCodes.badRequest);
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    }

    const body = {
      users: dto.users
    };
    const reqConfig = { headers: { Authorization: req.headers.authorization } };
    const url = `${config.accessManagerUrl}/policy/group/${name}/delete/user`;
    await http.post(url, body, reqConfig); // TODO: What if this fails??? Rollback

    // TODO: Check the role of the user (roles)
    res.sendStatus(constants.statusCodes.ok);
    logger.info(`Users were deleted from the group successfully.`)
  } catch (e) {
    logger.error(`Failed to delete users from the group: ${e}`)
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.addUsersToGroup = async (req, res, next) => {
  const dto = req.body;
  const validationSchema = yup.object().shape({
    users: yup.array().of(yup.string()).unique('Duplicate users').required()
  });
  try {
    delete dto.name; // Cannot change the name, just in case it was provided in an api call delete it
    validationSchema.validateSync(dto);
  } catch (e) {
    res.status(constants.statusCodes.ue).send(e.message);
    return;
  }

  try {
    const accountId = res.locals.accountId;
    const user = new User();
    const allExist = await user.usersExist(accountId, dto.users);
    if (!allExist.success) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
    const name = req.params.name;
    const group = new Group();
    const result = await group.addUsersToGroup(accountId, name, allExist.output.users);
    if(!result.success) {
      if (result.message === 'Not found') {
        res.sendStatus(constants.statusCodes.badRequest);
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    }

    const body = {
      users: dto.users
    };
    const reqConfig = { headers: { Authorization: req.headers.authorization } };
    const url = `${config.accessManagerUrl}/policy/group/${name}/user`;
    await http.post(url, body, reqConfig); // TODO: What if this fails??? Rollback
    
    // TODO: Check the role of the user (roles)
    res.sendStatus(constants.statusCodes.ok);
    logger.info(`Users were added to the group successfully.`)
  } catch (e) {
    logger.error(`Failed to add users to the group: ${e}`)
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.getGroupMembers = async (req, res) => {
  const accountId = res.locals.accountId;
  const name = req.params.name;
  const group = new Group();
  const result = await group.getGroupMembers(accountId, name);
  // TODO: Check the role of the user (roles).

  if (result.success) {
    res.send(result.output.members);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
exports.getGroupNotMembers = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const name = req.params.name;
  const user = new User();
  const result = await user.getGroupNotMembers(accountId, name);
  // TODO: Check the role of the user (roles).

  if (result.success) {
    res.send(result.output.members);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}