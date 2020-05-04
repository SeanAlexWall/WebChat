const Constants = require("./myconstants.js")
var admin = require("firebase-admin");

var serviceAccount = require("./seanw-wsp20-firebase-adminsdk-4e48q-083c59bcc0.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://seanw-wsp20.firebaseio.com"
});

async function createUser(req, res){

    const email = req.body.email;
    const password = req.body.password;

    try{
        await admin.auth().createUser({email, password})
        const user = await admin.auth().getUserByEmail(email);
        const uid = user.uid;
        res.render('setUpProfile', {uid, email, error: false})
    }catch(e){
        res.render('signup.ejs', {user: false, error: e});
    }

}
async function listUsers(req, res){
    try{
        const userRecord = await admin.auth().listUsers()
        res.render('admin/listusers.ejs', {users: userRecord.users, error: false, cartCount: 0})
    }catch(e){
        res.render('admin/listusers.ejs', {users: null, error: e, cartCount: 0})

    }
}
async function verifyIdToken(idToken){
    try{
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        return decodedIdToken;
    }catch(e){
        return  null
    }
}

module.exports = {
    createUser,
    listUsers,
    verifyIdToken
}