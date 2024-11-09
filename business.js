const persistence = require('./persistance')
const crypto = require('crypto')

function hashPassword(pwd){
    var hash = crypto.createHash('sha256')
    hash.update(pwd)
    let r = hash.digest('hex')
    return r
}

async function attemptLogin(u, p) {
    let details = await persistence.getUserDetails(u)
    let hashedPassword = hashPassword(p)
    if (details == undefined || details.password != hashedPassword) {
        return undefined
    }
    
    let sessionKey = crypto.randomUUID()
    let sd = {
        key: sessionKey,
        expiry: new Date(Date.now() + 1000*60*5),
        data: {
            username: details.username,
            type: details.type
        }
    }
    await persistence.startSession(sd)
    return sd
}

async function terminateSession(key) {
    if (!key) {
        return
    }
    await persistence.terminateSession(key)
}

async function getSession(key) {
    return await persistence.getSession(key)
}

async function createNewAccount(uname,email,password) {
    let uData = {
        username: uname,
        password: hashPassword(password),
        email: email,
        type: "Standard"
    }
    await persistence.createNewAccount(uData)
    
}

async function getUserDetailByEmail(email) {
    return await persistence.getUserDetailByEmail(email)
    
}

async function updateUserDetails(user,reset){
    return await persistence.updateUserDetails(user,reset)
}

async function findUserByReset(resetCode) {
    return await persistence.findUserByReset(resetCode)
    
}

async function resetPassword(user,pwd){
    return await persistence.resetPassword(user,hashPassword(pwd))
}

async function deleteResetCode(resetCode) {
    await persistence.deleteResetCode(resetCode)
    
}

async function getAllUsers() {
    return persistence.getAllUsers()
    
}

async function getUserDetails(uname){
    return await persistence.getUserDetail(uname)
}





async function updateUserProfilePicture(username, fileName) {
    return await persistence.updateUserProfilePicture(username, fileName);
}


module.exports = {
    attemptLogin, terminateSession, getSession, createNewAccount, 
    getUserDetailByEmail, updateUserDetails,
    findUserByReset, resetPassword, deleteResetCode, getAllUsers,
    getUserDetails
}