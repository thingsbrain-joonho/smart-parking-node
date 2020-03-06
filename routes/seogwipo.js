var express = require('express');
var router = express.Router();
var SSH = require('simple-ssh');
var request = require('request');

const mysql = require('mysql');
var connection = mysql.createConnection({
    host: "definetestserver.iptime.org",
    port: 3306,
    user: "root",
    password: "define1101",
    database: "PK_DB",
    dateStrings: true,
    multipleStatements: true
});
connection.connect();

//실시간 주차면별 마커 표시 좌표
mark_position = new Array(50);
mark_position[1] = {width : 430, height : 240, width_plus : 70, height_plus : 70};
mark_position[2] = {width : 570, height : 240, width_plus : 70, height_plus : 70};
mark_position[3] = {width : 735, height : 240, width_plus : 70, height_plus : 70};
mark_position[4] = {width : 935, height : 240, width_plus : 70, height_plus : 70};
mark_position[5] = {width : 1125, height : 240, width_plus : 70, height_plus : 70};
mark_position[6] = {width : 1410, height : 270, width_plus : 100, height_plus : 100};
mark_position[7] = {width : 1180, height : 270, width_plus : 100, height_plus : 100};
mark_position[8] = {width : 950, height : 270, width_plus : 100, height_plus : 100};
mark_position[9] = {width : 715, height : 270, width_plus : 100, height_plus : 100};
mark_position[10] = {width : 1370, height : 750, width_plus : 200, height_plus : 200};
mark_position[11] = {width : 1440, height : 555, width_plus : 100, height_plus : 100};
mark_position[12] = {width : 1240, height : 555, width_plus : 100, height_plus : 100};
mark_position[13] = {width : 980, height : 555, width_plus : 100, height_plus : 100};
mark_position[14] = {width : 730, height : 555, width_plus : 100, height_plus : 100};
mark_position[15] = {width : 460, height : 555, width_plus : 100, height_plus : 100};
mark_position[16] = {width : 1130, height : 440, width_plus : 100, height_plus : 100};
mark_position[17] = {width : 920, height : 440, width_plus : 100, height_plus : 100};
mark_position[18] = {width : 700, height : 440, width_plus : 100, height_plus : 100};
mark_position[19] = {width : 480, height : 440, width_plus : 100, height_plus : 100};
mark_position[20] = {width : 370, height : 750, width_plus : 200, height_plus : 200};
mark_position[21] = {width : 620, height : 440, width_plus : 70, height_plus : 70};
mark_position[22] = {width : 810, height : 440, width_plus : 70, height_plus : 70};
mark_position[23] = {width : 1020, height : 440, width_plus : 70, height_plus : 70};
mark_position[24] = {width : 1220, height : 440, width_plus : 70, height_plus : 70};
mark_position[25] = {width : 435, height : 450, width_plus : 70, height_plus : 70};
mark_position[26] = {width : 625, height : 450, width_plus : 70, height_plus : 70};
mark_position[27] = {width : 840, height : 450, width_plus : 70, height_plus : 70};
mark_position[28] = {width : 1040, height : 450, width_plus : 70, height_plus : 70};
mark_position[29] = {width : 1220, height : 450, width_plus : 70, height_plus : 70};
mark_position[30] = {width : 830, height : 400, width_plus : 300, height_plus : 300};
mark_position[31] = {width : 235, height : 400, width_plus : 300, height_plus : 300};
mark_position[32] = {width : 1290, height : 475, width_plus : 80, height_plus : 80};
mark_position[33] = {width : 1080, height : 475, width_plus : 80, height_plus : 80};
mark_position[34] = {width : 860, height : 475, width_plus : 80, height_plus : 80};
mark_position[35] = {width : 1280, height : 380, width_plus : 80, height_plus : 80};
mark_position[36] = {width : 1070, height : 380, width_plus : 80, height_plus : 80};
mark_position[37] = {width : 860, height : 380, width_plus : 80, height_plus : 80};
mark_position[38] = {width : 665, height : 380, width_plus : 80, height_plus : 80};
mark_position[39] = {width : 1180, height : 440, width_plus : 80, height_plus : 80};
mark_position[40] = {width : 970, height : 440, width_plus : 80, height_plus : 80};
mark_position[41] = {width : 755, height : 440, width_plus : 80, height_plus : 80};
mark_position[42] = {width : 555, height : 440, width_plus : 80, height_plus : 80};

