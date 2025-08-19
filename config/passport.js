const bcrypt = require('bcrypt');
const jwtSecret = require('./jwtConfig');

const BCRYPT_SALT_ROUNDS = 12;

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JWTstrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const User = require('../sequelize');

passport.use(
    'registerss',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
        session: false,
      },
      (req, username, password, done) => {
        
        const { name, surname, email, user_type, status, company, mobile } = req.body;
        try {
          User.findOne({
            where: {
              
                email,
              
            },
          }).then(user => {
            if (user != null) {
              console.log('username or email already taken');
              return done(null, false, {
                message: 'username or email already taken',
              });
            }
            bcrypt.hash(password, BCRYPT_SALT_ROUNDS).then(hashedPassword => {
                
              try{
                
              User.create({
                name,
                surname,                
                password : hashedPassword,
                email,
                status,
                company,
                mobile,
                createdAt: new Date(),
                updatedAt: new Date(),
                user_type
                
              }).then(user => {
                console.log('user created!');
                return done(null, user);
              });
            }catch(err)
            {
                console.log(err);
                return;
            } 
            });
          });
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.use(
    'login',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        session: false,
      },
      (email, password, done) => {
        try {
          User.findOne({
            where: {
              email,
            },
          }).then(user => {
            if (user === null) {
              return done(null, false, { message: 'Account with that email address not found.' });
            }
            bcrypt.compare(password, user.password).then(response => {
              if (response !== true) {
                console.log('passwords do not match');
                return done(null, false, { message: 'passwords do not match' });
              }
              console.log('user found & authenticated');
              return done(null, user);
            });
          });
        } catch (err) {
            console.log(err);
          done(err);
        }
      },
    ),
  );

  const opts = {
    jwtFromRequest: ExtractJWT.fromAuthHeaderWithScheme('JWT'),
    secretOrKey: jwtSecret.secret,
  };

  passport.use(
    'jwt',
    new JWTstrategy(opts, (jwt_payload, done) => {
      try {
        User.findOne({
          where: {
            id: jwt_payload.id,
          },
        }).then(user => {
          if (user) {
            console.log('user found in db in passport');
            done(null, user);
          } else {
            console.log('user not found in db');
            done(null, false);
          }
        });
      } catch (err) {
        done(err);
      }
    }),
  );