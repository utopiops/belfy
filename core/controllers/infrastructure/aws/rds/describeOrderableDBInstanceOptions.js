const { handleRequest } = require("../../../helpers");
const { getRds } = require("./getRds");
const { handleAwsRequest } = require("../helpers");
const yup = require('yup');

async function describeOrderableDBInstanceOptions(req, res) {
  const validationSchema = yup.object().shape({
    Engine: yup.string().required(),
    EngineVersion: yup.string().required()
  });
  const handle = async () => {
    const { Engine, EngineVersion } = req.body
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const rds = await getRds(baseConfig);

    const params = {
      Engine,
      EngineVersion
    }

    const fn = () => rds.describeOrderableDBInstanceOptions(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    let options = []
    outputs.OrderableDBInstanceOptions.forEach(i => {
      const idx = options.findIndex(o => o.DBInstanceClass == i.DBInstanceClass)
      if (idx == -1) {
        options.push({
          DBInstanceClass: i.DBInstanceClass,
          Combinations: [
            {
              StorageType: i.StorageType,
              SupportsIops: i.SupportsIops,
              MinStorageSize: i.MinStorageSize,
              MaxStorageSize: i.MaxStorageSize,
              MinIopsPerDbInstance: i.MinIopsPerDbInstance,
              MaxIopsPerDbInstance: i.MaxIopsPerDbInstance,
              MinIopsPerGib: i.MinIopsPerGib,
              MaxIopsPerGib: i.MaxIopsPerGib,
              MultiAZCapable: i.MultiAZCapable
            }
          ]
        })
      } else {
        options[idx].Combinations.push({
          StorageType: i.StorageType,
          SupportsIops: i.SupportsIops,
          MinStorageSize: i.MinStorageSize,
          MaxStorageSize: i.MaxStorageSize,
          MinIopsPerDbInstance: i.MinIopsPerDbInstance,
          MaxIopsPerDbInstance: i.MaxIopsPerDbInstance,
          MinIopsPerGib: i.MinIopsPerGib,
          MaxIopsPerGib: i.MaxIopsPerGib,
          MultiAZCapable: i.MultiAZCapable
        })
      }
    })
    return options
  };
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = describeOrderableDBInstanceOptions;
