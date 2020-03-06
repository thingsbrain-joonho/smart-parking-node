var express = require('express');
var router = express.Router();
var fs = require('fs');

var mysql = require('mysql');
var session = require('express-session');

const Stream = require('../static_modules/node-rtsp-stream');
const streamUrl = process.env.FOSCAM_STREAM_URL;
const WebSocket = require('../static_modules/ws');
//var bodyParser = require('body-parser');
const logger = require('../public/javascripts/logger.js');

//router.use(bodyParser.json());
//router.use(bodyParser.urlencoded());

var connection = mysql.createConnection({
    host: "definetestserver.iptime.org",
    port: 3306,
    encoding: 'utf8',
    charset: 'utf8mb4',
    user: "root",
    password: "define1101",
    // database: "Jeju_PK_DB",
    dateStrings: true,
    multipleStatements: true,
});
connection.connect();

var crypto = require('crypto');

function createUser(id, key, name, phone, buf) {
    var saveUserQuery = 'insert into PK_DB.PK_USER values(\'' + id + '\', \'' + key +
        '\', -1, -1,\'' + name + '\', \'' + phone + '\',\'' + buf + '\', 0);';
    connection.query(saveUserQuery, function (err, result, field) {
        if (err) {
            console.log(err);
        } else {
            // console.log(result);
        }
    });
}

// 숫자에 콤마(,)표시 추가하는 함수
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// function checkAuth(res, role, park){
//     if(role == 2){
//         if(park == 2){
//             res.redirect('/seogwipo');
//         }
//     }
// }

/* GET: 로그인 페이지 */
router.get('/login', function (req, res) {
    res.render('login', {
        user_id: undefined,
        result: '',
    });
});

/* POST: 로그인 페이지 */
router.post('/login', async function (req, res) {
    var sess = req.session;
    var id = req.body.id;
    var pw = req.body.pw;

    var name = req.body.name;
    var phone = req.body.phone;
    var cpw = req.body.cpw;

    // 회원가입일 때
    if (cpw !== '') {
        var checkIdQuery = "select count(*) as cnt from PK_DB.PK_USER where user_id=\'" + id + "\';";
        connection.query(checkIdQuery, function (err, result, fields) {
            if (err) {
                console.log(err);
            } else {
                if(result[0].cnt != 0){
                    var result = '이미 존재하는 아이디입니다.';
                    res.render('login', {
                        result: result,
                    });
                }else{
                    // console.log('sign up');
                    if (pw !== cpw) {
                        var result = '비밀번호가 맞지 않습니다.';
                        res.render('login', {
                            result: result,
                        });
                    } else {
                        // 암호화 후 DB 저장
                        crypto.randomBytes(64, function (err, buf) {
                            buf = buf.toString('base64')
                            var key = crypto.createHash("sha512").update(cpw + buf, 'utf-8').digest("base64");
                            createUser(id, key, name, phone, buf);

                            var msg = '성공적으로 처리되었습니다. 권한이 검토된 후에 로그인이 가능합니다.';
                            res.render('login', {
                                user_id: sess.user_id,
                                result: msg,
                            });
                        });
                    }
                }
            }
        });
    } else { // 로그인일 때
        var loginQuery = "select * from PK_DB.PK_USER where user_id=\'" + id + "\';";
        connection.query(loginQuery, function (err, result, fields) {
            if (err || result.length == 0) {
                var msg = '아이디 혹은 비밀번호가 맞지 않습니다.';
                res.render('login', {
                    result: msg,
                });
            } else {
                var dbPassword = result[0].user_pw;
                var inputPassword = pw;
                var salt = result[0].salt;
                var hashPassword = crypto.createHash("sha512").update(inputPassword + salt, 'utf-8').digest("base64");
                if (result[0].user_id == id && dbPassword === hashPassword) {
                    // console.log('login success');
                    sess.pk_id = result[0].pk_id;
                    sess.user_id = id;
                    console.log('sess.user_id');
                    console.log(sess.user_id);
                    sess.role = result[0].role;
                    sess.uid = result[0].uid;
                    if (sess.role == 2) {
                        if (sess.pk_id == 2)
                            res.redirect('/seogwipo');
                    } else {
                        res.redirect('/');
                    }
                } else {
                    var msg = '아이디 혹은 비밀번호가 맞지 않습니다.';
                    res.render('login', {
                        user_id: sess.user_id,
                        result: msg,
                    });
                }
            }
        });
    }

});

