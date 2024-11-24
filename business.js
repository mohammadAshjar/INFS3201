const { assert } = require('console')
const persistence = require('./persistance')
const crypto = require('crypto')
const { builtinModules } = require('module')


/**
 * Hashes a password .
 * @param {string} pwd - The password to hash.
 * @returns {string} The hashed password.
 */
function hashPassword(pwd){
    var hash = crypto.createHash('sha256')
    hash.update(pwd)
    let r = hash.digest('hex')
    return r
}


/**
 * Attempts to log a user in.
 * @param {string} u - The username.
 * @param {string} p - The password.
 * @returns {<Object|undefined>} Session data if successful, otherwise undefined.
 */
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


/**
 * Terminates a session.
 * @param {string} key - The session key.
 */
async function terminateSession(key) {
    if (!key) {
        return
    }
    await persistence.terminateSession(key)
}


/**
 * Retrieves a session by key.
 * @param {string} key - The session key.
 * @returns {<Object>} The session data.
 */
async function getSession(key) {
    return await persistence.getSession(key)
}


/**
 * Creates a new user account.
 * @param {string} uname - The username.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 */
async function createNewAccount(uname,email,password,verifyCode) {
    let uData = {
        username: uname,
        password: hashPassword(password),
        email: email,
        type: "Standard",
        verified:"No",
        verifyCode:verifyCode
    }
    await persistence.createNewAccount(uData)
    
}


/**
 * Retrieves user details by email.
 * @param {string} email - The user's email.
 * @returns {<Object>} The user details.
 */
async function getUserDetailByEmail(email) {
    return await persistence.getUserDetailByEmail(email)
    
}


/**
 * Updates user reset details.
 * @param {string} user - The username.
 * @param {string} reset - Reset code.
 * @returns {<Object>} The update result.
 */
async function updateUserDetails(user,reset){
    return await persistence.updateUserDetails(user,reset)
}


/**
 * Finds a user by reset code.
 * @param {string} resetCode - The reset code.
 * @returns {<Object>} The user details.
 */
async function findUserByReset(resetCode) {
    return await persistence.findUserByReset(resetCode)
    
}


/**
 * Resets a user's password.
 * @param {string} user - The username.
 * @param {string} pwd - The new password.
 */
async function resetPassword(user,pwd){
    return await persistence.resetPassword(user,hashPassword(pwd))
}



/**
 * Deletes a reset code for a user.
 * @param {string} resetCode - The reset code.
 */
async function deleteResetCode(resetCode) {
    await persistence.deleteResetCode(resetCode)
    
}


/**
 * Retrieves all users.
 * @returns {<Array>} List of all users.
 */
async function getAllUsers() {
    return persistence.getAllUsers()
    
}


/**
 * Retrieves user details by username.
 * @param {string} uname - The username of the user.
 * @returns {<Object>} The user details.
 */
async function getUserDetails(uname){
    return await persistence.getUserDetail(uname)
}

async function getUserByVerifyCode(verifyCode) {
    return await persistence.getUserByVerifyCode(verifyCode)
    
}

async function verifyUser(username){
    await persistence.verifyUser(username)
}

async function getMessages(username) {
    return await persistence.getMessages(username)
    
}

async function addContact(username, contactUsername) {
    let userDetail = await persistence.getUserDetail(username);
    if (userDetail.blockedUsers && userDetail.blockedUsers.includes(contactUsername)) {
        throw new Error("User is blocked");
    }
    return await persistence.addContact(username, contactUsername);
}

// Remove Contact
async function removeContact(username, contactUsername) {
    return await persistence.removeContact(username, contactUsername);
}

// Block User
async function blockUser(username, blockUsername) {
    return await persistence.blockUser(username, blockUsername);
}

// Unblock User
async function unblockUser(username, blockUsername) {
    return await persistence.unblockUser(username, blockUsername);
}

// Send Message
async function sendMessage(sender, receiver, message) {
    let receiverDetail = await persistence.getUserDetail(receiver);
    
    if (receiverDetail.blockedUsers && receiverDetail.blockedUsers.includes(sender)) {
        throw new Error("User has blocked you");
    }
    
    await persistence.sendMessage(sender, receiver, message);

    // Add sender to receiver's contact list if not already added
    if (!receiverDetail.contacts || !receiverDetail.contacts.includes(sender)) {
        await persistence.addContact(receiver, sender);
    }

    // Evaluate badges for sender and receiver
    console.log(`Evaluating badges for sender: ${sender} and receiver: ${receiver}`);
    await evaluateBadges(sender);
    await evaluateBadges(receiver);
}



// Get Messages Between Users
async function getMessagesBetweenUsers(user1, user2) {
    return await persistence.getMessagesBetweenUsers(user1, user2);
}

// Find Users by Fluent Language
async function findUsersByFluentLanguage(language) {
    return await persistence.findUsersByFluentLanguage(language);
}

async function getContact(username) {
    return await persistence.getContact(username)
    
}


async function evaluateBadges(username) {
    let userDetails = await persistence.getUserDetail(username);

    // Ensure badges field exists
    if (!userDetails.badges) {
        userDetails.badges = [];
    }

    // Badge: First Conversation
    if (!userDetails.badges.includes("First Conversation")) {
        let conversations = await persistence.getMessagesBetweenUsers(username, null);
        let uniqueContacts = new Set(conversations.map(msg => msg.sender === username ? msg.receiver : msg.sender));
        if (uniqueContacts.size > 0) {
            console.log(`Awarding "First Conversation" badge to user: ${username}`);
            userDetails.badges.push("First Conversation");
        }
    }

    // Badge: 100 Messages Sent
    if (!userDetails.badges.includes("100 Messages Sent")) {
        let sentMessagesCount = await persistence.countMessagesSent(username);
        if (sentMessagesCount >= 100) {
            console.log(`Awarding "100 Messages Sent" badge to user: ${username}`);
            userDetails.badges.push("100 Messages Sent");
        }
    }

    // Update user details with new badges
    await persistence.updateUserBadges(username, userDetails.badges);
    console.log(`Updated badges for user: ${username} - ${userDetails.badges}`);
}

async function updateUserLanguages(username, fluentLanguages, learningLanguages) {
    // Fetch user details to ensure the user exists
    let userDetails = await persistence.getUserDetail(username);
    if (!userDetails) {
        throw new Error(`User ${username} not found`);
    }

    // Update fluent and learning languages in the persistence layer
    await persistence.updateUserLanguages(username, fluentLanguages, learningLanguages);
}

module.exports = {
    attemptLogin, terminateSession, getSession, createNewAccount, 
    getUserDetailByEmail, updateUserDetails,
    findUserByReset, resetPassword, deleteResetCode, getAllUsers,
    getUserDetails, getUserByVerifyCode, verifyUser,addContact, removeContact, blockUser, unblockUser,
    sendMessage, getMessagesBetweenUsers, findUsersByFluentLanguage,
    getContact, evaluateBadges,updateUserLanguages,
    getMessages
}