//cctv별 주차면id
cam_lot = new Array(20);
cam_lot[4] = [11, 12, 13, 14, 15];
cam_lot[5] = [16, 17, 18, 19];
cam_lot[6] = [6, 7, 8, 9, 10, 20];
cam_lot[7] = [32, 33, 34];
cam_lot[8] = [35, 36, 37, 38];
cam_lot[9] = [39, 40, 41, 42];
cam_lot[10] = [1, 2, 3, 4, 5];
cam_lot[11] = [30, 31];
cam_lot[13] = [21, 22, 23, 24];
cam_lot[14] = [25, 26, 27, 28, 29];

// mysql event using ZongJi
var ZongJi = require('zongji');
var zongji = new ZongJi({
    host: "definetestserver.iptime.org",
    port: 3306,
    user: "root",
    password: "define1101",
});

const Stream = require('../static_modules/node-rtsp-stream');
const streamUrl = process.env.FOSCAM_STREAM_URL;
const WebSocket = require('../static_modules/ws');
var session = require('express-session');

var streamURLs = ['', // 0번 : 없음
    'rtsp://125.143.250.201:20101/profile2/media.smp', // 1번 : 번호판 인식 카메라 (입구)
    'rtsp://125.143.250.201:20102/profile2/media.smp', // 2번 : 번호판 인식 카메라 (출구)
    'rtsp://125.143.250.201:20103/profile2/media.smp', // 3번 : 팬틸트 카메라
    'rtsp://125.143.250.201:20104/profile2/media.smp', // 4번 : 일반 IP 카메라 (맨위, 왼쪽)
    'rtsp://125.143.250.201:20105/profile2/media.smp', // 5번 (맨위, 오른쪽)
    'rtsp://125.143.250.201:20106/profile2/media.smp', // 6번 (중간 경차구역 왼쪽 바라보는 카메라)
    'rtsp://125.143.250.201:20107/profile2/media.smp', // 7번 (중간 경차구역 출구쪽 바라보는 카메라)
    'rtsp://125.143.250.201:20108/profile2/media.smp', // 8번 (팬틸트 밑 카메라)
    'rtsp://125.143.250.201:20109/profile2/media.smp', // 9번 (장애인구역 출구쪽 바라보는 카메라)
    'rtsp://125.143.250.201:20110/profile2/media.smp', // 10번 (장애인구역 입구쪽 바라보는 카메라)
    'rtsp://125.143.250.201:20111/profile2/media.smp', // 11번 (맨왼쪽 카메라)
    'rtsp://125.143.250.201:20112/profile2/media.smp', // 12번 (출구 왼쪽 카메라)
    'rtsp://125.143.250.201:20113/profile2/media.smp', // 13번 (출구 오른쪽 첫번째 카메라)
    'rtsp://125.143.250.201:20114/profile2/media.smp', // 14번 (출구 오른쪽 두번째 카메라)
];

// 스트림을 담을 배열
var streams = new Array(15);
// 스트림 시작시간을 담을 배열
// var streamTime = new Array(15);

// 스트림 생성함수
function makeStream(cam_id) {
    // console.log(cam_id);
    // console.log(streams);
    // var currentDate = new Date();
    if (streams[cam_id] == undefined) {
        streamName = 'parking_stream' + cam_id;
        // streamTime[cam_id] = currentDate.getTime();
        streams[cam_id] = new Stream({
            name: streamName,
            streamUrl: streamURLs[cam_id],
            wsPort: 9900 + cam_id,
        });
        return true;
    }
    return false;
}

enter_stream = new Stream({
    name: "enter_stream",
    wsPort: 9920,
});

exit_stream = new Stream({
    name: "exit_stream",
    wsPort: 9921,
});

