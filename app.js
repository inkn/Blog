var express = require('express')
var path = require('path')
var template = require('express-art-template')
var bodyParser = require('body-parser')
var router = require('./routers/router')
var session = require('express-session')

var app = express()

//开放静态资源
app.use('/public', express.static(path.join(__dirname, './public')))
app.use('/node_modules', express.static(path.join(__dirname, './node_modules')))

//配置模版引擎
app.engine('html', template)
app.set('views', path.join(__dirname, './views')) // 默认就是 ./views 目录

//配置获取客户端post请求中formData数据的中间件
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

//配置session
app.use(session({
    // 配置加密字符串，它会在原有加密基础之上和这个字符串拼起来去加密
    // 目的是为了增加安全性，防止客户端恶意伪造
    secret: 'ink',
    resave: false,
    saveUninitialized: false // 无论你是否使用 Session ，我都默认直接给你分配一把钥匙
}))

//挂载路由
app.use(router)


app.listen(3000, function () {
    console.log('app is running...')
})