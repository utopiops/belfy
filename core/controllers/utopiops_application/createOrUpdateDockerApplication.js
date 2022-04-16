const { handleRequest } = require('../helpers');
const dockerService = require('../../db/models/utopiops_application/docker.service');
const DomainModel = require('../../db/models/domain/domain');
const yup = require('yup');
const constants = require('../../utils/constants');
const config = require('../../utils/config').config;
const dockerizedApplicationSizes = require('../../utils/dockerizedApplicationSizes');

async function createOrUpdateDockerApplication(req, res) {
  let doc;
  if(req.body.domainId) {
    const filter = { _id: req.body.domainId, accountId: res.locals.accountId };
    doc = await DomainModel.findOne(filter);
  }


  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string().lowercase().strict()
    .test('has-right-length', 'Total length of application name and domain name should be less than 62', (value) => {
      if(req.body.domainName) {
        return value.length + req.body.domainName.length <= 62;
      }
      else if(req.body.domainId) {        
        if(!doc) return false;
        return value.length + doc.domainName.length <= 62;
      }
      return value.length + `${config.dockerSubdomain.slice(1)}.utopiops.com`.length <= 62;
    })
    .required(),
    description: yup.string(),
    port: yup.number().required(),
    repositoryUrl: yup.string().url().required(),
    size: yup.string().oneOf(Object.keys(dockerizedApplicationSizes)),
    volumePath: yup.string().when('storageCapacity', {
      is: (storageCapacity) => storageCapacity > 0,
      then: yup.string().required()
    }),
    storageCapacity: yup.number().positive().integer(),
    branch: yup.string().required(),
    healthCheckPath: yup.string(),
    environmentVariables: yup.array().of(
      yup.object().shape({
        name: yup.string().required(),
        value: yup.string().required(),
      }),
    )
  });

	const handle = async () => {
    const accountId = res.locals.accountId;

    // We handle multiple endpoints with this controller, so here we try to find out which path it is
    const isUpdate = req.method === 'PUT' ? true : false;

    let app = {
      ...req.body,
      accountId,
      kind: constants.applicationKinds.docker,
    };

    if(isUpdate) {
      delete app.repositoryUrl;
      if(!app.domainId) {
        delete app.cpu;
        delete app.memory;
      }
    }


    return isUpdate ?
      await dockerService.updateDockerApplication(app, res.locals.headers) :
      await dockerService.createDockerApplication(app, res.locals.headers);
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createOrUpdateDockerApplication;
