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
app.get('/', frontendHandler);
app.get('/home', frontendHandler);
app.get('/about', frontendHandler);
app.get('/login', frontendHandler);
app.get('/download', frontendHandler);
// *********************************


//Backend +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

const firebase = require('firebase');

const session = require('express-session');
app.use(session({
    secret: 'string.lajhfdlskj',
    saveUninitialized: false,
    resave: false,
    secure: true, //https
    maxAge: 1000 * 60 * 60 * 24 * 7, //1 week
    rolling: true
}))

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


const Constants = require('./myconstants.js');
const adminUtil = require('./adminUtil.js')

//Back end pages******************
app.get('/web/', authAndRedirectSignIn, getScreenName, (req, res) => {
    console.log('FFFFFFFFFFFFFFFFFFFFF', req.path);
    if(!req.displayName){
        res.render('setUpProfile', {uid: req.decodedIdToken.user_id, email: req.decodedIdToken.email, error: false})
    }else{
        res.render('home.ejs', { user: req.decodedIdToken, displayName: req.displayName })
    }
});
app.get('/web/signIn', auth, (req, res) => {
    res.render('signIn.ejs', { error: false, user: req.user });
})
app.post('/web/signIn', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const auth = firebase.auth();
    try {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
        const userRecord = await auth.signInWithEmailAndPassword(email, password);
        const idToken = await userRecord.user.getIdToken();
        await auth.signOut();


        req.session.idToken = idToken;
        console.log('=============', 'idtoken:', req.session.idToken);

        if (userRecord.user.email === Constants.SYSADMIN_EMAIL) {
            res.redirect('/admin/sysadmin')
        }
        else {
            res.redirect('/web/');
        }
    } catch (e) {
        console.log("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
        res.render('signIn.ejs', { error: JSON.stringify(e), user: null })
    }
})

app.get('/web/signOut', async (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log('++++++++++++++++++++++ SESSION.DESTROY ERROR: ', err);
            req.session = null;
            res.send('Error: sign out session.destroy error')
        }
        else {
            res.redirect('/')
        }
    })
})

app.get('/web/signup', (req, res) => {
    res.render('signup.ejs', { user: null, error: false })
})

app.post("/web/setProfile", auth, async (req, res) => {
    try{
        const uid = req.body.uid;
        const displayName = req.body.displayName;
        const bio = req.body.bio;
        console.log('in setProfile')
        await firebase.firestore().collection(Constants.COLL_PROFILES).doc().set({ uid, displayName, bio })
        if(req.decodedIdToken){
            res.redirect('/web/');
        }else{
            res.render('signIn.ejs', {user: false, error: 'Account created! Sign in please!'});
        }
    }catch(e){
        console.log('Setprofile: ', e);
    }
})

app.get('/web/profile', authAndRedirectSignIn, async (req, res) => {
    if (!req.decodedIdToken)
        res.redirect('/web/signIn');
    else {
        const uid = req.decodedIdToken.user_id;
        try{
            snapshot = await firebase.firestore().collection(Constants.COLL_PROFILES).where("uid", "==", uid).get();
            let user;
            snapshot.forEach((doc)=>{
                user = doc.data();
            })
            console.log(user);
            res.render('profile.ejs', { user })
        }catch(e){
            console.log('ERROR - WEB/PROFILE: ', e);
        }
       
    }
})

// /WEB/ROOMS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
app.get('/web/rooms/all', authAndRedirectSignIn, async (req, res) => {
    const coll = firebase.firestore().collection(Constants.COLL_ROOMS);
    try {
        let rooms = [];
        const snapshot = await coll.orderBy("name").get();
        snapshot.forEach(doc => {
            rooms.push({ id: doc.id, data: doc.data() });
        });
        res.render("chooseChatRoom.ejs", { user: req.decodedIdToken, error: false, rooms })
    }
    catch (e) {
        res.render("chooseChatRoom.ejs", { user: null, error: e })
    }
})

app.get('/web/rooms/chat', authAndRedirectSignIn, checkIfJoined, async (req, res) => {
    let isJoined = true;
    let roomId = req.query.roomId;
    const coll = firebase.firestore().collection(Constants.COLL_ROOMS).doc(roomId).collection(Constants.COLL_MESSAGES);
    isJoined = req.isJoined;
    try {
        let messages = [];
        const snapshot = await coll.orderBy("time").get();
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, data: doc.data() });
        });
        res.render("chatroom.ejs", { error: false, messages, user: req.decodedIdToken, roomId, isJoined })
    } catch (e) {
        res.render("chatroom.ejs", { error: e, user: req.decodedIdToken, roomId, isJoined: true });
    }

})

