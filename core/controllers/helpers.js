const constants = require('../utils/constants');

async function handleRequest({ req, res, validationSchema, handle, extractOutput, queryValidationSchema }) {
	if (validationSchema) {
		try {
			validationSchema.validateSync(req.body);
		} catch (error) {
			res.status(constants.statusCodes.ue).send({ message: error.message });
			return;
		}
	}
	if (queryValidationSchema) {
		try {
			queryValidationSchema.validateSync(req.query);
		} catch (error) {
			res.status(constants.statusCodes.ue).send({ message: error.message });
			return;
		}
	}
	try {
		let result = await handle();
		if (result.error) {
			res.status(result.error.statusCode || constants.statusCodes.ise).send({ message: result.error.message });
			return;
		}
		if (!result.success) { // todo: remove this part
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			} else if (result.message == 'Cannot delete the environment') {
				res
					.status(constants.statusCodes.badRequest)
					.send("Cannot delete the environment, it should not be deployed and shouldn't have any dependencies");
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			if (extractOutput) {
				res.status(constants.statusCodes.ok).send(await extractOutput(result.outputs));
			} else {
				res.sendStatus(constants.statusCodes.ok);
			}
		}
	} catch (error) {
		console.error('error:', error);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
}

module.exports = {
	handleRequest
};
