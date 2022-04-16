const config = require('../../utils/config').config;
const constants = require('../../utils/constants');
const CryptoJS = require('crypto-js');
const Group = require('../../db/models/group');
const mailService = require('../../services/mail.service');
const timeService = require('../../services/time.service');
const tokenService = require('../../utils/auth/tokenService');
const HttpService = require('../../utils/http/index');
const http = new HttpService();
const HttpConfig = require('../../utils/http/http-config');
const { getInternalToken } = require('../../services/auth');
const User = require('../../db/models/user');
const yup = require('yup');

exports.getUsersList = async (req, res) => {
	const accountId = res.locals.accountId;
	const result = await User.getUsersList(accountId);
	// TODO: Check the role of the user (roles). Only allow self retrieve or if user has permission
	if (result.success) {
		res.send(result.output.users);
	} else {
		res.sendStatus(constants.statusCodes.ise);
	}
};

exports.getUser = async (req, res, next) => {
	const accountId = res.locals.accountId;
	const username = req.params.username;

	const user = new User();
	const result = await user.getUser(accountId, username);
	// TODO: Check the role of the user (roles). Only allow self retrieve or if user has permission

	if (result.success) {
		res.send(result.output.user);
	} else {
		if (result.message === 'Not found') {
			res.sendStatus(constants.statusCodes.badRequest);
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};

exports.getUserGroups = async (req, res, next) => {
	const accountId = res.locals.accountId;
	const username = req.params.username;
	const user = new User();
	const result = await user.getUserGroups(accountId, username);
	// TODO: Check the role of the user (roles). Only allow self retrieve or if user has permission

	if (result.success) {
		res.send(result.output.groups);
	} else {
		if (result.message === 'Not found') {
			res.sendStatus(constants.statusCodes.badRequest);
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};
exports.addUser = async (req, res) => {
	const accountId = res.locals.accountId;
	const dto = req.body;
	const validationSchema = yup.object().shape({
		username: yup.string().email().required(), // At the moment the username MUST be an email
		fullName: yup.string(),
		jobTitle: yup.string(),
		department: yup.string(),
		basedIn: yup.string(),
		groups: yup.array(yup.string()),
		onboardingFlow: yup.string(),
		offboardingFlow: yup.string()
	});
	try {
		validationSchema.validateSync(dto);
	} catch (e) {
		res.status(constants.statusCodes.ue).send(e.message);
		return;
	}

	const userDetails = {
		accountId,
		email: dto.username,
		...dto
	};
	const result = await User.addUser(userDetails);

	if (result.success) {
		// Send email to the user to set their password
		try {
			const token = {
				accountId: accountId,
				username: dto.username,
				expiry: timeService.secondsAfterNow(86400) // Expire after 1 day
			};

			const encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), config.passwordTokenSecret);
			const urlEncode = encodeURIComponent(encrypted);
			const mail = {
				to: [ dto.username ],
				from: config.systemSender,
				subject: 'Please set your password',
				template: {
					data: {
						fullName: userDetails.fullName,
						baseUrl: config.portalUrl,
						dynamicUrl: `auth/set_password?token=${urlEncode}`
					},
					id: 'd-7245908c0fa048c29b2400db2447eca7'
				}
			};
			await mailService.sendRawEmail(mail);
		} catch (e) {
			console.error(`error: ${e.message}`);
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
		res.sendStatus(constants.statusCodes.ok);
	} else {
		if (result.message.indexOf('duplicate') !== -1) {
			res.status(constants.statusCodes.badRequest).send({ message: 'User already exists' });
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};

exports.deleteUser = async (req, res) => {
	// TODO: Implement this with transactions
	const accountId = res.locals.accountId;
	const userId = res.locals.userId; // To avoid self deletion
	const username = req.params.username;

	const user = new User();
	const result = await user.deleteUser(accountId, username, userId);
	// TODO: Check the role of the user (roles)
	// TODO: invalidate the access token (token service: black list)
	if (result.success) {
		res.sendStatus(constants.statusCodes.ok);
	} else {
		if (result.message === 'Not found') {
			res.status(constants.statusCodes.badRequest).send({ message: 'User not founds' });
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};
exports.updateUser = async (req, res, next) => {
	const dto = req.body;
	const validationSchema = yup.object().shape({
		email: yup.string().email().required(),
		fullName: yup.string(),
		jobTitle: yup.string(),
		department: yup.string(),
		basedIn: yup.string(),
		groups: yup.array(yup.string())
	});
	try {
		delete dto.username; // Cannot change the username, just in case it was provided in an api call delete it
		validationSchema.validateSync(dto);
	} catch (e) {
		res.status(constants.statusCodes.ue).send(e.message);
		return;
	}

	const accountId = res.locals.accountId;
	const username = req.params.username;

	const user = new User();
	const result = await user.updateUser(accountId, username, dto);
	// todo: set the user is activated
	// TODO: Check the role of the user (roles). Only allow self-update or if user has permission

	if (result.success) {
		res.sendStatus(constants.statusCodes.ok);
	} else {
		if (result.message === 'Not found') {
			res.sendStatus(constants.statusCodes.badRequest);
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};

exports.setPassword = async (req, res, next) => {
	const dto = req.body;
	const validationSchema = yup.object().shape({
		password: yup
			.string()
			.required()
			.matches(
				/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/,
				'Must contain between 8 to 40 characters, one uppercase, one lowercase, one number and one special case Character'
			),
		token: yup.string().required('Invalid request') //obfuscate the message
	});
	try {
		validationSchema.validateSync(dto);
	} catch (e) {
		res.status(constants.statusCodes.ue).send(e.message);
		return;
	}

	

	const raw = CryptoJS.AES.decrypt(dto.token, config.passwordTokenSecret);
	const tokenData = JSON.parse(raw.toString(CryptoJS.enc.Utf8));

	const now = timeService.now();
	if (timeService.hasPassed(now, tokenData.expiry)) {
		res.sendStatus(constants.statusCodes.badRequest);
		return;
	}

	const accountId = tokenData.accountId;
	const username = tokenData.username;

	const activationResult = await User.activate(accountId, username);
	if (activationResult.success) {
		// Add default channels to the user
		try {
			const body = {
				channel_name: username.split('@')[0],
				is_for_user: true,
				user_name: username
			};
			const token = await getInternalToken();
			const url = `${config.notificationManagerUrl}/channel/account_id/${accountId}`;

			const httpConfig = new HttpConfig().withBearerAuthToken(token);
			await http.post(url, body, httpConfig.config);
		} catch (e) {
			console.error(`error:`, e.message);
			return res.sendStatus(constants.statusCodes.ise);
		}
		const result = await new User().setUserPassword(accountId, username, dto.password);
		
		if (result.success) {
			res.sendStatus(constants.statusCodes.ok);
		} else {
			if (result.message === 'Not found') {
				res.status(constants.statusCodes.badRequest).send({ message: 'Failed to set the password' });
			} else {
				res.sendStatus(constants.statusCodes.ise);
			}
		}
	} else {
		if (activationResult.message === 'Not found') {
			res
				.status(constants.statusCodes.badRequest)
				.send({ message: 'Invalid token and/or the user is already activated' });
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};