function chkStreamConnection() {
    // console.log('stream info: ');
    for (var i = 0; i < streams.length; i++) {
        // console.log(streams[i]);
        if (streams[i] !== undefined) {
            if (streams[i].wsServer._server._connections == 0) {
                console.log(streams[i].name + " websocket is terminated");
                streams[i].mpeg1Muxer.stream.kill();
                streams[i].wsServer.close();
                streams[i] = undefined;
            }
        }
    }
}

//100초 주기로 connections 확인하기
connectionChk = setInterval(function () {
    chkStreamConnection();
}, 100000);

zongji.on('binlog', function (event) {
    switch (event.getEventName()) {
      case 'updaterows':
        if (event.tableMap[event.tableId].parentSchema == 'PK_DB'){
          if (event.tableMap[event.tableId].tableName == 'PK_ENTER_EXIT_1'){
            var cur_timestamp = new Date().getTime();
            var data_timestamp = event.timestamp;
            var diff = cur_timestamp - data_timestamp;
            if (diff < 10000){
              console.log('updaterows!!!!!!!!!!!!!!!!!!!');
              // console.log(event.rows[0]);
              // console.log('before event!!!!!');
              // console.log(event.rows[0].before);
              // console.log('after event!!!!!');
              // console.log(event.rows[0].after);
              after_info = event.rows[0].after
              cur_car_number = after_info.car_number;
              cur_enter_time = after_info.enter_time;
              cur_exit_time = after_info.exit_time;
              cur_parking_time = after_info.parking_time;
              cur_enter_img_url = after_info.enter_img_url;
              cur_exit_img_url = after_info.exit_img_url;
              cur_type = after_info.type;
              var result = {
                car_number : cur_car_number,
                enter_time : cur_enter_time,
                exit_time : cur_exit_time,
                parking_time : cur_parking_time,
                enter_img_url : cur_enter_img_url,
                exit_img_url : cur_exit_img_url,
                type : cur_type
              };
              result = JSON.stringify({
                car_number : cur_car_number,
                enter_time : cur_enter_time,
                exit_time : cur_exit_time,
                parking_time : cur_parking_time,
                enter_img_url : cur_enter_img_url,
                exit_img_url : cur_exit_img_url,
                type : cur_type
              });
              console.log(result);
              exit_stream.wsServer.broadcast(result);
            }
          }
        }
        break;
      case 'writerows':
          if (event.tableMap[event.tableId].parentSchema == 'PK_DB') {
              if (event.tableMap[event.tableId].tableName == 'PK_ENTER_EXIT_1') {
                  var cur_timestamp = new Date().getTime();
                  var data_timestamp = event.timestamp;
                  var diff = cur_timestamp - data_timestamp;
                  var result = [];
                  if (diff < 10000) {
                    console.log('writerows!!!!!!!!!!!!!!!!!!!');
                    console.log(event.rows[0]);
                    cur_car_number = event.rows[0].car_number;
                    cur_enter_time = event.rows[0].enter_time;
                    cur_enter_img_url = event.rows[0].enter_img_url;
                    var result = {
                      car_number : cur_car_number,
                      enter_time : cur_enter_time,
                      enter_img_url : cur_enter_img_url
                    };
                    result = JSON.stringify({
                      car_number : cur_car_number,
                      enter_time : cur_enter_time,
                      enter_img_url : cur_enter_img_url
                    });

                    console.log(enter_stream);
                    enter_stream.wsServer.broadcast(result);
                  }
              }
              if (event.tableMap[event.tableId].tableName == 'PK_LOT_USE_1'){
                var cur_timestamp = new Date().getTime();
                var data_timestamp = event.timestamp;
                var diff = cur_timestamp - data_timestamp;
                //최신의 파일 가져와서 시간차이 10초
                if (diff < 10000){
                  cur_cctv_id = event.rows[0].cctv_id;
                  cur_lot_id = event.rows[0].lot_id;
                  cur_lot_use = event.rows[0].lot_use;
                  var result = {
                    lot_id : cur_lot_id,
                    lot_use : cur_lot_use
                  };
                  result = JSON.stringify({
                    lot_id : cur_lot_id,
                    lot_use : cur_lot_use
                  });
                  //연결되어있는경우에만 브로드캐스트 수행
                  if (streams[cur_cctv_id] != undefined){
                    streams[cur_cctv_id].wsServer.broadcast(result);
                  }
                }
              }
          }
          break;
      default:
    }
});

