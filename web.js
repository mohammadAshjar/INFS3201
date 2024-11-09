const express=require('express')
const business = require("./business")
const bodyParser = require('body-parser')
const handlebars = require('express-handlebars')
const cookieParser = require('cookie-parser')

app = express()
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())
app.use(express.static('public'))
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use(urlencodedParser)
app.use(cookieParser())

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

function validatePassword(password){
    if(password.length<8){
        return false
    }
    return true
}

app.get('/', async (req,res)=>{
    let message = req.query.message
    res.render('login',{message:message,layout:undefined})
    }    
    
)

app.post('/', async (req, res) => {
    let username = req.body.uname
    let password = req.body.pw
    let userDetail = await business.getUserDetails(username)
    let session = await business.attemptLogin(username, password)
    if(!userDetail){
        res.redirect("/?message=Invalid Credentials")
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

app.get('/index',async(req,res)=>{
    let sd = await business.getSession(req.cookies.session)
    if(!sd){
        res.redirect('/')
    }
    let username = sd.data.username
    if(sd.data.type==="Admin"){
        res.render('index_admin')
    }
    else{
        res.render('index_user',{username})
    }
})

app.get('/users', async (req,res)=>{
    let users = await business.getAllUsers()
    res.render('users',{
        data: users
    })
})
app.get('/register',(req,res)=>{
    let message = req.query.message
    res.render('register',{
        message:message,
        layout:undefined
    })
})

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
    await business.createNewAccount(username,email,password)
    res.redirect("/")
})


app.get('/reset-password',async(req,res)=>{
    let message = req.query.message
    res.render('resetpassword',{
        layout:undefined,
        message:message
    })
})

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