app.post('/web/rooms/chat', authAndRedirectSignIn, async (req, res) => {
    let roomId = req.body.roomId;
    try {
        const email = req.decodedIdToken.email;
        const content = req.body.content;
        const date = new Date();
        await firebase.firestore().collection(Constants.COLL_ROOMS).doc(roomId).collection(Constants.COLL_MESSAGES).doc().set({ email, content, time: date })
    }
    catch (e) {
        res.send("Error: chatroom: " + e)
    }
    const coll = firebase.firestore().collection(Constants.COLL_ROOMS).doc(roomId).collection(Constants.COLL_MESSAGES);
    try {
        let messages = [];
        const snapshot = await coll.orderBy("time").get();
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, data: doc.data() });
        });
        res.render("chatroom.ejs", { error: false, messages, user: req.decodedIdToken, roomId, isJoined: true })
    } catch (e) {
        res.render("chatroom.ejs", { error: e, user: req.decodedIdToken, roomId, isJoined: true });
    }
})

app.get('/web/rooms/join', auth, async (req, res) => {
    try {
        const roomId = req.query.roomId;
        const user_id = req.decodedIdToken.user_id;
        await firebase.firestore().collection(Constants.COLL_ROOMS).doc(roomId).collection(Constants.COLL_USERS).doc().set({ user_id })
        res.redirect(`/web/rooms/chat?roomId=${roomId}`)
    }
    catch (e) {
        console.log('JOIN ERROR: ', e)
    }
});

// *********************************

//Middleware ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
async function authAndRedirectSignIn(req, res, next) {
    try {
        const decodedIdToken = await adminUtil.verifyIdToken(req.session.idToken);
        if (decodedIdToken.uid) {
            req.decodedIdToken = decodedIdToken;
            console.log('************************* ', decodedIdToken);
            return next()
        }
    }
    catch (e) {
        console.log('====== authandredirect error:', e)
    }
    console.log('============================= no session.idToken')
    return res.redirect('/web/signin')
}
async function auth(req, res, next) {
    try {
        if (req.session.idToken) {
            const decodedIdToken = await adminUtil.verifyIdToken(req.session.idToken);
            req.decodedIdToken = decodedIdToken;
            console.log('************************* ', decodedIdToken);
        }
        else {
            console.log('============================= no session.idToken')
            req.decodedIdToken = null
        }
    }
    catch (e) {
        req.decodedIdToken = null
    }
    next();
}

//only used on the GET /web/rooms/chat
async function checkIfJoined(req, res, next) {
    try{
        const roomId = req.query.roomId;
        let isJoined = false;
        const userId = req.decodedIdToken.user_id;
        const coll = firebase.firestore().collection(Constants.COLL_ROOMS).doc(roomId).collection(Constants.COLL_USERS);
        let userList = [];
        const snapshot = await coll.orderBy("user_id").get();
        snapshot.forEach(doc => {
            userList.push({ id: doc.id, data: doc.data() });
        });
        for(let userNum of userList){
            console.log("=============================", userNum);
            if(userId === userNum.data.user_id){
                isJoined = true;
            }
        }
        req.isJoined = isJoined;
        return next();
    }catch(e){
        console.log(e);
        res.send(e);
    }
}

async function getScreenName(req, res, next){
    const uid = req.decodedIdToken.user_id;
    try{
        snapshot = await firebase.firestore().collection(Constants.COLL_PROFILES).where("uid", "==", uid).get();
        let user;
        snapshot.forEach((doc)=>{
            user = doc.data();
        })
        console.log('SSSSSSSSSSSSSSSSSSSSS',user);
        if(user){
            req.displayName = user.displayName;
        }
        return next();
    }catch(e){
        console.log('ERROR - getscreenname: ', e);
    }
}

//Admin api
app.post('/admin/signup', (req, res) => {
    return adminUtil.createUser(req, res);
})

app.get('/admin/sysadmin', authSysAdmin, (req, res) => {
    res.render('admin/sysadmin.ejs');
})


app.get('/admin/listusers', authSysAdmin, (req, res) => {
    return adminUtil.listUsers(req, res);
})



function authSysAdmin(req, res, next) {
    const user = firebase.auth().currentUser;
    if (!user || !user.email || user.email !== Constants.SYSADMIN_EMAIL) {
        return res.send(`<h1> System Admin Page: Access Denied </h1>`);
    }
    else {
        return next();
    }
}