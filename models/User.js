const { Schema } = require("mongoose")
//import bcrypt from "bcrypt"

const userSchema = new Schema({
    verified: { type: Boolean, default: false },
    email: String,
    password: String,
    accountId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Account' 
    },
    verifyId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Verify' 
    },
})

/** Comment for fs issue */
/* 
userSchema.methods.encryptPassword = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
}

userSchema.methods.comparePassword = function (password) {
    return bcrypt.compareSync(password, this.password)
}
*/

module.exports = { userSchema }