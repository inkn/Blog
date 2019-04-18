var express = require('express')
var User = require('../models/user')
var Topic = require('../models/topic')
var md5 = require('blueimp-md5')
var fs = require('fs')
var gm = require('gm')
var path = require('path')
var multer = require('multer')

//设置图片上传
var createFolder = function (folder) {
    try {
        fs.accessSync(folder);
    } catch (e) {
        fs.mkdirSync(folder);
    }
};

var uploadFolder = './upload/';

createFolder(uploadFolder);

// 通过 filename 属性定制
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder);    // 保存的路径，备注：需要自己创建
    },
    filename: function (req, file, cb) {
        // 将保存文件名设置为 字段名 + 时间戳，比如 logo-1478521468943
        cb(null, file.fieldname + '-' + Date.now());
    }
});

// 通过 storage 选项来对 上传行为 进行定制化
var upload = multer({storage: storage})

//----设置图片上传-end

var router = express.Router()

router.get('/', function (req, res, next) {

    // 同步分页
    var pageSize = 12
    var page = req.query.page ? Number.parseInt(req.query.page, 10) : 1
    page = page <= 0 ? 1 : page

    // 根据请求的页码查找对应的话题数据
    Topic.find()
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec((err, topics) => {
            if (err) {
                return next(err)
            }

            //查询所有话题的数目   总页数 = 话题总数目 / 每页话题数
            Topic.countDocuments((err, count) => {
                if (err) {
                    return next(err)
                }

                //计算总页数
                var totalPage = Math.ceil(count/pageSize)
                var totalPageToTemplate = new Array(totalPage)


                // art-template 渲染不了mongoose对象中含有数组的对象
                // var topics = [
                //     {
                //         'title': 'afafafa',
                //         'sa': [1,2,23]
                //     }]
                //这种可以渲染
                // 所以要处理topic数据

                var topics_index = []
                for (var i = 0; i < topics.length; i++) {
                    topics_index.push({
                        t_id: topics[i]._id,
                        title: topics[i].title,
                        author: topics[i].author,
                        author_avatar: topics[i].author_avatar,
                        created_time: topics[i].created_time,
                        commentNum: topics[i].comments.length,
                        visitedNum: topics[i].visitedNum,
                        lastUpdate_time: topics[i].lastUpdate_time
                    })
                }
                res.render('index.html', {
                    user: req.session.user,
                    topics: topics_index,
                    page: page,
                    totalPage: totalPageToTemplate
                })
            })
        })

})

//渲染登录页面
router.get('/signin', function (req, res) {
    res.render('login.html')
})

