const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');
const yup = require('yup');

async function createOrUpdateEKS(req, res) {
	const validationSchema = yup.object().shape({
		eks_cluster_name: yup
			.string()
			.required(),
    eks_version: yup
      .string(),
    eks_endpoint_private_access: yup
      .boolean(),
    eks_public_access: yup
      .boolean(),
    eks_enabled_cluster_log_types: yup
      .array().of(yup.string()),
    eks_logs_retention_in_days: yup
      .number(),
    worker_launch_template: yup
      .object().shape({
        root_volume_size: yup
          .string(),
        image_id: yup
          .string()
      })
      .nullable(),
    instance_groups: yup
      .array().of(yup.object().shape({
        name: yup
          .string()
          .required(),
        capacity_type: yup
          .string()
          .required(),
        instance_types: yup
          .array().of(yup.string())
          .required(),
        disk_size: yup
          .number()
          .required(),
        desired_size: yup
          .number()
          .required(),
        max_size: yup
          .number()
          .required(),
        min_size: yup
          .number()
          .required(),
        tags: yup
          .object()
          .required(),
      }))
      .required(),
    fargate_profiles: yup
      .array().of(yup.object().shape({
        name: yup
          .string()
          .required(),
        namespace: yup
          .string()
          .required(),
        labels: yup
          .object()
          .required()
      })),
    eks_worker_assume_role_arns: yup
      .array().of(yup.string()),
    tags: yup
      .object()
	});

	const handle = async () => {
		const { userId, environmentId } = res.locals;

    
		// We handle multiple endpoints with this controller, so here we try to find out which path it is
		const isFirstVersion = req.params.version == null;
		const isUpdate = req.method === 'PUT' ? true : false;
		let version = 0;
		if (!isFirstVersion) {
			version = req.params.version;
		}
    delete req.body._id;
    delete req.body.isActivated

		let eks = {
			...req.body,
			createdBy: userId,
		};
		console.log(`eks`, JSON.stringify(eks, null, 2));

		if (isUpdate) {
			eks.version = version;
		} else if (!isFirstVersion) {
			eks.fromVersion = version;
		}

		return isFirstVersion
			? await KubernetesClusterService.createEKS(environmentId, eks)
			: isUpdate
				? await KubernetesClusterService.updateEKS(environmentId, eks)
				: await KubernetesClusterService.addEKS(environmentId, eks);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateEKS;
