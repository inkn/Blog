var mongoose = require('mongoose')

//连接数据库
mongoose.connect('mongodb://localhost/Blog')

//1创建schema(架构)
var Schema = mongoose.Schema
var userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: Number,
        enum: [-1, 0, 1],
        default: -1
    },
    birthday: {
        type: Date,
    },
    bio: {
        type: String
    },
    avatar: {
        type: String,
        default: '/public/img/avatar-default.png'
    },
    created_time: {
        type: Date,
        default: Date.now
    },
    status: {
        type: Number,
        enum: [0, 1, 2],
        //0 普通  1不能评论 2不能登录
        default: 0
    }
})

//2发布model
var model = mongoose.model('User', userSchema)

module.exports = model