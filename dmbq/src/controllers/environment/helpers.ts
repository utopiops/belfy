/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
import mongoose from 'mongoose';
// TODO: refactor this file

const { ObjectId } = mongoose.Types;

export async function getEnvironmentId(accountId: string, environmentName: any) {
  return mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName }, { projection: { _id: 1 } })
    .then((result) => result!._id);
}

export async function getProviderId(accountId: string, providerName: any) {
  return mongoose.connection.db
    .collection('providers')
    .findOne({ accountId: new ObjectId(accountId), displayName: providerName }, { projection: { _id: 1 } })
    .then((result) => result?._id);
}

export async function getEnvironmentLatestVersion(accountId: string, environmentName: any) {
  return mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName }, { projection: { versions: 1 } })
    .then((result) => result?.versions.length);
}

export async function getEnvironmentVersion(accountId: string, environmentName: any) {
  return mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName })
    .then((result) => result?.deployedVersion || result?.activeVersion || 1);
}

export async function findLegitimateAlb(accountId: string, environmentName: string, version: number) {
  const env = await mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName }, { projection: { versions: 1 } });
  let LegitimateAlb;
  for (const alb of env!.versions[version - 1].albList) {
    let hasHttp = false;
    let hasHttps = false;
    alb.listenerRules.forEach((listener: { protocol: string; port: number; certificateArn: string }) => {
      if (listener.protocol === 'HTTP' && listener.port === 80) {
        hasHttp = true;
      } else if (listener.protocol === 'HTTPS' && listener.port === 443 && listener.certificateArn) {
        hasHttps = true;
      }
    });
    if (hasHttp && hasHttps) {
      LegitimateAlb = alb;
      break;
    }
  }
  return LegitimateAlb;
}

export async function findLegitimateCluster(accountId: string, environmentName: string, version: number) {
  const env = await mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName }, { projection: { versions: 1 } });
  for (const cluster of env!.versions[version - 1].ecsClusterList) {
    for (const ig of cluster.instanceGroups) {
      if (ig.instances.length > 0) return cluster;
    }
  }
  return false;
}

export async function isNewEnvironment(accountId: string, environmentName: string) {
  // todo: use this in stage 1
  const env = await mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName });
  if (env) {
    return false;
  }
  return true;
}
