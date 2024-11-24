const mongodb = require("mongodb")

let client = undefined 
let db = undefined

/**
 * Connects to the MongoDB database.
 * @function
 */
async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient('mongodb+srv://60106321:12class34@cluster0.fq90i.mongodb.net/')
        db = client.db('Project')
        await client.connect()
    }
}


/**
 * Retrieves user details by username.
 * @param {string} uname - The username of the user.
 * @returns {<Object>} The user details.
 */
async function getUserDetail(uname) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.findOne({username:uname})
    return result
}
    

/**
 * Gets all users.
 * @returns {<Array>} List of all users.
 */
async function getAllUsers() {
    await connectDatabase()
    let users = db.collection('Users')
    let result =await users.find().toArray()
    return result
}


/**
 * Retrieves user details by username.
 * @param {string} username - The username of the user.
 * @returns {<Object>} The user details.
 */
async function getUserDetails(username) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.findOne({username:username})
    return result
}


/**
 * Starts a session.
 * @param {Object} sd - Session data.
 */
async function startSession(sd) {
    await connectDatabase()
    let session = db.collection('Session')
    await session.insertOne(sd)
}


/**
 * Updates a session.
 * @param {string} key - Session key.
 * @param {Object} data - Data to update.
 */
async function updateSession(key, data) {
    await connectDatabase()
    let session = db.collection('Session')
    await session.replaceOne({key: key}, data)
}


/**
 * Retrieves a session by key.
 * @param {string} key - Session key.
 * @returns {<Object>} The session data.
 */
async function getSession(key) {
    await connectDatabase()
    let session = db.collection('Session')
    let result = await session.findOne({key: key})
    return result
}


/**
 * Terminates a session.
 * @param {string} key - Session key.
 */
async function terminateSession(key) {
    await connectDatabase()
    let session = db.collection('Session')
    await session.deleteOne({key: key})
}



/**
 * Creates a new user account.
 * @param {Object} data - User data.
 */
async function createNewAccount(data){
    await connectDatabase();
    let user = db.collection("Users");
    data.badges=[];
    await user.insertOne(data);
}


/**
 * Retrieves user details by email.
 * @param {string} email - The user's email.
 * @returns {<Object>} The user details.
 */
async function getUserDetailByEmail(email) {
    await connectDatabase()
    let user = db.collection("Users")
    let result = await user.findOne({email:email})
    return result 
}


/**
 * Updates user reset details.
 * @param {string} username - The username of the user.
 * @param {string} reset - Reset code.
 * @returns {<Object>} The update result.
 */
async function updateUserDetails(username,reset) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.updateOne({username:username},{$set:{ResetCode:reset}})
    return result
}


/**
 * Finds a user by reset code.
 * @param {string} resetCode - The reset code.
 * @returns {<Object>} The user details.
 */
async function findUserByReset(resetCode) {
    await connectDatabase()
    let users = db.collection('Users')
    let result = await users.findOne({ResetCode:resetCode})
    return result
    
}


/**
 * Resets a user's password.
 * @param {string} user - The username.
 * @param {string} pwd - The new password.
 */
async function resetPassword(user,pwd){
    await connectDatabase()
    let users = db.collection('Users')
    await users.updateOne({username:user},{$set:{password:pwd}})
}


/**
 * Deletes a reset code for a user.
 * @param {string} resetCode - The reset code.
 */
async function deleteResetCode(resetCode) {
    await connectDatabase()
    let users = db.collection("Users")
    await users.updateOne({ResetCode:resetCode},{$set:{ResetCode:''}})
}

async function getUserByVerifyCode(verifyCode){
    await connectDatabase()
    let users = db.collection("Users")
    let result = await users.findOne({verifyCode:verifyCode})
    return result
}

async function verifyUser(username) {
    await connectDatabase()
    let users = db.collection('Users')
    await users.updateOne({username:username},{$set:{verified:"Yes"}})
    
}




