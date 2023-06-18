
require('dotenv').config();
const express = require('express');
const bodyParser=require('body-parser');
const ejs=require('ejs');
const mongoose=require('mongoose');
const encrypt=require('mongoose-encryption');
//Salting and Hashing
const bcrypt = require('bcrypt');
const saltRounds = 10;
//Hash function(Hashing)
const md5=require('md5');
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

const server = process.env.SERVER;
mongoose.connect(server);

const userSchema=new mongoose.Schema({
    username: String,
    password: String,
    secrets:String,
    googleId:String,
    facebookId:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// var encKey = process.env.SOME_32BYTE_BASE64_STRING;
// var sigKey = process.env.SOME_64BYTE_BASE64_STRING;

//cipher encryption
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields:['password']});

const User=new mongoose.model('User',userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets'
  },
  async function (accessToken, refreshToken, profile, done) {
    try {
      // console.log(profile);
      // Find or create user in your database
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        // Create new user in database
        const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
        const newUser = new User({
          username: profile.displayName,
          googleId: profile.id
        });
        user = await newUser.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  async function (accessToken, refreshToken, profile, done) {
    try {
      // console.log(profile);
      // Find or create user in your database
      let user = await User.findOne({ facebookId: profile.id });
      if (!user) {
        // Create new user in database
        const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
        const newUser = new User({
          username: profile.displayName,
          facebookId: profile.id
        });
        user = await newUser.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

app.get('/',function(req,res){
    res.render('home');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }
  ));

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log("authenticated");
    res.redirect('/secrets');
  });

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get('/login',function(req,res){
    res.render('login');
});

app.get('/register',function(req,res){
    res.render('register');
});

app.get('/secrets',function(req,res){
    User.find({secrets: {$ne : null}}).then(foundSecrets =>{
        // console.log(foundSecrets);
        res.render('secrets',{foundSecrets:foundSecrets});
    });
});

app.get('/logout',function(req,res){
    req.logout(function(err){
        if(err)
        {
            console.log(err);
        }
        else
        {
            res.redirect('/');
        }
    });
});


app.get('/submit',function(req,res){
   if(req.isAuthenticated())
   {
        res.render('submit');
   } 
   else
   {
        res.redirect('/login');
   }
});

app.post('/login',function(req,res){
    const user= new User({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user,function(err){
        if(err)
        {
            console.log(err);
            res.redirect('/login');
        }
        else
        {
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets');
            });
        }
    })
});

app.post('/register',function(req,res){
    User.register({username:req.body.username,active:false},req.body.password,function(err,user){
        if(err)
        {
            console.log(err);
            res.redirect('/register');
        }
        else
        {
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets');
            })
        }
    })
});

app.post('/submit',function(req,res){

    User.findOne({_id:req.user._id}).then(foundUser =>{
        // console.log(req.body.secret);
        foundUser.secrets=req.body.secret;
        foundUser.save();
        res.redirect('/secrets');
    });
});


app.listen(3000,function(req,res){
    console.log("app listening at port 3000");
});






//SALTING AND HASHING

// app.post('/register',function(req,res){

//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         const userDetails= new User({
//             email:req.body.username,
//             password:hash
//         });
//         userDetails.save();
//         res.render('secrets'); 
//     });

// });

// app.post('/login',function(req,res){
//     // const userName=req.body.username;
//     // const password=req.body.password;

    

//    User.findOne({email:req.body.username}).then((foundUser)=>{
//         bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
//             // result == true
//             if(result==true)
//             {
//                 res.render('secrets');
//             }
//         }); 
//     });
// });