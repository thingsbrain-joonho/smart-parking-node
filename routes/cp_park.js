var express = require('express');
var router = express.Router();

const Stream = require('../static_modules/node-rtsp-stream');
const streamUrl = process.env.FOSCAM_STREAM_URL;
const WebSocket = require('../static_modules/ws');
const logger = require('../public/javascripts/logger.js');

var mysql = require('mysql');
var session = require('express-session');

var connection = mysql.createConnection({
    host: "definetestserver.iptime.org",
    port: 3306,
    user: "root",
    password: "define1101",
    database: "Jeju_PK_DB",
    dateStrings: true,
    multipleStatements: true
});
connection.connect();

var parkStream;
// var streamTime;

function makeStream() {
    var currentDate = new Date();
    if (parkStream == undefined) {
        // streamTime = currentDate.getTime();
        parkStream = new Stream({
            name: 'parking_stream',
            streamUrl: 'rtsp://admin:imass0319@definesp.iptime.org/Streaming/Channels/101/',
            wsPort: 9998
        });
        return true;
    }
    return false;
}

function chkStreamConnection() {
    if (parkStream !== undefined) {
        var connections = parkStream.wsServer._server._connections;
        // console.log('current connections are : ' + connections);
        if (connections == 0) {
            parkStream.mpeg1Muxer.stream.kill();
            parkStream.wsServer.close();
            parkStream = undefined;
            console.log('stream server is terminated!');
        }
    }
}

//100초 주기로 connections 확인하기
connectionChk = setInterval(function () {
    chkStreamConnection();
}, 100000);

// mysql event using ZongJi
var ZongJi = require('zongji');
var zongji = new ZongJi({
    host: "definetestserver.iptime.org",
    port: 3306,
    user: "root",
    password: "define1101"
});

// var event_name = '';

zongji.on('binlog', function (event) {
    // console.log('binlog');
    // event.dump();

    switch (event.getEventName()) {
        case 'writerows':
            // console.log(event.tableMap);
            if (event.tableMap[event.tableId].tableName == 'PK_PARKING_LOT_USE_1') {
                // console.log('PK_PARKING_LOT_USE_1');
                var cur_timestamp = new Date().getTime();
                var data_timestamp = event.timestamp;
                var diff = cur_timestamp - data_timestamp;

                if (diff < 10000) {
                    if (event.rows[0].lot_id != 0) {
                        var result = {
                            lot_id: event.rows[0].lot_id,
                            lot_use: event.rows[0].lot_use
                        };
                        result = JSON.stringify({
                            lot_id: event.rows[0].lot_id,
                            lot_use: event.rows[0].lot_use
                        })
                        // console.log(result);
                        if (parkStream != undefined) {
                            parkStream.wsServer.broadcast(result);
                        }
                        // console.log(typeof(JSON.stringify({lot_id : event.rows[0].lot_id, lot_use : event.rows[0].lot_use})));
                    }
                }
            }
            break;
        default:
    }
});

zongji.start({
    // includeEvents: ['writerows'],
    // includeEvents: ['tablemap', 'writerows'],
    includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows'],
    excludeSchema: { mysql:true },
    serverId: 1
});

process.on('SIGINT', function () {
    console.log('Got SIGINT.');
    zongji.stop();
    process.exit();
});

// 숫자에 콤마(,)표시 추가하는 함수
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// router.get('/video', function(req, res) {
//   res.render('park/video');
// });