zongji.start({
    includeEvents: ['tablemap', 'writerows', 'updaterows'],
    excludeSchema: { mysql:true },
    serverId: 2
});

process.on('SIGINT', function () {
    console.log('Got SIGINT.');
    zongji.stop();
    process.exit();
});

function getDateForm(date) {
    var year = date.getFullYear();
    var month = new String(date.getMonth() + 1);
    var day = new String(date.getDate());
    if (month.length == 1) {
        month = "0" + month;
    }
    if (day.length == 1) {
        day = "0" + day;
    }
    var today = year + '-' + month + '-' + day;
    return today;
}

function getTimeForm(date) {
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    if (hour < 10) {
        hour = "0" + hour;
    }
    if (minute < 10) {
        minute = "0" + minute;
    }
    if (second < 10) {
        second = "0" + second;
    }
    var time = hour + ":" + minute + ":" + second;
    return time;
}

function refreshPage(page) {
    if (page == 'mainPage') {
        // console.log('refresh main!');
    } else if (page == 'exchange') {
        request.get('http://definetestserver.iptime.org:8083/enter');
        request.get('http://definetestserver.iptime.org:8083/exit');
        request.get('http://definetestserver.iptime.org:8083/history');
    }
}

router.get('/', function (req, res) {
    var sess = req.session;
    // console.log('GET: main');
    //
    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        var sql1 = 'select time from PK_LOT_USE_1 order by time desc limit 1;'; // 가장 최근에 업데이트된 정보의 시간 구하기
        connection.query(sql1, function (err, result1, fields) {
            if (err) {
                console.log(err);
            } else {
                var time = result1[0].time;
                var sql2 = 'select * from PK_RATIO_1 order by time desc limit 60;'; // 최근 1시간 정보를 lot_use로 묶어서 더해 주차율 구하기
                var sql3 = 'select * from PK_LOT_USE_1 where time=\'' + time + '\' order by lot_id;'; // 주차면 정보 가져오기
                // 입차, 출차대수 파악하기 위해 lot_id가 0인 행의 값 비교하기
                var sql4 = 'select time, lot_use from PK_DB.PK_LOT_USE_1 where lot_id=0 and time order by time desc limit 60;';

                connection.query(sql2 + sql3 + sql4, function (err, result2, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.render('seogwipo', {
                            user_id: sess.user_id,
                            time: time, // 현재 기준시간
                            parking_graph: result2[0], // 최근 1시간 주차율
                            lot_use: result2[1], // 주차면 정보
                            count: result2[2], // 주차기록 정보
                        });
                    }
                });
            }
        });
    }
});

router.post('/', function (req, res) {
  var sess = req.session;
    var data = req.body.data;
    // console.log(data);
    var date = new Date();
    var time = getDateForm(date) + " " + getTimeForm(date);
    var beforeTime = new Date(time);
    if (data == 'hour') {
        beforeTime.setHours(beforeTime.getHours() - 1);
        var graphSql = 'select * from PK_RATIO_1 order by time desc limit 60;';
        var carEnterExitSql = 'select time, lot_use from PK_DB.PK_LOT_USE_1 where lot_id=0 and time order by time desc limit 60;';
    } else if (data == 'six-hour') {
        beforeTime.setHours(beforeTime.getHours() - 6);
        var graphSql = 'select * from PK_DB.PK_RATIO_1 where mod(SUBSTRING(time,15,3),6)=0 order by time desc limit 60;';
        var carEnterExitSql = 'select time, lot_use from PK_DB.PK_LOT_USE_1 where lot_id=0 and time order by time desc limit 360;';
    } else if (data == 'twelve-hour') {
        beforeTime.setHours(beforeTime.getHours() - 12);
        var graphSql = 'select * from PK_DB.PK_RATIO_1 where mod(SUBSTRING(time,15,3),12)=0 order by time desc limit 60;';
        var carEnterExitSql = 'select time, lot_use from PK_DB.PK_LOT_USE_1 where lot_id=0 and time order by time desc limit 720;';
    }
    beforeTime = getDateForm(beforeTime) + " " + getTimeForm(beforeTime);
    // var enterCntSql = 'select count(*) from PK_ENTER_EXIT_1 where (enter_time > \'' + beforeTime +
    //     '\' and enter_time < \'' + time + '\') and (parking_time = \'\' or parking_time > \'00:10:00\');';
    // var exitCntSql = 'select count(*) from PK_ENTER_EXIT_1 where (exit_time > \'' + beforeTime +
    //     '\' and exit_time < \'' + time + '\') and (parking_time = \'\' or parking_time > \'00:10:00\');';

    connection.query(graphSql + carEnterExitSql, function (err, result, fields) {
      console.log('graph result!!!!!!!!');
      console.log(result[0]);
      console.log('carEnterExit result!!!!!!!!');
      console.log(result[1]);
        if (err) {
            console.log(err);
        } else {
          console.log('post!!!!!!!!');
            // console.log(result);
            res.send({
              user_id: sess.user_id,
              result: result[0],
              count: result[1],
              // enterResult: result[1],
              // exitResult: result[2],
            });
        }
    });
});