/* GET: 로그아웃 페이지 */
router.get('/logout', function (req, res) {
    var sess = req.session;
    if (sess.user_id) {
        req.session.destroy(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/login');
            }
        })
    } else {
        res.redirect('/login');
    }
});


/* GET: 메인 페이지 */
router.get('/', function (req, res) {
    var sess = req.session;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        if (sess.role == '0' || sess.role == '1') {
            // saveLogger(req, sess.user_id, 'main', 'GET', '메인화면 접속');
            // 관리하는 주차장 리스트를 받아와서 해당하는 만큼 쿼리문 돌려서 정보 얻어야 할듯.
            // var pk_queries = new Array();
            // var pk_list = pk_id.split(',');

            // 주차장 리스트 가져오기
            var sql1 = 'select * from Jeju_PK_DB.PK_INFO;';
            // 관리하는 주차장 쿼리문 돌리기 .. 추후에 지역별 현재 주차율 테이블을 만들어야 함.
            var sql2 = 'select time, sum(lot_use) as total from Jeju_PK_DB.PK_PARKING_LOT_USE_1 where lot_id != 0 group by time order by time desc limit 1;';
            var sql3 = 'select time, sum(lot_use) as total from PK_DB.PK_LOT_USE_1 where lot_id != 0 and lot_id != -1 group by time order by time desc limit 1;';
            connection.query(sql1 + sql2 + sql3, function (err, results, fields) {
                if (err) {
                    console.log(err);
                } else {
                    res.render('test_index.ejs', {
                        user_id: sess.user_id,
                        pk_list: sess.pk_id,
                        uid: sess.uid,
                        list: results[0],
                        define_total: results[1],
                        seogwipo_total: results[2],
                    });
                }
            });
        } else {
            // 권한 없음 페이지로 이동.
            res.redirect('/error');
        }
    }
});

// 주차장 추가
router.get('/add', function (req, res) {
    var sess = req.session;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        if (sess.role == '0') {
            res.render('add', {
                user_id: sess.user_id,
            });
        } else {
            // 권한 없음 페이지로 이동.
            res.redirect('/error');
        }
    }
});

