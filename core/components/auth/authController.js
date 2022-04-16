const jwt = require('jsonwebtoken');
const authService = require('../../services/auth');
const constants = require('../../utils/constants');
const config = require('../../utils/config').config;
const tokenService = require('../../utils/auth/tokenService');
const passport = require('../../passport');
const User = require('../../db/models/user');
const Account = require('../../db/models/account');
const yup = require('yup');
const mailService = require('../../services/mail.service');
const timeService = require('../../services/time.service');
const CryptoJS = require('crypto-js');
const { addUserLog } = require('../../db/models/audit/audit.service');
const HttpService = require('../../utils/http/index');
const http = new HttpService();
const HttpConfig = require('../../utils/http/http-config');
const { getInternalToken } = require('../../services/auth');
const { defaultLogger: logger } = require('../../logger')

//----------------------------------------

exports.getServiceAccountToken = getServiceAccountToken;
exports.getAppToken = getAppToken;
exports.registerApp = registerApp;
exports.register = register;
exports.login = login;
exports.verifyEmail = verifyEmail;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.changePassword = changePassword;

//----------------------------------------

async function getServiceAccountToken(req, res, next) {
	const appToken = tokenService.getRawToken(req);
	if (appToken.kind !== 'internal') {
		return res.sendStatus(constants.statusCodes.notFound); // We provide misleading response
	}

	const { serviceAccountName, accountId } = req.body;
	// todo: check if a service account with such name exists in this account, if not respond with bad request
	const body = {
		serviceAccountName,
		accountId
	};
	//Sign the JWT token and populate the payload with the user email and id
	const token = jwt.sign(
		{
			kind: 'service_account', // *** This kind MUST NOT be given to users ***
			requestedBy: appToken.app,
			user: body
		},
		config.jwtSecret,
		{
			expiresIn: '3h'
		}
	);
	//Send back the token to the user
	return res.json({
		token
	});
}

async function getAppToken(req, res, next) {
	const secret = req.headers.secret;
	const appName = req.headers.appname;
	if (!await authService.isValidApp(appName, secret)) {
		return res.sendStatus(constants.statusCodes.notAuthorized);
	}
	const user = req.body.user;
	const body = {
		// TODO: Get rid of this and start using Service Accounts
		_id: user ? user.id : '-1',
		accountId: user ? user.accountId : '-1'
	};
	//Sign the JWT token and populate the payload with the user email and id
	const token = jwt.sign(
		{
			kind: 'internal', // *** This kind MUST NOT be given to users ***
			app: appName,
			user: body // TODO: Get rid of this and start using Service Accounts
		},
		config.jwtSecret,
		{
			expiresIn: '180d'
		}
	);
	//Send back the token to the user
	return res.json({
		token
	});
}

async function registerApp(req, res, next) {
	const secret = req.headers.secret;
	const appName = req.headers.appname;
	if (appName == '' || secret == '') {
		res.sendStatus(constants.statusCodes.badRequest);
		return;
	}
	try {
		const result = await authService.registerApp(appName, secret);
		res.sendStatus(constants.statusCodes.ok);
	} catch (e) {
		console.log('error' + (e.body || e.message));
		res.sendStatus(constants.statusCodes.ise);
	}
}