router.get('/popup', function (req, res) {
    var sess = req.session;

    if (sess.user_id) {
        var query = req.query.id;
        var cam_id = parseInt(query.replace("cam", ""));
        var isNewStream = makeStream(cam_id);
        res.render('popup', {
            user_id: sess.user_id,
            cam_id: cam_id,
            isNewStream: isNewStream,
            mark_position : mark_position,
            cam_lot : cam_lot
        });
    } else {
        res.redirect('/login');
    }
});

router.post('/popup', function (req, res) {
    var data = req.body.data;
    // console.log('data: ' + data + '/');
    console.log('[SERVER] popup post');

    // killStream(data);
});

router.get('/enter', function (req, res) {
    var sess = req.session;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        var enterQuery = 'SELECT * FROM PK_DB.PK_ENTER_EXIT_1 order by enter_time desc limit 1';
        connection.query(enterQuery, function (err, result, fields) {
            var isNewStream = makeStream(1);
            res.render('enter', {
                user_id: sess.user_id,
                result: result,
                isNewStream: isNewStream,
            });
        });
    }

});

router.post('/enter', function (req, res) {
    var ssh = new SSH({
        // host: 'definenvr.iptime.org',
        host: '125.143.250.201',
        user: 'define',
        pass: 'define1101'
    });
    console.log('ssh start');
    var in_open_cmd = 'sh /home/define/serial/in_open.sh';
    ssh.exec(in_open_cmd, {
        out: function (stdout) {
            console.log(stdout);
            ssh.end();
            console.log('ssh end');
        }
    }).start();
});

router.get('/exit', function (req, res) {
    var sess = req.session;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        var exitQuery = 'SELECT * FROM PK_DB.PK_ENTER_EXIT_1 order by exit_time desc limit 1';
        connection.query(exitQuery, function (err, result, fields) {
            var isNewStream = makeStream(2);
            res.render('exit', {
                user_id: sess.user_id,
                result: result,
                isNewStream: isNewStream,
            });
        });
    }

});

router.post('/exit', function (req, res) {
    var ssh = new SSH({
        // host: 'definenvr.iptime.org',
        host: '125.143.250.201',
        user: 'define',
        pass: 'define1101'
    });
    // console.log('ssh start');
    var in_open_cmd = 'sh /home/define/serial/out_open.sh';
    ssh.exec(in_open_cmd, {
        out: function (stdout) {
            console.log(stdout);
            ssh.end();
            // console.log('ssh end');
        }
    }).start();
});

router.get('/history', function (req, res) {
    var sess = req.session;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        var today = getDateForm(new Date());
        var query = 'select * from PK_ENTER_EXIT_1 where enter_time like \'' + today + '%\';';
        connection.query(query, function (err, result, fields) {
            if (err) {
                console.log(err);
            } else {
                res.render('history', {
                    user_id: sess.user_id,
                    date: today,
                    logs: result,
                });
            }
        });
    }
});