/* GET: 메인 페이지 */
router.get('/', function (req, res) {
    var sess = req.session;
    // console.log(sess.pk_id + '!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        if (sess.role == '0' || sess.role == '1') {
            // 주차장 영상처리 부분
            var isNewStream = makeStream();
            // var isNewStream = true;

            saveLogger(req, sess.user_id, 'park', 'GET', req.query.id + '번 주차장 접속');
            // var pk_id = sess.pk_id;
            var pk_id = 1;
            var new_pk_id = 4051000000;

            // 제일 최근 캡쳐화면 및 주차장 정보 가져오기 위한 쿼리
            var sql1 = "select * from PK_PARKING_LOT_USE_" + pk_id + " ORDER BY time DESC limit 1; ";
            sql1 += "select * from PK_INFO where id=" + new_pk_id + "; ";

            connection.query(sql1, function (err, rows, fields) {
                var row_cap = rows[0][0];
                var row_master = rows[1][0];
                console.log(row_master['saturday_start']);
                // w_start_time = row_master['normal_start'];
                // w_end_time = row_master['normal_end'];
                // s_start_time: row_master['saturday_start'];
                // s_end_time = row_master['saturday_end'];
                // h_start_time: row_master['holiday_start'];
                // h_end_time: row_master['holiday_end'];

                // 현재 주차칸 정보 및 통계자료 등 가져오기 위한 쿼리
                var sql2 = "select lot_id, lot_use from PK_PARKING_LOT_USE_" + pk_id +
                    " where time='" + row_cap['time'] + "' and not lot_id=0 limit 6; ";
                sql2 += "select * from PK_LOG_" + pk_id + " where time='" + row_cap['time'] + "'; ";
                sql2 += "select date_format(time, '%H:%i') as t, " +
                    "cast((6-(lot_use))/6*100 AS signed integer) as lot_use " +
                    "from PK_PARKING_LOT_USE_" + pk_id + " " +
                    "where lot_id='all' order by time desc limit 10; ";
                sql2 += "select date_format(time, '%H:00') as t, avg(lot_use), " +
                    "cast((6-avg(lot_use))/6*100 AS signed integer) as lot_use " +
                    "from PK_PARKING_LOT_USE_" + pk_id + " " +
                    "where lot_id='all' and time>CURRENT_DATE() " +
                    "group by t order by t desc limit 10; ";
                sql2 += "select date_format(time, '%c/%d') as t, avg(lot_use), " +
                    "cast((6-avg(lot_use))/6*100 AS signed integer) as lot_use " +
                    "from PK_PARKING_LOT_USE_" + pk_id + " " +
                    "where lot_id='all' group by t order by t desc limit 10; ";

                connection.query(sql2, function (err, rows, fields) {
                    var row_use = rows[0];
                    var row_log = rows[1][0];
                    var row_chart1 = rows[2];
                    var row_chart2 = rows[3];
                    var row_chart3 = rows[4];

                    if (row_chart1[0] !== undefined) {
                        var chart1 = "['" + row_chart1[0]['t'] + "', " + (row_chart1[0]['lot_use']) + "]";
                        row_chart1.forEach(function (data) {
                            chart1 = "['" + data['t'] + "', " + (data['lot_use']) + "], " + chart1;
                        });
                    }
                    if (row_chart2[0] !== undefined) {
                        var chart2 = "['" + row_chart2[0]['t'] + "', " + (row_chart2[0]['lot_use']) + "]";
                        row_chart2.forEach(function (data) {
                            chart2 = "['" + data['t'] + "', " + (data['lot_use']) + "], " + chart2;
                        });
                    }
                    if (row_chart3[0] !== undefined) {
                        var chart3 = "['" + row_chart3[0]['t'] + "', " + (row_chart3[0]['lot_use']) + "]";
                        row_chart3.forEach(function (data) {
                            chart3 = "['" + data['t'] + "', " + (data['lot_use']) + "], " + chart3;
                        });
                        // console.log(row_pk_info);
                    }

                    var sql3 = "select * from PK_PARKING_LOT_USE_" + pk_id + " order by time DESC, lot_id limit 7;";
                    connection.query(sql3, function (err, result, fields) {
                        if (err) {
                            console.log(err, err.stack);
                        } else {
                            // console.log(result);
                        }
                        res.render('park', {
                            user_id: sess.user_id,
                            time_cap: row_cap['time'],
                            img: row_cap['file_path'],
                            pk_name: row_master['name'],
                            pk_location: row_master['address'],
                            w_start_time: row_master['normal_start'],
                            w_end_time: row_master['normal_end'],
                            s_start_time: row_master['saturday_start'],
                            s_end_time: row_master['saturday_end'],
                            h_start_time: row_master['holiday_start'],
                            h_end_time: row_master['holiday_end'],
                            cost: row_master['basic_charge'],
                            row_use: row_use,
                            pk_ratio: row_log['ratio'].toFixed(1),
                            chart1: chart1,
                            chart2: chart2,
                            chart3: chart3,
                            result: result,
                            isNewStream: isNewStream,
                        });
                    });
                });
            });
        } else {
            // 권한 없음 페이지로 이동.
            res.redirect('/error');
        }
    }
});

