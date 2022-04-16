const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const modelName = 'Account';

const Account = new Schema({
    rootUserId: {
        type: ObjectId,
        ref: 'User'
    },
    status: String
});

Account.statics.updateStatus = updateStatus;


//----------------------------------
async function updateStatus(rootUserId, newStatus) {
    try {
        const filter = { rootUserId: new ObjectId(rootUserId) };
        const doc = await this.findOneAndUpdate(filter, { status: newStatus }, { new: true }).exec();
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
        console.log(`error: ${e.message}`);
        return {
            success: false,
            message: e.message
        };
    }
}

module.exports = mongoose.model(modelName, Account);