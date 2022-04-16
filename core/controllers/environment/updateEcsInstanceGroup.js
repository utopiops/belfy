const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

async function updateEcsInstanceGroup(req, res) {

  const validationSchema = yup.object().shape({
    kind: yup.string(),
    instances: yup.array().of(yup.object().shape({
      instanceType: yup.string(),
      weightedCapacity: yup.number()
    })).unique("duplicate instance type", (i) => (i.instanceType)),
    count: yup.number()
      .required(),
    minSize: yup.number(),
    maxSize: yup.number(),
    rootVolumeSize: yup.number()
      .required(),
    keyPairName: yup.string(),
    labels: yup.array().of(yup.string()),
    isSpot: yup.bool()
  });

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, clusterName, instanceGroupName } = req.params;
    const isAdd = req.method === 'PUT' ? false : true;
    const {
      kind,
      instances = [],
      count = 1,
      minSize = 0,
      maxSize,
      rootVolumeSize,
      keyPairName = "",
      labels = [],
      isSpot = false
    } = req.body
    
    const instanceGroup = {
      kind,
      instances,
      count,
      minSize,
      maxSize,
      rootVolumeSize,
      keyPairName,
      labels,
      isSpot
    }
    return await AwsEnvironmentService.updateEcsInstanceGroup(accountId, environmentName, version, isAdd, clusterName, instanceGroupName, instanceGroup);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = updateEcsInstanceGroup;
