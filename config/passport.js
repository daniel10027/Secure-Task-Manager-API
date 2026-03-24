// ─── config/passport.js ───────────────────────────────────────────────────────
// Configures Passport.js with the Google OAuth 2.0 strategy.
// When a user logs in with Google, this strategy:
//   1. Receives the Google profile from the OAuth callback
//   2. Checks if a user with that googleId already exists
//   3. If yes → returns the existing user
//   4. If no  → creates a new user with the Google profile data

const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user with this Google ID already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Existing user — return them
          return done(null, user);
        }

        // New user — check if their email is already registered
        user = await User.findOne({
          email: profile.emails[0].value,
        });

        if (user) {
          // Email exists but no googleId — link the Google account
          user.googleId = profile.id;
          user.avatar   = profile.photos?.[0]?.value || user.avatar;
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        // Brand new user — create account from Google profile
        user = await User.create({
          name:     profile.displayName,
          email:    profile.emails[0].value,
          googleId: profile.id,
          avatar:   profile.photos?.[0]?.value || '',
          // No password — this is an OAuth user
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize / deserialize are required by Passport but we use JWT, not sessions
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
