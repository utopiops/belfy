const merge = require('lodash/merge');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;
const timeService = require('../../services/time.service');
const AccountModel = require('./account');
const constants = require('../../utils/constants');

const modelName = 'User';
const User = new Schema({
    isRoot: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isActivated: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    receiveUpdates: String,
    jenkinsUrl: String, // todo: delete
    lastActivity: Number,
    lastPasswordSet: Number,
    createdAt: {
        type: Number,
        default: timeService.now
    },
    username: {
        type: String,
        required: true
    },
    organization: String,
    email: {
        type: String,
        required: true
    },
    fullName: String,
    jobTitle: String,
    department: String,
    basedIn: String,
    role: String,
    accountId: String,
    onboardingFlow: String, //onboarding flow name (note: pipelines have unique names per account)
    offboardingFlow: String, //offboarding flow name
    jiraUrl: String, // TODO: Delete all these none sense...
    jenkinsCredentials: {
        username: String,
        token: String
    },
    jiraConfig: {
        url: String,
        credentials: {
            username: String,
            password: String
        }
    },
    infrastructure: {
        awsConfig: {
            credentials: {
                accessKeyId: String,
                secretAccessKey: String
            },
            preferences: {
                defaultRegion: {
                    type: String,
                    default: 'ap-southeast-2'
                }
            }
        }
    }
});

User.index({ username: 1, accountId: 1 }, {
    unique: true, partialFilterExpression: {
        isActivated: { $eq: true }
    }
});

User.plugin(passportLocalMongoose, {
    usernameField: 'username',
    // Set usernameUnique to false to avoid a mongodb index on the username column!
    usernameUnique: false,

    findByUsername: function (model, queryParameters) {
        // Add additional query parameter - AND condition - isActivated: true
        queryParameters.isActivated = true;
        // queryParameters.isDeleted = false;
        return model.findOne(queryParameters);
    }
});

User.methods.getUser = getUser;
// User.methods.addUser = addUser;
User.methods.deleteUser = deleteUser;
User.methods.updateUser = updateUser;
User.methods.setUserPassword = setUserPassword;
User.methods.updateUserActivity = updateUserActivity;
User.methods.usersExist = usersExist;
User.methods.getGroupNotMembers = getGroupNotMembers;
User.methods.getUserGroups = getUserGroups;


User.statics.getUsersList = getUsersList;
User.statics.addUser = addUser;
User.statics.activate = activate;
User.statics.verifyEmail = verifyEmail;
User.statics.setResetPasswordToken = setResetPasswordToken;
User.statics.resetUserPassword = resetUserPassword;
User.statics.changeUserPassword = changeUserPassword;

// TODO: Refactor all these rubbish
// Jenkins methods and virtuals declarations
User.methods.getJenkinsUrl = getJenkinsUrl;
User.methods.getJenkinsCredentials = getJenkinsCredentials;
User.methods.setJenkinsConfig = setJenkinsConfig;
User.virtual('jenkisCredentialsCombined').get(function () {
    return `${this.jenkinsCredentials.username}:${this.jenkinsCredentials.token}`;
});

// Jira methods and virtuals declarations
User.methods.getJiraConfig = getJiraConfig;
User.methods.setJiraConfig = setJiraConfig;

// Infrastructure-aws methods and virtuals declarations
User.methods.getAwsBaseConfig = getAwsBaseConfig;
User.methods.setAwsCredentials = setAwsCredentials;
User.methods.setAwsPreferences = setAwsPreferences;
User.virtual('awsBaseConfig').get(function () {
    return {
        credentials: this.infrastructure.awsConfig.credentials,
        region: this.infrastructure.awsConfig.preferences.defaultRegion
    };
});


// Jenkins methods implementations
async function getJenkinsUrl(id, cb) {
    const url = await this.model(modelName).findById(id, 'jenkinsUrl').exec(cb);
    return url.jenkinsUrl;
}

async function getJenkinsCredentials(id, cb) {
    const credentials = await this.model(modelName).findById(id).exec(cb);
    return credentials.jenkisCredentialsCombined;
}

function setJenkinsConfig(id, configDto, cb) {
    this.model(modelName).findByIdAndUpdate(id, {
        jenkinsUrl: configDto.url,
        jenkinsCredentials: processCredentials(configDto.username, configDto.token)
    }).exec(cb);
}

function processCredentials(username, token) {
    // TODO: implement a secure way to handle the credentials
    return {
        username,
        token
    };
}