// Function to register a new user
async function register(req, res, next) {
	try {
		const validationSchema = yup.object().shape({
			username: yup.string().required(),
			organization: yup.string().required(),
			password: yup
				.string()
				.min(3, 'A minimum of 3 characters is required')
				.max(20, 'Password is unnecessarily long')
				.test(
					'test-name',
					'Password needs to contain at least a digit, a capital letter and one of: !@#$%^&*',
					function(value) {
						return new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})').test(value);
					}
				)
				.required(),
			receiveUpdates: yup.bool()
		});
		try {
			validationSchema.validateSync(req.body);
		} catch (err) {
			res.status(constants.statusCodes.ue).send(err.message);
			return;
		}

		const { username, organization, password, receiveUpdates } = req.body;

		const newUser = new User({ username, email: username, role: 'super_admin', organization, receiveUpdates });
		await User.register(newUser, password);
		const account = new Account({
			rootUserId: newUser._id,
			status: constants.accountStatus.pending
		});
		await account.save();
		newUser.accountId = account._id;
		await newUser.save();

    // Set superuser policy for root user
    try {
      const userData = {
        accountId: newUser.accountId,
        username: newUser.username
      }
    	//Sign the JWT token and populate the payload with the user email and id
      const token = await getInternalToken();
      const httpConfig = new HttpConfig().withBearerAuthToken(token);

      const url = `${config.accessManagerUrl}/policy/init/user`
      const res = await http.post(url, userData, httpConfig.config);
      logger.info(`Super user policy added successfully.`)
    } catch (e) {
      logger.error(`Failed to add Super user policy: \n${e}`)
    }

		// Send email to user then activate their account
		try {
			const token = {
				accountId: account._id,
				username: username,
				expiry: timeService.secondsAfterNow(600) // Expire after 10 minutes
			};
			const encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), config.passwordTokenSecret);
			const urlEncode = encodeURIComponent(encrypted);
			const mail = {
				to: [ username ],
				from: config.systemSender,
				subject: 'Please verify your email',
				template: {
					data: {
						baseUrl: config.portalUrl,
						dynamicUrl: `auth/verify?token=${urlEncode}`
					},
					id: 'd-d023af5e6ea843eca0bd91d621dc699d'
				}
			};
			await mailService.sendRawEmail(mail);
			res.sendStatus(constants.statusCodes.ok);
		} catch (e) {
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Function to login a user
async function login(req, res, next) {
	passport.authenticate('local', async (err, user, info) => {
		try {
			console.log(`authenticating`);
			if (err) {
				return next(err);
			}
			if (!user) {
				return res.sendStatus(404);
			}
			req.login(
				user,
				{
					session: false
				},
				async (error) => {
					if (error) return next(error);

					// Create log of the user login and store it in the database
					const ip = req.headers['x-forwarded-for'];
					await addUserLog(user._id, ip);

					//We don't want to store the sensitive information such as the
					//user password in the token so we pick only the email and id
					const body = {
						_id: user._id,
						email: user.email,
						username: user.username,
						accountId: user.accountId
					};
					//Sign the JWT token and populate the payload with the user email and id
					const token = jwt.sign(
						{
							user: body,
							role: user.role // TODO: Get rid of this
						},
						config.jwtSecret,
						{
							expiresIn: '1d'
						}
					);
					const userModel = new User();
					try {
						await userModel.updateUserActivity(user.accountId, user.username);
					} catch (e) {
						console.error(`error:`, e.message);
						return res.sendStatus(constants.statusCodes.ise);
					}
					//Send back the token to the user
					return res.json({
						token
					});
				}
			);
		} catch (error) {
			return next(error);
		}
	})(req, res, next);
}
//----------------------------------------

async function verifyEmail(req, res) {
	const dto = req.body;
	const validationSchema = yup.object().shape({
		token: yup.string().required()
	});
	try {
		validationSchema.validateSync(dto);
	} catch (e) {
		res.status(constants.statusCodes.ue).send(e.message);
		return;
	}
	let raw, tokenData;

	try {
		raw = CryptoJS.AES.decrypt(dto.token, config.passwordTokenSecret);
		tokenData = JSON.parse(raw.toString(CryptoJS.enc.Utf8));
	} catch (e) {
		res.status(constants.statusCodes.ue).send({ message: 'Invalid token' });
		return;
	}

	const now = timeService.now();
	if (timeService.hasPassed(now, tokenData.expiry)) {
		res.status(constants.statusCodes.badRequest).send({
			message: 'Token is expired'
		});
		return;
	}

	const accountId = tokenData.accountId;
	const username = tokenData.username;

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


	const result = await User.verifyEmail(accountId, username);
	if (result.success) {
		res.sendStatus(constants.statusCodes.ok);
	} else {
		if (result.message === 'Not found') {
			res.sendStatus(constants.statusCodes.badRequest);
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
}
//----------------------------------------
async function forgotPassword(req, res) {
	const validationSchema = yup.object().shape({
		email: yup.string().email().required()
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}

	const { email } = req.body;

	// Send email to user then activate their account
	try {
		const token = {
			r: Math.random(),
			email,
			expiry: timeService.secondsAfterNow(60 * 60 * 1) // Expire after 1 hour
		};
		const encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), config.passwordTokenSecret);
		const urlEncode = encodeURIComponent(encrypted);
		const result = await User.setResetPasswordToken(email, urlEncode);
		if (!result.success) {
			res.sendStatus(constants.statusCodes.badRequest);
			return;
		}

		const mail = {
			to: [ email ],
			from: config.systemSender,
			subject: 'Forgot your password?',
			template: {
				data: {
					baseUrl: config.portalUrl,
					dynamicUrl: `auth/reset_password?token=${urlEncode}`
				},
				id: 'd-15e7928462c5426398c5acaf45c02c9c'
			}
		};
		await mailService.sendRawEmail(mail);
		res.sendStatus(constants.statusCodes.ok);
	} catch (e) {
		console.error(`error: ${e.message}`);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
}
//----------------------------------------
async function resetPassword(req, res) {
	const validationSchema = yup.object().shape({
		password: yup
			.string()
			.required()
			.matches(
				/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/,
				'Must contain between 8 to 40 characters, one uppercase, one lowercase, one number and one special case Character'
			),
		token: yup.string().required()
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (e) {
		res.status(constants.statusCodes.ue).send(e.message);
		return;
	}

	const { password, token } = req.body;
	console.log(`token::`, token);
	let raw, tokenData;
	try {
		raw = CryptoJS.AES.decrypt(token, config.passwordTokenSecret);
		tokenData = JSON.parse(raw.toString(CryptoJS.enc.Utf8));
	} catch (e) {
		console.log(`error:`, e.message);
		res.status(constants.statusCodes.ue).send({ message: 'Invalid token' });
		return;
	}

	const now = timeService.now();
	if (timeService.hasPassed(now, tokenData.expiry)) {
		res.status(constants.statusCodes.badRequest).send({
			message: 'Token is expired'
		});
		return;
	}

	const email = tokenData.email;
	console.log(email, token, password);
	const result = await User.resetUserPassword(email, encodeURIComponent(token), password);
	if (result.success) {
		res.sendStatus(constants.statusCodes.ok);
	} else {
		if (result.message === 'Not found') {
			res.status(constants.statusCodes.badRequest).send({ message: 'The token is invalid or already used' });
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
}
//----------------------------------------
async function changePassword(req, res) {
	const validationSchema = yup.object().shape({
		oldPassword: yup
			.string()
			.required()
			.matches(
				/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/,
				'Must contain between 8 to 40 characters, one uppercase, one lowercase, one number and one special case Character'
			),
		newPassword: yup
			.string()
			.required()
			.matches(
				/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/,
				'Must contain between 8 to 40 characters, one uppercase, one lowercase, one number and one special case Character'
			)
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (e) {
		res.status(constants.statusCodes.ue).send(e.message);
		return;
	}
	const { oldPassword, newPassword } = req.body;

	const userId = tokenService.getUserIdFromToken(req);
	const result = await User.changeUserPassword(userId, oldPassword, newPassword);
	if (result.success) {
		res.sendStatus(constants.statusCodes.ok);
	} else {
		if (result.message === 'Not found') {
			res.sendStatus(constants.statusCodes.ue);
		} else if (result.message === 'Password or username is incorrect') {
			res.status(constants.statusCodes.badRequest).send({ message: 'Password or username is incorrect' });
		} else {
			res.sendStatus(constants.statusCodes.ise);
		}
	}
}
