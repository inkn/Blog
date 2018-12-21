var express = require('express')
var User = require('../models/user')
var md5 = require('blueimp-md5')


var router = express.Router()

router.get('/',function (req, res) {
    res.render('index.html', {
        user: req.session.user
    })
})

//渲染登录页面
router.get('/signin', function (req, res) {
    res.render('login.html')
})

//处理登录请求
router.post('/signin', function (req, res) {
    var body = req.body
    body.password = md5(md5(body.password))
    User.findOne({
        email: body.email,
        password: body.password
    }, function (err, user) {
        if (err) {
            return res.status(500).json({
                success: false,
                err_code: 500,
                message: err.message
            })
        }
        if (!user) {
            return res.status(200).json({
                success: true,
                err_code: 1,
                message: 'email or password is invalid'
            })
        }
        //用户存在，设置session
        req.session.user = user

        return res.status(200).json({
            success: true,
            err_code: 0,
            message: 'OK'
        })
    })
})
//渲染注册页面
router.get('/signup', function (req, res) {
    res.render('register.html')
})

//处理注册请求
router.post('/signup',function (req, res) {
    //查看数据中是否已有该邮箱或昵称
    //有就返回错误信息 没有就保存数据注册成功跳转登录页面
    var body = req.body
    User.findOne({
        $or: [
            {email: body.email},
            {nickname: body.nickname}
        ]
    }, function (err, data) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Server error'
            })
        }
        if (data) {
            return res.status(200).json({
                success: true,
                err_code: 1,
                message: 'email or nickname is already exist'
            })
        }


        //加密密码
        body.password = md5(md5(body.password))
        //保存数据
        new User(body).save(function (err, user) {
            if (err) {
                return res.status(500).json({
                    err_code: 500,
                    message: 'Internal error'
                })
            }
            // 注册成功，使用 Session 记录用户的登陆状态
            req.session.user = user

            // Express 提供了一个响应方法：json
            // 该方法接收一个对象作为参数，它会自动帮你把对象转为字符串再发送给浏览器
            res.status(200).json({
                err_code: 0,
                message: 'OK'
            })

            // 服务端重定向只针对同步请求才有效，异步请求无效
            // res.redirect('/')
        })
    })
})

//处理用户退出请求
router.get('/signout', function (req, res) {
    //清除sesson保存的登录状态
    //重定向到首页
    req.session.user = null
    res.redirect('/')
})





module.exports = router