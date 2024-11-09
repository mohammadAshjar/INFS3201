const mongodb = require("mongodb")

let client = undefined 
let db = undefined

async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient('mongodb+srv://60106321:12class34@cluster0.fq90i.mongodb.net/')
        db = client.db('Project')
        await client.connect()
    }
}

async function getUserDetail(uname) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.findOne({username:uname})
    return result
}
    


async function getAllUsers() {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.find().toArray()
    return result
}

async function getUserDetails(username) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.findOne({username:username})
    return result
}

async function startSession(sd) {
    await connectDatabase()
    let session = db.collection('Session')
    await session.insertOne(sd)
}


async function updateSession(key, data) {
    await connectDatabase()
    let session = db.collection('Session')
    await session.replaceOne({key: key}, data)
}

async function getSession(key) {
    await connectDatabase()
    let session = db.collection('Session')
    let result = await session.findOne({key: key})
    return result
}

async function terminateSession(key) {
    await connectDatabase()
    let session = db.collection('Session')
    await session.deleteOne({key: key})
}

async function createNewAccount(data){
    await connectDatabase()
    let user = db.collection("Users")
    await user.insertOne(data)
}

async function getUserDetailByEmail(email) {
    await connectDatabase()
    let user = db.collection("Users")
    let result = await user.findOne({email:email})
    return result 
}

async function updateUserDetails(username,reset) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.updateOne({username:username},{$set:{ResetCode:reset}})
    return result
}

async function findUserByReset(resetCode) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.findOne({ResetCode:resetCode})
    return result
    
}

async function resetPassword(user,pwd){
    await connectDatabase()
    let users = db.collection('Users')
    await users.updateOne({username:user},{$set:{password:pwd}})
}

async function deleteResetCode(resetCode) {
    await connectDatabase()
    let users = db.collection("Users")
    await users.updateOne({ResetCode:resetCode},{$set:{ResetCode:''}})
}

module.exports = {
    getUserDetails,
    startSession, updateSession, getSession, terminateSession, createNewAccount, getUserDetailByEmail,
    updateUserDetails, findUserByReset, resetPassword, deleteResetCode, getAllUsers, getUserDetail
}