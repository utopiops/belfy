// Note: this file contains the entities to support the applications v2. It includes environments and the applications.
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const constants = require('../../../utils/constants');
const EcsApplication = require('./ecsApplication');
const S3WebsiteApplication = require('./s3WebsiteApplication');
const ClassicBakedApplication = require('./classicBakedApplication');
const ApplicationVersion = require('./applicationVersion');
mongoose.set('debug', true);

const modelName = 'env_application';


const environmentApplicationSchema = new Schema({
    environment: {
        type: ObjectId,
        ref: 'environment'
    },
    name: {
        type: 'String'
    },
    description: String,
    kind: String, // This field is repeated in the applicationVersion schema! is it the best way?!!
    activeVersion: Number,
    versions: {
        type: [{
            type: ObjectId,
            ref: 'application_version'
        }],
        default: []
    },
    variableValues: {   //TODO: Get rid of this, it's to be replaced by a dataBag 
        type: [
            {
                _id: false,
                name: 'String',
                currentValue: 'String'
            }
        ],
        default: []
    },
    deployedAt: {
        type: Number
    },
    deployedBy: {
        type: ObjectId,
        ref: 'User'
    },
    destroyedAt: {
        type: Number
    },
    destroyedBy: {
        type: ObjectId,
        ref: 'User'
    },
    activatedAt: {
        type: Number
    },
    activatedBy: {
        type: ObjectId,
        ref: 'User'
    },
    /*
  created: the application is created for the first time (only once in the application's lifetime)
  deploying: for the application in created state, deploy action puts it in deploying state
  deployed: a successful deploy action moves the application from deploying state to deployed state
  deploy_failed: an unsuccessful deploy action moves the application from deploying state to failed state
  destroying: for the application in created state, destroy action puts it in destroying state
  destroyed: a successful destroy action moves the application from destroying state to destroyed state
  destroy_failed: an unsuccessful destroy action moves the application from destroying state to failed state
  */
    state: {
        type: {
            _id: false,
            code: {
                code: String
            },
            job: String
        },
        default: {
            code: 'created' // We don't provide reason for the state code ⏩created⏪
        }
    },
    lock: {
        type: {
            _id: false,
            isLocked: Boolean, // set the other values only if this is true
            lockedAt: Date,
            id: String
        },
        default: {
            isLocked: false
        }
    }
}, { toJSON: { virtuals: true } });

// indices
environmentApplicationSchema.index({ environment: 1, name: 1 }, { unique: true });
environmentApplicationSchema.virtual('job', {
    ref: 'Job',
    localField: 'state.job',
    foreignField: 'jobId',
    select: 'jobId',
    justOne: true
});

/// statics

// Creates an ecs application
environmentApplicationSchema.statics.createEcsApplication = createEcsApplication;
environmentApplicationSchema.statics.addEcsApplicationVersion = addEcsApplicationVersion;
environmentApplicationSchema.statics.updateEcsApplication = updateEcsApplication;
environmentApplicationSchema.statics.createS3WebsiteApplication = createS3WebsiteApplication;
environmentApplicationSchema.statics.addS3WebsiteApplicationVersion = addS3WebsiteApplicationVersion;
environmentApplicationSchema.statics.updateS3WebsiteApplication = updateS3WebsiteApplication;
environmentApplicationSchema.statics.createClassicBakedApplication = createClassicBakedApplication;
environmentApplicationSchema.statics.addClassicBakedApplicationVersion = addClassicBakedApplicationVersion;
environmentApplicationSchema.statics.updateClassicBakedApplication = updateClassicBakedApplication;
environmentApplicationSchema.statics.activateApplication = activateApplication;
environmentApplicationSchema.statics.getForTf = getForTf;
environmentApplicationSchema.statics.getApplicationKind = getApplicationKind;
environmentApplicationSchema.statics.listEnvironmentApplications = listEnvironmentApplications;
environmentApplicationSchema.statics.listEnvironmentApplicationVersions = listEnvironmentApplicationVersions;
environmentApplicationSchema.statics.deleteApplication = deleteApplication;
environmentApplicationSchema.statics.setState = setState;