// 주차장 추가항목 DB에 저장
router.post('/add', function (req, res) {
    var sess = req.session;

    var data = req.body.data;
    var uid = sess.uid;

    //DB 컬럼들
    var input_id = data[0].value;
    var input_name = data[1].value;
    var input_divide = data[9].value;
    var input_type = data[10].value;
    var input_address = data[2].value;
    var input_address_old = "";
    var input_lot = data[5].value;
    var input_level = 0;
    var input_day_stream = "";
    var input_available = "";
    var input_normal_start = "";
    var input_normal_end = "";
    var input_saturday_start = "";
    var input_saturday_end = "";
    var input_holiday_start = "";
    var input_holiday_end = "";
    var input_charge_info = "1";
    var input_basic_time = "30";
    var input_basic_charge = data[7].value;
    var input_additional_time = "15";
    var input_additional_charge = data[8].value;
    var input_day_ticket_time = "";
    var input_day_ticket_charge = "";
    var input_month_ticket_charge = "";
    var input_payment = "";
    var input_features = "";
    var input_office = "";
    var input_tel = "";
    var input_map_y = data[4].value;
    var input_map_x = data[3].value;
    var input_data_time = "";
    var input_uid = uid;
    var input_cctv = data[6].value;

    //charge_info 관련
    if(input_basic_charge == 0 && input_additional_charge == 0){
      input_charge_info = "0";
    }

    var input_available = "";
    var cnt = 2;
    for (var i = 0; i < data.length; i++) {
        // console.log(i + ": " + data[i].name + "= " + data[i].value);
        if (data[i].name == 'workingday') {
            if (data[i].value == 1) {
                input_available += "평일";
            } else if (data[i].value == 2) {
                input_available += "+토요일";
            } else if (data[i].value == 3) {
                input_available += "+공휴일";
            }
            cnt++;
        }
    }


    for (var i = 0; i < data.length; i++) {
        if (data[i].name == 'workingday') {
            if (data[i].value == 1) {
                input_normal_start += data[cnt + 9].value;
                input_normal_end += data[cnt + 10].value;
            } else if (data[i].value == 2) {
                input_saturday_start += data[cnt + 11].value;
                input_saturday_end += data[cnt + 12].value;
            } else if (data[i].value == 3) {
                input_holiday_start += data[cnt + 13].value;
                input_holiday_end += data[cnt + 14].value;
            }
        }
    }

    var getId = "select id from Jeju_PK_DB.PK_INFO order by id desc limit 1;";
    connection.query(getId, function (err, result, fields) {
        if (err) {
            console.log(err);
        } else {
            var input_id = parseInt(result[0].id) + 1;

            var charge_info = 1;  // 1:유료, 0:무료
            //기본요금, 추가요금 둘다 0원인경우
            if (data[7].value == '0' && data[8].value == '0'){
              charge_info = 0;
            }

            // var string_id = String(id);
            // var insertSql = "insert into Jeju_PK_DB.PK_INFO(id,name,divide,type,address,lot,normal_start,normal_end,saturday_start,saturday_end," +
            //     "holiday_start,holiday_end,charge_info,map_x,map_y,uid,cctv, available) " +
            //     `values('${id}', '${data[1].value}', '${data[8].value}', '${data[9].value}', '${data[2].value}', ${data[5].value}, '${data[cnt+8].value}', '${data[cnt+9].value}'` +
            //     `,'${data[cnt+10].value}', '${data[cnt+11].value}', '${data[cnt+12].value}', '${data[cnt+13].value}', '${data[7].value}'` +
            //     `,'${data[4].value}','${data[3].value}', ${uid}, ${data[6].value}, ${workingdayString});`;
            var insertSql = "insert into Jeju_PK_DB.PK_INFO values(" +
                `'${input_id}', '${input_name}','${input_divide}', '${input_type}','${input_address}', '${input_address_old}', ${input_lot}, ${input_level}, '${input_day_stream}', '${input_available}', '${input_normal_start}',` +
                `'${input_normal_end}','${input_saturday_start}', '${input_saturday_end}', '${input_holiday_start}', '${input_holiday_end}',` +
                `'${input_charge_info}','${input_basic_time}','${input_basic_charge}','${input_additional_time}','${input_additional_charge}', '${input_day_ticket_time}', '${input_day_ticket_charge}', '${input_month_ticket_charge}', '${input_payment}', '${input_features}', '${input_office}', '${input_tel}', '${input_map_y}', '${input_map_x}', '${input_data_time}', ${input_uid}, ${input_cctv});`;
            connection.query(insertSql, function (err, result, fields) {
                if (err) {
                    console.log(err);
                } else {
                    // console.log(result);
                }
            });
        }
    });

});

// 주차장 수정 혹은 삭제
router.get('/setting', function (req, res) {
    var sess = req.session;
    var id = req.query.id;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        // 유저의 권한이 슈퍼관리자일 때만 이동
        if (sess.role == '0') {
            var getInfo = 'select * from Jeju_PK_DB.PK_INFO where id=\'' + id + '\'';
            connection.query(getInfo, function (err, result, fields) {
                if (err) {
                    console.log(err);
                } else {
                    res.render('setting', {
                        user_id: sess.user_id,
                        result: result,
                    });
                }
            });
        } else {
            // 권한 없음 페이지로 이동.
            res.redirect('/error');
        }
    }

});

