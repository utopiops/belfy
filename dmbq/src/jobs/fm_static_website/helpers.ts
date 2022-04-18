/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;
// TODO: get rid of mongoose!! use the native mongo driver instead!

export async function getDomainId(accountId: string, domainName: string) {
  return mongoose.connection.db
    .collection('domains')
    .findOne({ accountId, domainName })
    .then((result) => new ObjectId(result!._id));
}
