const express=require('express')
const business = require("./business")
const bodyParser = require('body-parser')
const handlebars = require('express-handlebars')
const cookieParser = require('cookie-parser')
const fileUpload = require("express-fileupload");
const { blockUser } = require('./persistance')

app = express()
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())
app.use(express.static('public'))
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use(urlencodedParser)
app.use(cookieParser())
app.use(fileUpload());
app.use(express.static(__dirname + '/public'));

/**
 * Validates an email address.
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if valid, otherwise false.
 */
function validateEmail(email){
    if(email.length < 10){
        return false
    }
    let symbolIndex = email.indexOf('@')
    if(symbolIndex === -1){
        return false
    }
    let domainPart = email.slice(symbolIndex+1)
    if(domainPart !== "gmail.com"){
        return false
    }
    return true

}


/**
 * Validates a password.
 * @param {string} password - The password to validate.
 * @returns {boolean} True if valid, otherwise false.
 */
function validatePassword(password){
    if(password.length<8){
        return false
    }
    return true
}


/**
 * Renders the login page with an optional message.
 * @name GET /
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get('/', async (req,res)=>{
    let message = req.query.message
    res.render('login',{message:message,layout:undefined})
    }    
    
)


/**
 * Handles login form submission, validates credentials, and sets a session if successful.
 * @name POST /
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post('/', async (req, res) => {
    let username = req.body.uname
    let password = req.body.pw
    let userDetail = await business.getUserDetails(username)
    let session = await business.attemptLogin(username, password)
    if(!userDetail){
        res.redirect("/?message=Invalid Credentials")
        return
    }
    if(userDetail.verified!=='Yes'){
        res.redirect('/?message=Please Verify Your Email')
        return
    }
    if (session) {
        
        res.cookie('session', session.key, {expires: session.expiry})

        res.redirect(`/index`);
    }
    else {
        res.redirect('/?message=Invalid Credentials')
    }
})


/**
 * Renders the index page based on user session type (Admin or User).
 * @name GET /index
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get('/index', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }

    let username = session.data.username;
    let userDetails = await business.getUserDetails(username);
    let contacts = userDetails.contacts || [];
    if (session.data.type === "Admin") {
        res.render('index_admin');
    } else {
        res.render('index_user', {
            username,
            contacts
        });
    }
});


/**
 * Renders a list of all users.
 * @name GET /users
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get('/users', async (req,res)=>{
    let users = await business.getAllUsers()
    res.render('users',{
        data: users
    })
})


/**
 * Renders the registration page with an optional message.
 * @name GET /register
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get('/register',(req,res)=>{
    let message = req.query.message
    res.render('register',{
        message:message,
        layout:undefined
    })
})


/**
 * Handles new account creation with validation and redirects to login on success.
 * @name POST /new-account
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post('/new-account',async (req,res)=>{
    let username = req.body.username
    let email = req.body.email
    if(!validateEmail(email)){
        res.redirect('/register?message=Invalid Email')
        return
    }
    let password = req.body.pwd
    if(!validatePassword(password)){
        res.redirect('/register?message=Invalid Password')
        return
    }
    let rePass = req.body.rePwd
    if(password!==rePass){
        res.redirect("/register?message=Password don't match")
        return
    }
    let verifyUUID = crypto.randomUUID()
    console.log( `
        From: user-reset@gmail.com
        To: ${email}
        subject: Verify Email
            Dear Sir/Ma'am
                please verify your email using the following link
                http://127.0.0.1:8000/verify/${verifyUUID}
    
            Thank you
            Team
        ` )
    await business.createNewAccount(username,email,password,verifyUUID)
    res.redirect("/")
})


/**
 * Renders the password reset request page with an optional message.
 * @name GET /reset-password
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get('/reset-password',async(req,res)=>{
    let message = req.query.message
    res.render('resetpassword',{
        layout:undefined,
        message:message
    })
})



/**
 * Handles password reset request, generates reset code, and sends email with reset link.
 * @name POST /reset-password
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post('/reset-password',async(req,res)=>{
    let email = req.body.email
    let resetUUID = crypto.randomUUID()
    let userDetail = await business.getUserDetailByEmail(email)
    if(!userDetail){
        res.redirect('/reset-password?message=invalid email')
        return
    }
    if(!email){
        res.redirect('/reset-password?message=invalid email')
        return
    }
    await business.updateUserDetails(userDetail.username,resetUUID)
    console.log( `
    From: user-reset@gmail.com
    To: ${userDetail.email}
    subject: Password Reset
        Dear Sir/Ma'am
            please reset your password using the following link
            http://127.0.0.1:8000/password-reset/${resetUUID}

        Thank you
        Team
    ` )
    res.redirect('/')
})

/**
 * Renders the password reset page for a given reset code.
 * @name GET /password-reset/:resetCode
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

app.get('/password-reset/:resetCode',async (req,res)=>{
    let resetCode = req.params.resetCode
    if(!resetCode){
        res.redirect('/')
        return
    }
    let userDetail = await business.findUserByReset(resetCode)
    if(!userDetail){
        res.redirect('/')
        return
    }
    res.render('reset',{
        layout:undefined,
        code:resetCode
    }
    )
})

app.get('/verify/:verifyCode',async(req,res)=>{
    let userDetail = await business.getUserByVerifyCode(req.params.verifyCode)
    if(!userDetail){
        res.redirect("/?message=User Not Found")
        return
    }
    await business.verifyUser(userDetail.username)
    res.redirect('/?message=verified')
})

/**
 * Handles password reset form submission, validates, updates password, and deletes reset code.
 * @name POST /resetpwd
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

app.post('/resetpwd',async (req,res)=>{
    let resetCode = req.body.code
    let userDetail = await business.findUserByReset(resetCode)
    let password = req.body.password
    let rePass = req.body.rePassword
    if(!userDetail){
        res.redirect('/')
        return
    }
    if(password!==rePass){
        res.redirect(`/password-reset/${resetCode}?message=password does not match`)
        return
    }

    await business.resetPassword(userDetail.username,password)
    await business.deleteResetCode(resetCode)
    res.redirect('/?message=Password Changed')
})

/**
 * Logs the user out by clearing the session cookie and redirecting to login.
 * @name GET /logout
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

app.get('/logout',async(req,res)=>{
    await business.terminateSession(req.cookies.session)
    res.clearCookie('session')
    res.redirect('/')
})

/**
 * Renders the user's account page.
 * @name GET /my-account
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

app.get('/my-account',async(req,res)=>{
    let sd = await business.getSession(req.cookies.session)
    if(!sd){
        res.redirect('/?message=Please Log-in')
        return
    }
    let username = sd.data.username
    let userDetail = await business.getUserDetails(username)
    let first = false
    if(await business.getMessages(username)){
        first = true
    }
    let message = await business.getMessages(username)
    let count = 0
    for(let m of message){
        count++
    }
    let badge100 = false
    if(count>=100){
        badge100 = true
    }
    let badges = userDetail.badges
    res.render('myaccount',{
        username,
        first,
        badge100
    })
})

app.post('/upload-profile', async (req, res) => {
    let profilePicture = req.files.submission;
    if(!profilePicture){
        res.redirect("/index")
        return
    }
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        return res.redirect('/?message=Please Log-in');
    }

    let username = session.data.username;


    let uploadPath = __dirname + '/public/assets/img/' + username + '.jpg';

    await profilePicture.mv(uploadPath, function (err) {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        }

        res.redirect('/index');
    });
});

app.get('/blocked',async(req,res)=>{
    let sd = await business.getSession(req.cookies.session)
    if(!sd){
        res.redirect('/?message=Please Log-in')
        return
    }
    let userDetail = await business.getUserDetails(sd.data.username)
    let blocked = userDetail.blockedUsers
    res.render('blocked',{
        blockedUsers:blocked
    })
})


app.post('/add-languages', async (req, res) => {
    try {
        // Extract form data
        let username = req.body.username;
        let fluentLanguages = req.body.fluentLanguages ? req.body.fluentLanguages.split(',').map(lang => lang.trim()) : [];
        let learningLanguages = req.body.learningLanguages ? req.body.learningLanguages.split(',').map(lang => lang.trim()) : [];

        // Update the user's languages in the database
        await business.updateUserLanguages(username, fluentLanguages, learningLanguages);

        res.redirect('/index?message=Languages successfully added');
    } catch (error) {
        console.error("Error adding languages:", error);
        res.redirect('/index_admin?message=Error adding languages');
    }
});

app.post('/add-contact', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let username = session.data.username;
    let contactUsername = req.body.contactUsername;
    try {
        await business.addContact(username, contactUsername);
        res.redirect('/index');
    } catch (error) {
        res.redirect(`/index?message=${error.message}`);
    }
});


app.post('/remove-contact', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let username = session.data.username;
    let contactUsername = req.body.contactUsername;
    await business.removeContact(username, contactUsername);
    res.redirect('/index');
});



app.post('/block-user', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let username = session.data.username;
    let blockUsername = req.body.blockUsername;
    await business.blockUser(username, blockUsername);
    res.redirect('/index');
});


app.post('/unblock-user', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let username = session.data.username;
    let blockUsername = req.body.blockUsername;
    await business.unblockUser(username, blockUsername);
    res.redirect('/index');
});


app.post('/send-message', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let sender = session.data.username;
    let receiver = req.body.receiver;
    let message = req.body.message;
    try {
        await business.sendMessage(sender, receiver, message);
        res.redirect(`/chat/${receiver}`);
    } catch (error) {
        res.redirect(`/chat/${receiver}?message=${error.message}`);
    }
});


app.get('/chat/:username', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let currentUser = session.data.username;
    let contact = req.params.username;

    // Get the messages exchanged between the logged-in user and the contact
    let messages = await business.getMessagesBetweenUsers(currentUser, contact);

    // Render the chat page using the `chat.handlebars` template
    res.render('chat', {
        layout:undefined,
        currentUser: currentUser,
        contact: contact,
        messages: messages
    });
});


app.get('/search-fluent-users', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    res.render('search_fluent_users');
});


app.post('/find-fluent-users', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let language = req.body.language;
    let users = await business.findUsersByFluentLanguage(language);

    let currentUser = session.data.username;
    users = users.filter(user => 
        user.username !== currentUser && 
        (!user.blockedUsers || !user.blockedUsers.includes(currentUser))
    );

    res.render('fluent_users_list', {
        language: language,
        users: users,
        currentUser: currentUser
    });
});



app.get('/unread-messages', async (req, res) => {
    let session = await business.getSession(req.cookies.session);
    if (!session) {
        res.redirect('/?message=Please Log-in');
        return;
    }
    let currentUser = session.data.username;

    // Fetch unread messages for the current user
    let unreadMessages = await business.getUnreadMessages(currentUser);

    res.render('unread_messages', {
        unreadMessages: unreadMessages
    });
});

app.get('/contacts',async(req,res)=>{
    let sd = await business.getSession(req.cookies.session)
    if(!sd){
        res.redirect('/?message=Please Log-in')
        return
    }
    let contacts = await business.getContact(sd.data.username)
    res.render('inbox',{
        contacts:contacts.contacts
    })
})

app.get('/settings',async(req,res)=>{
    let sd = await business.getSession(req.cookies.session)
    if(!sd){
        res.redirect('/?message=Please Log-in')
        return
    }
    let userDetail = await business.getUserDetails(sd.data.username)
    let blocked = userDetail.blockedUsers
    res.render('settings',{
        blockedUsers:blocked
        }
    )
})

/**
 * Renders a page not found page.
 * @name USE
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

app.use((req,res)=>{
    res.status(404)
    res.render('404',{
        layout:undefined
    })
})

/**
 * Renders a page if a page is not responding.
 * @name USE
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

app.use((err,req,res,next)=>{
    if(err.status===500){
        res.render('500',{
            layout:undefined
        })
    }
})



app.listen(8000)
