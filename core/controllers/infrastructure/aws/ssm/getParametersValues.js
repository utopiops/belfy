const { handleRequest } = require("../../../helpers");
const { handleAwsRequest } = require('../helpers');
const yup = require('yup');
const { getSSM } = require('./getSSM');
const regions = require('../../../../utils/awsRegions');

async function getParametersValues(req, res) {
  // const queryValidationSchema = yup.object().shape({
  //   names: yup.array().of(yup.string()).required(),
  //   region: yup.string()
  //     .oneOf(regions, "Must be a valid aws region")
  // });

  const handle = async () => {
    const { credentials } = res.locals;
    if (!credentials) { // This indicates that the credentials are not set
        return {
          success: false
        }
    }
    const region = req.query.region; // validation: string and valid aws region
    const names = req.query.names.split(',') // validation: array of strings
    console.log(`names:${JSON.stringify(names)}`);

    const baseConfig = {
        credentials,
        region,
    };
    const ssm = getSSM(baseConfig);
    var params = {
        Names: names,
    };
    const fn = () => ssm.getParameters(params).promise();
    return await handleAwsRequest({fn});
  };

  const extractOutput = async (outputs) => {
    if(outputs && outputs.Parameters.length) {
      const values = outputs.Parameters.map(p => {
        const value = JSON.parse(p.Value);
        return value.image_id;
      });
      return values;
    }
    res.status(400).send(outputs);
    // return outputs;
  };
  return await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getParametersValues;