async function createEcsApplication(environmentId, appName, description, appVersion) {
    let step = 0;
    let appId;
    try {
        const newApp = {
            environment: environmentId,
            name: appName,
            description,
            kind: constants.applicationKinds.ecs
        };
        const app = new this(newApp);
        await app.save();
        step++;

        appVersion.environmentApplication = app._id;

        if (appVersion.dnsSettings && appVersion.dnsSettings.albId) {
            appVersion.dnsSettings.albId = ObjectId(appVersion.dnsSettings.albId);
        }
        appVersion.clusterId = ObjectId(appVersion.clusterId);

        const doc = new EcsApplication(appVersion);
        await doc.save();
        step++;

        appId = doc._id;
        console.log(`appId`, appId);

        const filter = { _id: app._id };
        const update = {
            '$push':
            {
                'versions': appId
            }
        };
        const updated = this.findOneAndUpdate(filter, update, { new: true }).exec();
        if (updated == null) {
            throw new Error("Failed to update");
        }
        return {
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        try {
            if (step > 0) {
                // rollback the first part (application insert)
                await this.findOneAndDelete({ environmentId, name: appName }).exec();
            }
            if (step > 1) {
                // rollback the second part (application version insert)
                await EcsApplication.findOneAndDelete({ _id: appId }).exec();
            }
        } catch (e) {
            let message = err.message;
            return {
                success: false,
                message: message
            };
        }
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
//-------------------------------------
async function addEcsApplicationVersion(environmentId, appName, description, appVersion, fromVersion) {
    let step = 0;
    let appId;
    try {
        // Check if the environment application exists (get it's _id)
        const filter = {
            environment: environmentId,
            name: appName,
            kind: constants.applicationKinds.ecs
        };
        const app = await this.findOneAndUpdate(filter, { description }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // Check if an application-version with the specified version exists for this environment application
        const appVersionFilter = {
            environmentApplication: app._id,
            version: fromVersion
        };
        const appVer = await ApplicationVersion.findOne(appVersionFilter, { _id: 1 }).exec();
        if (appVer == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // Find the biggest version for this environment application
        const maxFilter = {
            environmentApplication: app._id
        };
        const max = await ApplicationVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
        if (max == null) {
            return {
                success: false
            };
        }


        // Increase the version by 1 and add the new application version
        appVersion.environmentApplication = app._id;
        appVersion.fromVersion = fromVersion;
        appVersion.version = max.version + 1;

        if (appVersion.dnsSettings && appVersion.dnsSettings.albId) {
            appVersion.dnsSettings.albId = ObjectId(appVersion.dnsSettings.albId);
        }
        appVersion.clusterId = ObjectId(appVersion.clusterId);

        const doc = new EcsApplication(appVersion);
        await doc.save();
        step++;

        appId = doc._id;

        // Push the version to the environment application versions
        const update = {
            '$push':
            {
                'versions': appId
            }
        };
        const updated = this.findOneAndUpdate({ _id: app._id }, update, { new: true }).exec();
        if (updated == null) {
            throw new Error("Failed to update");
        }
        return {
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        try {
            if (step > 1) {
                // rollback the application version insert
                await EcsApplication.findOneAndDelete({ _id: appId }).exec();
            }
        } catch (e) {
            let message = err.message;
            return {
                success: false,
                message: message
            };
        }
        let message = err.message;
        if (err.code && err.code === 11000) {
            message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the same time and the new version becomes equal for both!!!
        }
        return {
            success: false,
            message: message
        };
    }

}
//-------------------------------------
async function updateEcsApplication(environmentId, appName, description, appVersion) {
    try {
        // Check if the environment application exists (get it's _id)
        const filter = {
            environment: environmentId,
            name: appName,
            kind: constants.applicationKinds.ecs
        };
        const app = await this.findOneAndUpdate(filter, { description }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // If an application-version with the specified version which has never been activated exists for this environment application update it
        const appVersionFilter = {
            environmentApplication: app._id,
            version: appVersion.version,
            isActivated: false
        };
        const doc = await EcsApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }

}
//---------------------------------------
async function createS3WebsiteApplication(environmentId, appName, description, appVersion) {
    let step = 0;
    try {
        const newApp = {
            environment: environmentId,
            name: appName,
            description,
            kind: constants.applicationKinds.s3Website
        };
        const app = new this(newApp);
        await app.save();
        step++;

        appVersion.environmentApplication = app._id;

        const doc = new S3WebsiteApplication(appVersion);
        await doc.save();
        step++;

        let appId = doc._id;
        console.log(`appId`, appId);

        const filter = { _id: app._id };
        const update = {
            '$push':
            {
                'versions': appId
            }
        };
        const updated = this.findOneAndUpdate(filter, update, { new: true }).exec();
        if (updated == null) {
            throw new Error("Failed to update");
        }
        return {
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        try {
            if (step > 0) {
                // rollback the first part (application insert)
                await this.findOneAndDelete({ environmentId, name: appName }).exec();
            }
            if (step > 1) {
                // rollback the second part (application version insert)
                await S3WebsiteApplication.findOneAndDelete({ _id: appId }).exec();
            }
        } catch (e) {
            let message = err.message;
            return {
                success: false,
                message: message
            };
        }
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
//-------------------------------------
async function addS3WebsiteApplicationVersion(environmentId, appName, description, appVersion, fromVersion) {
    let step = 0;
    try {
        // Check if the environment application exists (get it's _id)
        const filter = {
            environment: environmentId,
            name: appName,
            kind: constants.applicationKinds.s3Website
        };
        const app = await this.findOneAndUpdate(filter, { description }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // Check if an application-version with the specified version exists for this environment application
        const appVersionFilter = {
            environmentApplication: app._id,
            version: fromVersion
        };
        const appVer = await ApplicationVersion.findOne(appVersionFilter, { _id: 1 }).exec();
        if (appVer == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // Find the biggest version for this environment application
        const maxFilter = {
            environmentApplication: app._id
        };
        const max = await ApplicationVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
        if (max == null) {
            return {
                success: false
            };
        }


        // Increase the version by 1 and add the new application version
        appVersion.environmentApplication = app._id;
        appVersion.fromVersion = fromVersion;
        appVersion.version = max.version + 1;

        if (appVersion.dnsSettings && appVersion.dnsSettings.albId) { // TODO: WTF?
            appVersion.dnsSettings.albId = ObjectId(appVersion.dnsSettings.albId);
        }
        appVersion.clusterId = ObjectId(appVersion.clusterId); // TODO: WTF?

        const doc = new S3WebsiteApplication(appVersion);
        await doc.save();
        step++;

        let appId = doc._id;

        // Push the version to the environment application versions
        const update = {
            '$push':
            {
                'versions': appId
            }
        };
        const updated = this.findOneAndUpdate({ _id: app._id }, update, { new: true }).exec();
        if (updated == null) {
            throw new Error("Failed to update");
        }
        return {
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        try {
            if (step > 1) {
                // rollback the application version insert
                await S3WebsiteApplication.findOneAndDelete({ _id: appId }).exec();
            }
        } catch (e) {
            let message = err.message;
            return {
                success: false,
                message: message
            };
        }
        let message = err.message;
        if (err.code && err.code === 11000) {
            message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the same time and the new version becomes equal for both!!!
        }
        return {
            success: false,
            message: message
        };
    }

}
//-------------------------------------
async function updateS3WebsiteApplication(environmentId, appName, description, appVersion) {
    try {
        // Check if the environment application exists (get it's _id)
        const filter = {
            environment: environmentId,
            name: appName,
            kind: constants.applicationKinds.s3Website
        };
        const app = await this.findOneAndUpdate(filter, { description }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // If an application-version with the specified version which has never been activated exists for this environment application update it
        const appVersionFilter = {
            environmentApplication: app._id,
            version: appVersion.version,
            isActivated: false
        };
        const doc = await S3WebsiteApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function createClassicBakedApplication(environmentId, appName, description, appVersion) {
    let step = 0;
    let appId;
    try {
        const newApp = {
            environment: environmentId,
            name: appName,
            description,
            kind: constants.applicationKinds.classicBaked
        };
        const app = new this(newApp);
        await app.save();
        step++;

        appVersion.environmentApplication = app._id;

        const doc = new ClassicBakedApplication(appVersion);
        await doc.save();
        step++;

        appId = doc._id;

        const filter = { _id: app._id };
        const update = {
            '$push':
            {
                'versions': appId
            }
        };
        const updated = this.findOneAndUpdate(filter, update, { new: true }).exec();
        if (updated == null) {
            throw new Error("Failed to update");
        }
        return {
            outputs: {
                version: appVersion
            },
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        try {
            if (step > 0) {
                // rollback the first part (application insert)
                await this.findOneAndDelete({ environmentId, name: appName }).exec();
            }
            if (step > 1) {
                // rollback the second part (application version insert)
                await ClassicBakedApplication.findOneAndDelete({ _id: appId }).exec();
            }
        } catch (e) {
            let message = err.message;
            return {
                success: false,
                message: message
            };
        }
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
//-------------------------------------
async function addClassicBakedApplicationVersion(environmentId, appName, description, appVersion, fromVersion) {
    let step = 0;
    let appId;
    try {
        // Check if the environment application exists (get it's _id)
        const filter = {
            environment: environmentId,
            name: appName,
            kind: constants.applicationKinds.classicBaked
        };
        const app = await this.findOneAndUpdate(filter, { description }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // Check if an application-version with the specified version exists for this environment application
        const appVersionFilter = {
            environmentApplication: app._id,
            version: fromVersion
        };
        const appVer = await ApplicationVersion.findOne(appVersionFilter, { _id: 1 }).exec();
        if (appVer == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // Find the biggest version for this environment application
        const maxFilter = {
            environmentApplication: app._id
        };
        const max = await ApplicationVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
        if (max == null) {
            return {
                success: false
            };
        }


        // Increase the version by 1 and add the new application version
        appVersion.environmentApplication = app._id;
        appVersion.fromVersion = fromVersion;
        appVersion.version = max.version + 1;

        if (appVersion.dnsSettings && appVersion.dnsSettings.albId) {
            appVersion.dnsSettings.albId = ObjectId(appVersion.dnsSettings.albId);
        }
        appVersion.clusterId = ObjectId(appVersion.clusterId);

        const doc = new ClassicBakedApplication(appVersion);
        await doc.save();
        step++;

        appId = doc._id;

        // Push the version to the environment application versions
        const update = {
            '$push':
            {
                'versions': appId
            }
        };
        const updated = this.findOneAndUpdate({ _id: app._id }, update, { new: true }).exec();
        if (updated == null) {
            throw new Error("Failed to update");
        }
        return {
            outputs: {
                version: appVersion.version
            },
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        try {
            if (step > 1) {
                // rollback the application version insert
                await ClassicBakedApplication.findOneAndDelete({ _id: appId }).exec();
            }
        } catch (e) {
            let message = err.message;
            return {
                success: false,
                message: message
            };
        }
        let message = err.message;
        if (err.code && err.code === 11000) {
            message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the same time and the new version becomes equal for both!!!
        }
        return {
            success: false,
            message: message
        };
    }

}
//-------------------------------------
async function updateClassicBakedApplication(environmentId, appName, description, appVersion) {
    let step = 0;
    try {
        // Check if the environment application exists (get it's _id)
        const filter = {
            environment: environmentId,
            name: appName,
            kind: constants.applicationKinds.classicBaked
        };
        const app = await this.findOneAndUpdate(filter, { description }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // If an application-version with the specified version which has never been activated exists for this environment application update it
        const appVersionFilter = {
            environmentApplication: app._id,
            version: appVersion.version,
            isActivated: false
        };
        const doc = await ClassicBakedApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
        console.log(`doc`, doc);
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            outputs: {
                version: appVersion.version
            },
            success: true
        };

    } catch (err) {
        console.log(`error`, err.message);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }

}
//---------------------------------------
async function activateApplication(userId, environmentId, applicationName, version) {
    let step = 0;
    let doc;
    try {
        // Check if such version for such application exists
        const filter = { environment: new ObjectId(environmentId), name: applicationName, activeVersion: { $ne: version } };
        doc = await this.findOne(filter)
            .populate('versions', 'version')
            .exec();
        if (doc == null || !doc.populated('versions')) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        const exists = doc.versions.findIndex(v => v.version === version) !== -1;
        if (!exists) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }

        // Now that it exists, update it
        const update = {
            activeVersion: version,
            activatedAt: timeService.now(),
            activatedBy: userId
        }
        const updated = await this.findByIdAndUpdate(doc._id, update, { new: true }).exec();
        if (updated == null) {
            return {
                success: false,
                message: 'Failed to update'
            };
        }
        step++;

        const appVersionFilter = {
            environmentApplication: doc._id,
            version
        };
        const appVer = await ApplicationVersion.findOneAndUpdate(appVersionFilter, { $set: { isActivated: true } }, { new: true }).exec();
        if (appVer == null) { // This would mean data inconsistency!!
            return {
                success: false
            };
        }

        return {
            success: true
        };
    } catch (err) {
        if (step > 0) {
            // rollback the activation data
            const update = {
                activeVersion: doc.activeVersion,
                activatedAt: doc.activatedAt,
                activatedBy: doc.activatedBy
            }
            const updated = await this.findByIdAndUpdate(doc._id, update, { new: true }).exec();
            if (updated == null) {
                return {
                    success: false,
                    message: 'Failed to update'
                };
            }
        }
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function getForTf(environmentId, applicationName, version = null) {
    try {
        let appFilter = { environment: environmentId, name: applicationName };
        if (!version) { // If the version is not specified we find the active version of the application
            appFilter.activeVersion = { $exists: true };
        }
        const doc = await this.findOne(appFilter, { activeVersion: 1, kind: 1, name: 1, description: 1 })
            .populate('environment', 'region hostedZone domain')
            .exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }

        // If the version is not specified we use the version of the activated env-app
        const filter = { environmentApplication: doc._id, version: version ? version : doc.activeVersion };
        let app;
        switch (doc.kind) {
            case constants.applicationKinds.ecs:
                app = await EcsApplication.findOne(filter)
                    .populate({
                        path: 'cluster',
                        select: 'ecsClusterList.name ecsClusterList.instanceGroups.name -_id'
                    })
                    .populate({
                        path: 'alb',
                        select: 'albList.name albList.listenerRules.port -_id'
                    })
                    .populate({
                        path: 'rdsDetails',
                        select: 'name -_id',
                        match: { activeVersion: { $exists: true } }
                    })
                    .populate('createdBy', 'username -_id')
                    .exec();
                break;
            case constants.applicationKinds.s3Website: {
                app = await S3WebsiteApplication.findOne(filter)
                    .populate('createdBy', 'username -_id')
                    .exec();
                break;
            }
            case constants.applicationKinds.classicBaked: {
                app = await ClassicBakedApplication.findOne(filter)
                    .populate({
                        path: 'alb',
                        select: 'albList.name albList.listenerRules.port -_id'
                    })
                    .populate({
                        path: 'nlb',
                        select: 'nlbList.name -_id'
                    })
                    .populate('createdBy', 'username -_id')
                    .exec();
                break;
            }
        }
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        let result = app.toJSON();
        result.region = doc.environment.region;
        result.hostedZone = doc.environment.hostedZone;
        result.domain = doc.environment.domain;
        result.description = doc.description;
        return {
            success: true,
            output: {
                app: result
            }
        }
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
async function getApplicationKind(environmentId, applicationName) {
    try {
        const appFilter = { environment: environmentId, name: applicationName };
        const doc = await this.findOne(appFilter, { kind: 1, _id: 1, activeVersion: 1 }).exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                kind: doc.kind,
                id: doc._id,
                activeVersion: doc.activeVersion
            }
        }
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
async function listEnvironmentApplications(environmentIds) {
    try {
        const filter = { environment: { $in: environmentIds } };
        const applications = await this.find(filter, { name: 1, kind: 1, activeVersion: 1, state: 1 })
            .populate('environment', 'name')
            .exec();
        if (applications == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        let appList = applications.map(app => ({
            id: app._id,
            state: app.state,
            name: app.name,
            kind: app.kind,
            activeVersion: app.activeVersion,
            environmentName: app.environment.name
        }));
        return {
            success: true,
            output: {
                applications: appList
            }
        }
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
//-----------------------------
async function listEnvironmentApplicationVersions(environmentId, databaseName) {
    try {
        const filter = { environment: environmentId, name: databaseName };
        const applications = await this.findOne(filter, { _id: 1 }).populate('versions', 'version fromVersion createdAt').exec();
        if (applications == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        let appList = applications.versions.map(app => ({
            version: app.version,
            fromVersion: app.fromVersion,
            kind: app.kind,
            createdAt: app.createdAt,
        }));
        return {
            success: true,
            output: {
                applications: appList
            }
        }
    } catch (err) {
        console.error(`error: `, err);
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
async function deleteApplication(userId, environmentId, applicationName) {
    let doc;
    try {
        // Check if such version for such application exists
        const filter = { environment: new ObjectId(environmentId), name: applicationName };
        doc = await this.findOne(filter).exec();
        console.log(`doc`, doc);
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        // TODO: This is just the basic condition for now, has to be refined later as we use the application and figure out the common usage patterns
        let canDelete = false;
        if (["destroyed", "created"].indexOf(doc.state.code) !== -1 || !doc.activeVersion) {
            canDelete = true;
        }
        if (!canDelete) {
            return {
                success: false,
                message: "Cannot delete the environment, it needs to be destroyed first"
            };
        }
        const appVersionFilter = { environmentApplication: doc._id };
        await ApplicationVersion.deleteMany(appVersionFilter).exec();
        await this.findByIdAndDelete(doc._id).exec();
        return {
            success: true
        };
    } catch (err) {
        console.log(`error`, err.message);
        return {
            success: false,
            message: err.message
        };
    }
}
//-------------------------------------
async function setState(environmentId, applicationName, state) {
    try {
        const stateCode = state.code;
        let validCurrentState = [];
        switch (stateCode) {
            case 'destroyed':
            case 'destroy_failed':
                validCurrentState = ['destroying']
                break;
            case 'deployed':
            case 'deploy_failed':
                validCurrentState = ['deploying']
                break;
            case 'destroying':
                validCurrentState = [null, 'deployed', 'destroy_failed', 'deploy_failed']
                break;
            case 'deploying':
                validCurrentState = [null, 'created', 'deployed', 'destroyed', 'destroy_failed', 'deploy_failed']
                break;
        }
        const filter = { // Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
            environment: environmentId,
            name: applicationName,
            'state.code': { $in: validCurrentState }
        };
        const app = await this.findOneAndUpdate(filter, { $set: { state } }, { new: true }).exec();
        if (app == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true
        };

    } catch (err) {
        console.error(`error: `, err.message);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}

module.exports = mongoose.model(modelName, environmentApplicationSchema);