// 주차장 수정항목 DB에 반영
router.post('/setting', function (req, res) {
    var sess = req.session;
    var data = req.body.data;
    var uid = sess.uid;

    var input_id = data[0].value;
    var input_name = data[1].value;
    var input_divide = data[9].value;
    var input_type = data[10].value;
    var input_address = data[2].value;
    var input_address_old = "";
    var input_lot = data[5].value;
    var input_level = 0;
    var input_day_stream = "";
    var input_available = "";
    var input_normal_start = "";
    var input_normal_end = "";
    var input_saturday_start = "";
    var input_saturday_end = "";
    var input_holiday_start = "";
    var input_holiday_end = "";
    var input_charge_info = "1";
    var input_basic_time = "30";
    var input_basic_charge = data[7].value;
    var input_additional_time = "15";
    var input_additional_charge = data[8].value;
    var input_day_ticket_time = "";
    var input_day_ticket_charge = "";
    var input_month_ticket_charge = "";
    var input_payment = "";
    var input_features = "";
    var input_office = "";
    var input_tel = "";
    var input_map_y = data[4].value;
    var input_map_x = data[3].value;
    var input_data_time = "";
    var input_uid = uid;
    var input_cctv = data[6].value;

    //무료, 유료 체크
    if(input_basic_charge == 0 || input_additional_charge == 0){
      input_charge_info = "0";
    }

    var cnt = 2;
    for (var i = 0; i < data.length; i++) {
        if (data[i].name == 'workingday') {
            if (data[i].value == 1) {
                input_available += "평일";
            } else if (data[i].value == 2) {
                input_available += "+토요일";
            } else if (data[i].value == 3) {
                input_available += "+공휴일";
            }
            cnt++;
        }
    }

    for (var i = 0; i < data.length; i++) {
        if (data[i].name == 'workingday') {
            if (data[i].value == 1) {
                input_normal_start += data[cnt + 9].value;
                input_normal_end += data[cnt + 10].value;
            } else if (data[i].value == 2) {
                input_saturday_start += data[cnt + 11].value;
                input_saturday_end += data[cnt + 12].value;
            } else if (data[i].value == 3) {
                input_holiday_start += data[cnt + 13].value;
                input_holiday_end += data[cnt + 14].value;
            }
        }
    }

    var modifySql = "update Jeju_PK_DB.PK_INFO " +
        `set name='${input_name}',divide='${input_divide}',type='${input_type}',` +
        `address='${input_address}',lot='${input_lot}',available='${input_available}',normal_start='${input_normal_start}',normal_end='${input_normal_end}',` +
        `saturday_start='${input_saturday_start}',saturday_end='${input_saturday_end}',holiday_start='${input_holiday_start}', holiday_end='${input_holiday_end}', charge_info='${input_charge_info}',` +
        `basic_charge='${input_basic_charge}', additional_charge='${input_additional_charge}', map_x='${input_map_x}',map_y='${input_map_y}',cctv='${input_cctv}'` +
        `where id='${input_id}'`;

    connection.query(modifySql, function (err, result, fields) {
        if (err) {
          console.log('err!!!!!!!!!!');
            console.log(err);
        } else {
            // console.log(result);
        }
    });
});

router.post('/delete', function (req, res) {
    var sess = req.session;
    var data = req.body.data;
    // console.log(data);

    var deleteSql = `delete from Jeju_PK_DB.PK_INFO where id='${data}'`;
    connection.query(deleteSql, function (err, result, fields) {
        if (err) {
            console.log(err);
        } else {
            // console.log(result);
        }
    });
});

router.get('/error', function (req, res) {
    var sess = req.session;

    res.render('error', {
        user_id: sess.user_id,
    });
})

function saveLogger(req, id, path, type, detail) {
    // 로그 파일에 로그인 IP와 사용자 정보 저장하기
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // logger.info("," + path + "," + type + "," + id + "," + ip + "," + detail);
}

module.exports = router;