// Jira methods implementations
async function getJiraConfig(id, cb) {
    const config = await this.model(modelName).findById(id, {
        '_id': 0,
        'jiraConfig': 1
    }).exec(cb);
    return config.jiraConfig;
}

function setJiraConfig(id, jiraConfigDto, cb) {

    this.model(modelName).findByIdAndUpdate(id, {
        jiraConfig: {
            url: jiraConfigDto.url,
            credentials: processJiraCredentials(jiraConfigDto.credentials)
        }
    }).exec(cb);
}

function processJiraCredentials(credentials) {
    // TODO: implement a secure way to handle the credentials
    return credentials;
}

// AWS methods implementations
async function getAwsBaseConfig(id, cb) {
    const user = await this.model(modelName).findById(id).exec(cb);
    return user.awsBaseConfig;
}

async function setAwsCredentials(id, awsCredentialsDto, cb) {

    var doc = await this.model(modelName).findById(id, 'infrastructure').exec();

    var preferences = undefined;
    if (awsCredentialsDto.defaultRegion) {
        preferences = {
            defaultRegion: awsCredentialsDto.defaultRegion
        }
    }

    var update = {
        infrastructure: {
            awsConfig: {
                credentials: processAwsCredentials(awsCredentialsDto),
                preferences
            }
        }
    };

    await this.model(modelName).findByIdAndUpdate(id, merge(
        doc, update
    )).exec(cb);
}

async function setAwsPreferences(id, awsPreferencesDto, cb) {
    var doc = await this.model(modelName).findById(id, 'infrastructure').exec(); // TODO: Test if it's faster without selecting infrastructure

    await this.model(modelName).findByIdAndUpdate(id, merge(
        doc, {
        infrastructure: {
            awsConfig: {
                preferences: awsPreferencesDto
            }
        }
    })).exec(cb);
}

function processAwsCredentials(dto) {
    // TODO: implement a secure way to handle the credentials
    return {
        accessKeyId: dto.accessKeyId,
        secretAccessKey: dto.secretAccessKey
    };
}


async function getUsersList(accountId) {
    try {
        const filter = { accountId: new ObjectId(accountId), isDeleted: false };
        const users = await this.find(filter, { _id: 0, username: 1, lastActivity: 1, lastPasswordSet: 1, isActivated: 1 }).exec();
        return {
            success: true,
            output: {
                users
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

async function getUser(accountId, username) {
    try {
        const filter = { accountId: new ObjectId(accountId), username, isDeleted: false };
        const user = await UserModel.findOne(filter, { _id: 0, __v: 0 }).exec();
        if (!user) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        return {
            success: true,
            output: {
                user
            }
        };
    } catch (e) {
        return {
            success: false,
            message: e.message
        };
    }
}
async function addUser(data) {
    try {
        // const user = new this(data);
        const count = await this.countDocuments({ username: data.username, isDeleted: false }).exec();
        if (count !== 0) {
            return {
                success: false,
                message: 'duplicate username'
            };
        }

        const user = new this(data);
        await user.save();
        // await this.register(data, "-");
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
        console.log(`error: ${message}`);
        return {
            success: false,
            message: message
        };
    }
}
async function deleteUser(accountId, username, userId) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: username, isDeleted: false, isRoot: false }; // $ne: no self deletion. cannot delete root account
        const result = await UserModel.findOneAndUpdate(filter, { isDeleted: true }, { new: true });
        if (!result) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        return {
            success: true,
            userId: result._id // This is returned just because user deletion is not implemented as a transaction for now
        };
    } catch (e) {
        console.error('error:', e.message);
        return {
            success: false,
            message: e.message
        };
    }
}
async function updateUser(accountId, username, user) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: username, isDeleted: false };
        const update = {
            email: user.email,
            fullName: user.fullName,
            jobTitle: user.jobTitle,
            department: user.department,
            basedIn: user.basedIn,
            onboardingFlow: user.onboardingFlow,
            offboardingFlow: user.offboardingFlow
        };
        const result = await UserModel.findOneAndUpdate(filter, update).exec();
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
        console.log(`e: ${JSON.stringify(e.message)}`);
        return {
            success: false,
            message: e.message
        };
    }
}

async function setUserPassword(accountId, username, password) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: username, isDeleted: false };
        const user = await UserModel.findOne(filter).exec();
        if (!user) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        await user.setPassword(password); // This is because of the passport-local-mongoose strategy
        user.lastPasswordSet = timeService.now();
        await user.save();
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

