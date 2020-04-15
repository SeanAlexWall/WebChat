const functions = require('firebase-functions');
const express = require('express');
const app = express();
const path = require('path');

exports.httpreq = functions.https.onRequest(app);

app.use(express.urlencoded({ extended: false }))

app.use('/public', express.static(path.join(__dirname, '/static')));

//set template engine
app.set('view engine', 'ejs');
app.set('views', './ejsviews');


//frontend +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

function frontendHandler(request, response) {
    response.sendFile(path.join(__dirname, '/WebChat/WebChat.html'));
}

//Front end pages******************



// *********************************



//Backend +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

const firebase = require('firebase');

// const session = require('express-session');
// app.use(session({
//     secret: 'string.lajhfdlskj',
//     saveUninitialized: false,
//     resave: false,
//     secure: true, //https
//     maxAge: 1000 * 60 * 60 * 24 * 7, //1 week
//     rolling: true
// }))

// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyABIJ9aQXQG5QcBlpGqjKsOpARjADHlXzo",
    authDomain: "seanw-wsp20.firebaseapp.com",
    databaseURL: "https://seanw-wsp20.firebaseio.com",
    projectId: "seanw-wsp20",
    storageBucket: "seanw-wsp20.appspot.com",
    messagingSenderId: "551396521699",
    appId: "1:551396521699:web:a23fa68b15753033f437d6"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);


// const Constants = require('./myconstants.js');
// const adminUtil = require('./adminUtil.js')

//Back end pages******************

app.get('/', (req, res)=>{
    res.send(`
        <H1> WORKING BACK END </H1>
    `)
})

// *********************************