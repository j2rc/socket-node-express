const { Schema, model, models } = require("mongoose")

const accountSchema = new Schema({
    firstName: {
        type: String,
        trim: true,
        maxlength: [20, "Title must be less than 20 characters"]
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [20, "Title must be less than 20 characters"]
    },
    customized: {
        select: String,
        input: String
    },
    mobile: {
        type: String,
        trim: true,
        maxlength: [20, "Title must be less than 20 characters"]
    },
    radioGroup: String,
    selectId: String,
    hireDate: Date,
    isCheck: Boolean,
    image_1: {
        public_id: String,
        secure_url: String
    },
    image_2: {
        public_id: String,
        secure_url: String
    }
}, {
    //timestamps: true,
    //versionKey: false
})

module.exports = { accountSchema }