/* ---------------------------------new coded added from here -----------------------------------------*/


// Add Contact
async function addContact(username, contactUsername) {
    await connectDatabase();
    let users = db.collection('Users');
    let result = await users.updateOne(
        { username: username },
        { $addToSet: { contacts: contactUsername } }
    );
    return result;
}

// Remove Contact
async function removeContact(username, contactUsername) {
    await connectDatabase();
    let users = db.collection('Users');
    let result = await users.updateOne(
        { username: username },
        { $pull: { contacts: contactUsername } }
    );
    return result;
}

// Block User
async function blockUser(username, blockUsername) {
    await connectDatabase();
    let users = db.collection('Users');
    let result = await users.updateOne(
        { username: username },
        { $addToSet: { blockedUsers: blockUsername } }
    );
    return result;
}

// Unblock User
async function unblockUser(username, blockUsername) {
    await connectDatabase();
    let users = db.collection('Users');
    let result = await users.updateOne(
        { username: username },
        { $pull: { blockedUsers: blockUsername } }
    );
    return result;
}

// Send Message
async function sendMessage(sender, receiver, message) {
    await connectDatabase();
    let messages = db.collection('Messages');
    await messages.insertOne({
        sender: sender,
        receiver: receiver,
        message: message,
        timestamp: new Date(),
        read: false // Mark as unread initially
    });
}


// Get Messages Between Users
async function getMessagesBetweenUsers(user1, user2) {
    await connectDatabase();
    let messages = db.collection('Messages');
    let result = await messages.find({
        $or: [
            { sender: user1, receiver: user2 },
            { sender: user2, receiver: user1 }
        ]
    }).sort({ timestamp: 1 }).toArray();
    return result;
}

// Find Users by Fluent Language
async function findUsersByFluentLanguage(language) {
    await connectDatabase();
    let users = db.collection('Users');
    let result = await users.find({ fluentLanguages: language }).toArray();
    return result;
}

async function getContact(username) {
    await connectDatabase();
    let users = db.collection('Users')
    let result = await users.findOne({username:username})
    return result
    
}

// Update user badges
async function updateUserBadges(username, badges) {
    await connectDatabase();
    let users = db.collection('Users');
    const result = await users.updateOne(
        { username: username },
        { $set: { badges: badges } }
    );

    if (result.matchedCount === 0) {
        console.error(`Failed to update badges for user: ${username} - User not found.`);
    } else {
        console.log(`Successfully updated badges for user: ${username}`);
    }
}


// Count messages sent by a user
async function countMessagesSent(username) {
    await connectDatabase();
    let messages = db.collection('Messages');
    let count = await messages.countDocuments({ sender: username });
    return count;
}

async function updateUserLanguages(username, fluentLanguages, learningLanguages) {
    await connectDatabase();
    let users = db.collection('Users');
    
    console.log(`Updating languages for user: ${username}`);
    const result = await users.updateOne(
        { username: username },
        {
            $set: {
                fluentLanguages: fluentLanguages,
                learningLanguages: learningLanguages
            }
        }
    );

    if (result.matchedCount === 0) {
        console.error(`Failed to update languages for user: ${username} - User not found.`);
    } else if (result.modifiedCount > 0) {
        console.log(`Successfully updated languages for user: ${username}`);
    } else {
        console.warn(`Languages for user: ${username} were not modified. Possible no change detected.`);
    }
}

module.exports = {
    getUserDetails,
    startSession, updateSession, getSession, terminateSession, createNewAccount, getUserDetailByEmail,
    updateUserDetails, findUserByReset, resetPassword, deleteResetCode, getAllUsers, getUserDetail,
    getUserByVerifyCode, verifyUser,addContact,removeContact, blockUser, unblockUser,sendMessage, getMessagesBetweenUsers, findUsersByFluentLanguage,
    getContact,updateUserBadges,countMessagesSent,updateUserLanguages
}
