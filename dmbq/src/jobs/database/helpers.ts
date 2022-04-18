/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;
// TODO: get rid of mongoose!! use the native mongo driver instead!

export async function getEnvironmentId(accountId: any, environmentName: any) {
  return mongoose.connection.db
    .collection('environment_v2')
    .findOne(
      { accountId, name: environmentName },
      // , { _id: 1 }
    )
    .then((result) => new ObjectId(result!._id));
}