//处理登录请求
router.post('/signin', function (req, res, next) {
    var body = req.body
    body.password = md5(md5(body.password))
    User.findOne({
        email: body.email,
        password: body.password
    }, function (err, user) {
        if (err) {
            //当next带有参数时，会直接去找带有四个参数（err, req, res, next）的应用程序级别中间件（app.js中配置的错误处理中间件）
            return next(err)
            // return res.status(500).json({
            //     err_code: 500,
            //     message: err.message
            // })
        }
        if (!user) {
            return res.status(200).json({
                success: true,
                err_code: 1,
                message: 'email or password is invalid'
            })
        }
        //用户存在，设置session    注意是req中才有session
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
router.post('/signup', function (req, res, next) {
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
            //当next带有参数时，会直接去找带有四个参数（err, req, res, next）的应用程序级别中间件（app.js中配置的错误处理中间件）
            return next(err)
            // return res.status(500).json({
            //     err_code: 500,
            //     message: err.message
            // })
        }
        if (data) {
            return res.status(200).json({
                err_code: 1,
                message: 'email or nickname is already exist'
            })
        }


        //加密密码
        body.password = md5(md5(body.password))
        //保存数据
        new User(body).save(function (err, user) {
            if (err) {
                //当next带有参数时，会直接去找带有四个参数（err, req, res, next）的应用程序级别中间件（app.js中配置的错误处理中间件）
                return next(err)
                // return res.status(500).json({
                //     err_code: 500,
                //     message: err.message
                // })

            }
            // 注册成功，使用 Session 记录用户的登陆状态
            req.session.user = user

            // Express 提供了一个响应方法：json
            // 该方法接收一个对象作为参数，它会自动帮你把对象转为字符串再发送给浏览器
            return res.status(200).json({
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

//处理渲染设置页面
router.get('/setting', function (req, res) {
    res.render('./settings/profile.html', {
        user: req.session.user
    })
})

//处理设置基本信息的请求
router.post('/setting', function (req, res, next) {
    //通过post传过来的邮箱，找到该用户
    //更改性别和bio信息  更新session!!!!
    User.updateOne({email: req.body.email}, {
        $set: {
            gender: parseInt(req.body.gender),
            bio: req.body.bio
        }
    }, function (err) {
        if (err) return res.status(500).json({message: err.message})

        User.findOne({email: req.body.email}, function (err, user) {
            if (err) return res.status(500).json({message: err.message})

            req.session.user = user
            return res.status(200).json({
                err_code: 0,
                message: 'OK'
            })
        })
    })
})

//处理修改密码请求
router.post('/setting_pw', function (req, res, next) {
    var old_pass = md5(md5(req.body.old_pass))
    var new_pass = md5(md5(req.body.new_pass))
    User.findOne({email: req.body.email}, function (err, user) {
        if (err) {
            if (err) return res.status(500).json({message: err.message})
        }
        if (old_pass != user.password) {
            return res.status(200).json(
                {
                    err_code: 1,
                    message: '原密码不正确'
                }
            )
        } else {
            User.updateOne({email: req.body.email}, {$set: {password: new_pass}}, function (err) {
                if (err) {
                    if (err) return res.status(500).json({message: err.message})
                }


                return res.status(200).json({
                    err_code: 0,
                    message: '密码修改成功'
                })
            })

        }
    })
})

//处理头像上传
router.post('/setting_avt', upload.single('avatar'), function (req, res, next) {
    if (!req.file) {
        return res.status(200).json({
            err_code: 1,
            message: '请选择上传的文件'
        })
    }

    if (!req.file.mimetype || req.file.mimetype.indexOf('image/') != 0) {
        return res.status(200).json({
            err_code: 2,
            message: '上传的文件不是图片类型'
        })
    }


    //上传的是图片，使用gm 更改后 保存到public/avatar
    var avatar = path.join('/public/avatar/' +
        req.session.user.nickname + '-' + req.file.filename + '.' +
        req.file.originalname.split('.')[req.file.originalname.split('.').length - 1])

    gm(req.file.path)
        .resize(200, 200, '!')
        .write('.' + avatar, function (err) {
            if (err) {
                return next(err)
            }
            //修改并保存成功后，修改数据库中user的avatar , todo 删除upload中的文件
            User.updateOne({email: req.session.user.email}, {$set: {avatar: avatar}}, function (err) {
                if (err) {
                    next(err)
                }

                //修改数据库中的avatar后，修改session中的avatar
                req.session.user.avatar = avatar

                // res.redirect('/setting')
                return res.status(200).json({
                    err_code: 200,
                    message: 'Update avatar is OK'
                })
            })
        })
})

//************************************************************************************user end


//渲染发表话题页面
router.get('/topic/create', function (req, res) {
    res.render('topic/createTopic.html', {
        user: req.session.user
    })
})

//处理发表话题请求
router.post('/topic/create', function (req, res, next) {
    var topic = req.body
    if (topic.title === '') topic.title = '默认标题'
    topic.author = req.session.user.nickname
    topic.author_avatar = req.session.user.avatar
    new Topic(topic).save(function (err) {
        if (err) {
            return next(err)
        }
        res.redirect('/')
    })
})

//渲染话题页面
router.get('/topic', function (req, res, next) {
    // 根据id查找数据库的话题

    Topic.findOne({_id: req.query.t_id.replace(/"/g,'')}, (err, topic) => {
        if (err) {
            return next(err)
        }
        if (!topic) return next()
        //找到作者的签名
        User.findOne({nickname: topic.author}, (err, author) => {
            if (err) return next(err)

            //增加话题的访问次数
            Topic.updateOne({_id: req.query.t_id.replace(/"/g,'')},{$set:{visitedNum: ++topic.visitedNum}},(err) => {
                if (err) return next(err)

                // art-template 渲染不了mongoose对象中含有数组的对象
                topic=topic.toJSON()
                topic.author_bio = author.bio
                res.render('./topic/topic.html',{
                    topic
                })

            })


        })

    })
})

//***************************************************topic end

//异步处理回复评论提交
router.post('/topic/reply', (req, res, next) => {
    // 用户登录了才能评论
    var user = req.session.user
    if (!user) return res.status(200).json({err_code: 1})
    var body = req.body
    // 因为评论是一个数组，先要得到，再push一条数据，然后再更新话题的评论数据
    Topic.findOne({_id: body.topic_id.replace(/"/g, '')}, (err, topic) => {
        if (err) return res.status(500).json({message: err.message})
        if (!topic) return res.json({err_code: 500, message: '没有找到这条数据'})
        var comments = topic.comments
        var comment = {"author": user.nickname, "author_avatar": user.avatar, "content": body.content}
        comments.push(comment)
        Topic.updateOne({_id: body.topic_id.replace(/"/g, '')}, {$set: {comments: comments}}, err => {
            if (err) return res.status(500).json({message: err.message})
            return res.json({err_code: 0, message: 'OK'})
        })
    })
})

//异步处理评论点赞
router.get('/topic/fav', (req, res, next) => {
    // 用户登录了才能点赞
    var user = req.session.user
    if (!user) return res.status(200).json({err_code: 1})
    var t_id = req.query.t_id.replace(/"/g, '')
    var c_id = req.query.c_id.replace(/"/g, '')
    Topic.findOne({_id: t_id}, (err, topic) => {
        if (err) return res.status(500).json({message: err.message})
        var comments = topic.comments
        for (var i =0; i < comments.length; i++) {

            if (comments[i]._id == c_id) {
                var flag = true
                for (var j = 0; j < comments[i].favs.length; j++) {
                    if (comments[i].favs[j].author === user.nickname) {
                        flag = false
                        break
                    }
                }

                flag&&comments[i].favs.push({"author": user.nickname})
                break
            }

        }
        Topic.updateOne({_id: t_id}, {$set:{comments:comments}}, (err) => {
            if (err) return res.status(500).json({message: err.message})
            return res.status(200).json({message: 'OK'})
        })


    })
})

module.exports = router