const { handleRequest } = require('../helpers');
const classicBakedApplicationService = require('../../db/models/application/classicBakedApplication.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateClassicBakedApplication(req, res) {

  // Schema validation
  const validationSchema = yup.object().shape({
    app_name: yup.string()
      .required()
      .lowercase()
      .strict(),
    description: yup.string(),
    instance_iam_role: yup.string(),
    image_id: yup.string()
      .required(),
    base64encoded_user_data: yup.string().nullable(true),
    alb_exposed_ports: yup.object().shape({
      alb_display_name: yup.string()
        .required(),
      ports: yup.array().of(yup.object().shape({
        load_balancer_port: yup.string().required(),
        host_port: yup.string().required(),
        dns_prefix: yup.string().required(),
        healthy_threshold: yup.string().required(),
        unhealthy_threshold: yup.string().required(),
        interval: yup.string().required(),
        matcher: yup.string().required(),
        path: yup.string().required(),
        timeout: yup.string().required(),
      }))
    }).required(),
    nlb_exposed_ports: yup.object().shape({
      nlb_display_name: yup.string()
        .required(),
      ports: yup.array().of(yup.object().shape({
        port_number: yup.string().required(),
        protocol: yup.string().required().oneOf([ 'TLS', 'TCP', 'UDP', 'TCP_UDP' ]),
        certificate_arn: yup.string().when('protocol', {
          is: (v) => v === 'TLS',
          then: yup.string().required()
        }),
        dns_prefix: yup.string().required(),
        healthy_threshold: yup.string().required(),
        unhealthy_threshold: yup.string().required(),
        interval: yup.string().required().oneOf([ '10', '30' ])
      }))
    }).required(),
    instanceGroups: yup.array().of(
      yup.object().shape({
        display_name: yup.string()
          .max(50, "Maximum length is 50"),
        instances: yup.array().of(yup.object().shape({
          instance_type: yup.string(),
          weighted_capacity: yup.number()
        })).unique("duplicate instance type", (i) => (i.instanceType)),
        count: yup.number()
          .required(),
        min_size: yup.number(),
        max_size: yup.number()
          .required(),
        root_volume_size: yup.number()
          .required(),
        key_pair_name: yup.string(),
        labels: yup.array().of(yup.string()),
        is_spot: yup.boolean()
      })
    )
  });

	const handle = async () => {
    const { userId, environmentId } = res.locals;
    const providerName = res.locals.provider.backend.name;

    // We handle multiple endpoints with this controller, so here we try to find out which path it is
    const isFirstVersion = req.originalUrl.endsWith('application/classic-baked') ? true : false;
    const isUpdate = req.method === 'PUT' ? true : false;
    let version = 0;
    if (!isFirstVersion) {
      version = req.params.version;
    }

    console.log(`req.body`, req.body);

    if (providerName !== constants.applicationProviders.aws) {
      return {
        success: false,
        error: {
          message: 'Invalid provider name',
          statusCode: constants.statusCodes.badRequest
        }
      }
    }
  
    // todo: check if the lb.id is valid and the ports are exposed in the lb
    let appVersion = {
      ...req.body,
      kind: constants.applicationKinds.classicBaked,
      createdBy: userId
    };

    const isDynamicApplication = appVersion.isDynamicApplication

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }

    // User can't activate the application through this endpoint
    delete appVersion.isActivated;

    // By default we add a variable to the application to be able to deploy different AMIs
    // appVersion.variables = [{
    //   name: 'ami',
    //   value: appVersion.defaultAmiId
    // }];

    console.log(`isFirstVersion `, isFirstVersion);
    console.log(`isUpdate `, isUpdate);

    return isFirstVersion ?
      await classicBakedApplicationService.createClassicBakedApplication(environmentId, appVersion.app_name, appVersion.description, isDynamicApplication, appVersion) :
      isUpdate ?
        await classicBakedApplicationService.updateClassicBakedApplication(environmentId, appVersion.app_name, appVersion.description, appVersion) :
        await classicBakedApplicationService.addClassicBakedApplicationVersion(environmentId, appVersion.app_name, appVersion.description, appVersion, version);
    
	};
  
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateClassicBakedApplication;