// Internally used only
async function updateUserActivity(accountId, username) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: username, isDeleted: false };
        const update = {
            lastActivity: timeService.now()
        };
        const result = await UserModel.findOneAndUpdate(filter, update).exec();
        if (!result) {
            throw new Error('User not found');
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

async function usersExist(accountId, usernames) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: { $in: usernames }, isDeleted: false };
        const users = await UserModel.find(filter, { _id: 1 }).exec();
        const result = users.length === usernames.length;
        return {
            success: result,
            output: {
                users
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

async function getGroupNotMembers(accountId, groupName) {
    try {
        const users = await UserModel.aggregate([
            {
                $match: {
                    accountId: accountId,
                    isDeleted: false
                }
            },
            {
                $lookup:
                {
                    from: "groups",
                    localField: "_id",
                    foreignField: "members",
                    as: "groups"
                }
            },
            {
                $match: {
                    "groups.name": { $ne: groupName }
                }
            },
            {
                $project: {
                    _id: 0,
                    username: 1
                }
            }
        ]).exec();
        return {
            success: true,
            output: {
                members: users
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

async function getUserGroups(accountId, username) {
    try {
        const groups = await UserModel.aggregate([
            {
                $match: {
                    accountId: accountId,
                    isDeleted: false,
                    username: username
                }
            },
            {
                $lookup: {
                    from: "groups",
                    localField: "_id",
                    foreignField: "members",
                    as: "groups"
                }
            },
            {
                $unwind: {
                    path: "$groups",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$groups.name"
                }
            }
        ]).exec();
        let result = groups;
        if (groups.length === 0) { // user not found
            return {
                success: false,
                message: 'Not found'
            };
        }
        if (groups.length === 1 && Object.keys(groups[0]).length === 0) { // user doesn't belong to any groups
            result = [];
        }
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
//-----------------------------------------------
async function activate(accountId, username) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: username, isDeleted: false, isActivated: false };
        const doc = await this.findOneAndUpdate(filter, { isActivated: true }, { new: true }).exec();
        if (!doc) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        return {
            success: true
        };
    } catch (e) {
        console.error(`error: ${e.message}`);
        return {
            success: false,
            message: e.message
        };
    }
}
//-----------------------------------------------
async function verifyEmail(accountId, username) {
    try {
        const filter = { accountId: new ObjectId(accountId), username: username, isDeleted: false, isActivated: false };
        const doc = await UserModel.findOneAndUpdate(filter, { isActivated: true }, { new: true }).exec();
        if (!doc) {
            return {
                success: false,
                message: 'Not found'
            };
        }

        // TODO: handle the failure of the second update, damn mongoose for not supporting transaction
        await AccountModel.updateStatus(accountId, constants.accountStatus.registered);

        return {
            success: true
        };
    } catch (e) {
        console.error(`error: ${e.message}`);
        return {
            success: false,
            message: e.message
        };
    }
}
//-----------------------------------------------
async function setResetPasswordToken(email, resetPasswordToken) {
    try {
        const filter = { email, isActivated: true };
        const doc = await this.findOneAndUpdate(filter, { resetPasswordToken }).exec();
        if (!doc) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        return {
            success: true
        };
    } catch (e) {
        console.error('error:', e.message);
        return {
            success: false,
            message: e.message
        };
    }
}
//---------------------------------------------
async function resetUserPassword(email, resetPasswordToken, password) {
    try {
        const filter = { email, resetPasswordToken, isDeleted: false, isActivated: true };
        const user = await this.findOne(filter).exec();
        if (!user) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        await user.setPassword(password); // This is because of the passport-local-mongoose plugin
        user.lastPasswordSet = timeService.now();
        user.resetPasswordToken = "";
        await user.save();
        return {
            success: true
        };
    } catch (e) {
        console.error(`error:`, e.message);
        return {
            success: false,
            message: e.message
        };
    }
}
//---------------------------------------------
async function changeUserPassword(userId, oldPassword, newPassword) {
    try {
        const filter = { _id: ObjectId(userId), isActivated: true };
        const user = await this.findOne(filter).exec();
        if (!user) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        await user.changePassword(oldPassword, newPassword) // This is because of the passport-local-mongoose plugin
        user.lastPasswordSet = timeService.now();
        await user.save();
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

const UserModel = mongoose.model(modelName, User);

module.exports = UserModel;