const passport          = require('passport');
const User              = require('../db/models/user');
const passportJwt       = require('passport-jwt');
const ServiceIdentity   = require('../db/models/serviceIdentity');
const { config } = require('../utils/config');
const ExtractJwt        = passportJwt.ExtractJwt;
const JwtStrategy       = passportJwt.Strategy;

// Passport configs
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Register strategies
passport.use(User.createStrategy());
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwtSecret
}, async (jwtPayload, done) => {
    try {
        if (jwtPayload.app) {
            const si = await ServiceIdentity.findOne({name: jwtPayload.app});
            return done(null, {...si._doc, internal : true});
        }
        const user = await User.findOne({_id: jwtPayload.user._id, isActivated: true}).exec();
        if (!user) {
            return done(null, false);
        }
        return done(null, user);
    }
    catch (err) {
        return done(err, false);
    }
}));

module.exports = passport;