/* GET: 요금징수 페이지 */
// router.get('/charge', function(req, res) {
//   var sess = req.session;
//
//   if (!sess.user_id) {
//     res.redirect('/login');
//   } else {
//     var pk_id = sess.pk_id;
//
//     var sql1 = "select date_format(current_time(), '%H:%i') as t, lot_id, " +
//       "cast((count(lot_id)-sum(lot_use))/count(lot_id)*100 AS signed integer) as percent, " +
//       "(count(lot_id)-sum(lot_use)) as min " +
//       "from PK_PARKING_LOT_USE_" + pk_id + " " +
//       "where time>current_date() and not lot_id='all' " +
//       "group by lot_id order by t; ";
//
//     sql1 += "select date_format(time, '%H시') as t, " +
//       "(count(lot_id)-sum(lot_use)) as min " +
//       "from PK_PARKING_LOT_USE_" + pk_id + " " +
//       "where time>current_date() and not lot_id='all' " +
//       "group by t order by t desc; ";
//
//     connection.query(sql1, function(err, rows, fields) {
//       var row_lot = rows[0];
//       var row_chart_hour = rows[1];
//       var total_time = 0;
//       var total_profit_hour = 0;
//
//       row_lot.forEach(function(data) {
//         total_time += data['min'];
//       });
//
//       var total_profit = total_time * 50;
//       total_profit = numberWithCommas(total_profit);
//
//       var chart_hour = "['" + row_chart_hour[0]['t'] + "', " + (row_chart_hour[0]['min'] * 50) + "]";
//       row_chart_hour.forEach(function(data) {
//         data['min'] *= 50;
//         total_profit_hour += data['min'];
//         chart_hour = "['" + data['t'] + "', " + data['min'] + "], " + chart_hour;
//       });
//       total_profit_hour = numberWithCommas(total_profit_hour);
//
//       res.render('park/charge', {
//         user_id: sess.user_id,
//         now: row_lot[0]['t'],
//         total_time: total_time,
//         total_profit: total_profit,
//         row_lot: row_lot,
//         chart_hour: chart_hour,
//         total_profit_hour: total_profit_hour
//       });
//     });
//
//   }
// });
//
//
// /* GET: 주차장 추가 */
// router.get('/add', function(req, res) {
//   var sess = req.session;
//
//   if (!sess.user_id) {
//     res.redirect('/login');
//   } else {
//     var pk_id = sess.pk_id;
//
//     res.render('park/add', {
//       user_id: sess.user_id
//     });
//   }
//
// });
//
//
// /* GET: 주차장 추가1 */
// router.get('/add1', function(req, res) {
//   var sess = req.session;
//
//   if (!sess.user_id) {
//     res.redirect('/login');
//   } else {
//     var pk_id = sess.pk_id;
//
//     res.render('park/add1', {
//       user_id: sess.user_id
//     });
//   }
// });

function saveLogger(req, id, path, type, detail) {
    // 로그 파일에 로그인 IP와 사용자 정보 저장하기
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info("," + path + "," + type + "," + id + "," + ip + "," + detail);
}

module.exports = router;