router.post('/history', function (req, res) {
    var id = req.body.id;
    var order = req.body.order;
    var date = req.body.date;
    // console.log(id + ', ' + order);
    var query = 'error;';
    if (id == 'enter') {
        if (order == 'up') {
            query = 'SELECT * FROM PK_DB.PK_ENTER_EXIT_1 where enter_time like \'' + date + '%\' order by enter_time;';
        } else if (order == 'down') {
            query = 'SELECT * FROM PK_DB.PK_ENTER_EXIT_1 where enter_time like \'' + date + '%\' order by enter_time desc;';
        }
    } else if (id == 'exit') {
        if (order == 'up') {
            query = 'SELECT * FROM PK_DB.PK_ENTER_EXIT_1 where exit_time like \'' + date + '%\' order by exit_time;';
        } else if (order == 'down') {
            query = 'SELECT * FROM PK_DB.PK_ENTER_EXIT_1 where exit_time like \'' + date + '%\' order by exit_time desc;';
        }
    } else if (id == 'change') {
        query = 'select * from PK_ENTER_EXIT_1 where enter_time like \'' + date + '%\';';
    }
    connection.query(query, function (err, result, fields) {
        if (err) {
            console.log(err);
        } else {
            // console.log(result);
            res.json({
                result: result,
            });
        }
    });
});

router.get('/statistic', function (req, res) {
    var sess = req.session;

    if (!sess.user_id) {
        res.redirect('/login');
    } else {
        res.render('statistic', {
            user_id: sess.user_id,
        });
    }
});

router.post('/statistic', function(req, res){
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;

    // var carEnterExitCountingQuery = 'select time, lot_use from PK_DB.PK_LOT_USE_1 where lot_id=0 ' +
    // 'and time > \'' + startDate + '\' and time < \'' + endDate + '\' order by time;';

    // 입차대수, 출차대수, 평균 주차시간 구하기 (주간)
    var sql1 = 'select time,lot_id,lot_use from PK_DB.PK_LOT_USE_1 where lot_id!=0 ' +
    'and time > \'' + startDate + '\' and time < \'' + endDate +
    '\' order by time, lot_id;';
    // '\' and SUBSTRING(time, 11,13) >= 7 and SUBSTRING(time, 11, 13) <= 18 order by time, lot_id;';

    // 시간별 주차율을 구하기 위한 쿼리문
    var sql2 = 'select time, lot_use from PK_DB.PK_LOT_USE_1 ' +
    'where mod(SUBSTRING(time,15,3),60)=0 and time > \'' + startDate + '\' and time < \'' + endDate + '\' and lot_id=0;';

    // var sql2 = 'select SUBSTRING(time,11,3) as hour, sum(lot_use) from PK_DB.PK_LOT_USE_1' +
    // 'where mod(SUBSTRING(time,15,3),60)=0 ' +
    // 'and time > \'' + startDate + '\' and time < \'' + endDate + '\' and lot_id=0' +
    // 'group by SUBSTRING(time,11,3);'

    // 회전율을 구하기 위한 쿼리문
    var sql3 = 'select time, lot_use from PK_DB.PK_LOT_USE_1 ' +
    'where time > \'' + startDate + '\' and time < \'' + endDate + '\' and lot_id=0;';

    connection.query(sql1 + sql2 + sql3, function(err, result, fields){
        if(err){
            console.log(err);
        }else{
            res.json({
                overallInfo: result[0],
                hourlyGraphInfo: result[1],
                counting: result[2],
            });
        }
    });
});

router.get('/help', function (req, res) {
    var sess = req.session;
    console.log(sess.user_id);
    if (!sess.user_id) {
        res.redirect('/login');
    }
    else {
      //가장 최근에 업데이트 정보의 시간 구하기
      var sql1 = 'select time from PK_LOT_USE_1 order by time desc limit 1;';
      connection.query(sql1, function(err, result1, fields){
        if (err){
          console.log(err);
        }
        else{
          var time = result1[0].time;
          //주차면 정보 가져오기
          var sql2 = 'select * from PK_LOT_USE_1 where time=\'' + time + '\' order by lot_id;';
          connection.query(sql2, function(err, result2, fields){
            if (err){
              console.log(err);
            }
            else{
              res.render('help', {
                user_id: sess.user_id,
                lot_use: result2
              });
            }
          });
        }
      });
    }
});

module.exports = router;
