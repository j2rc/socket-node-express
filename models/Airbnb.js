const { Schema } = require("mongoose")

const airbnbSchema = new Schema({
    chart: String,
    feature_type: String,
    londec: Number,
    latdec: Number,
})

module.exports = { airbnbSchema }