var express = require('express');
var router = express.Router();

var mysql = require('mysql');
const logger = require('../public/javascripts/logger.js');

var connection = mysql.createConnection({
    host: "definetestserver.iptime.org",
    port: 3306,
    user: "root",
    password: "define1101",
    // database: "Jeju_PK_DB",
    dateStrings: true,
    multipleStatements: true
});

connection.connect();

/* GET : android search activity */
router.get('/search', function (req, res) {
    var sql1 = "select time from Jeju_PK_DB.PK_CAPTURE_1 ORDER BY time DESC limit 1; ";
    connection.query(sql1, function (err, rows, fields) {
        var row_cap = rows[0];
        var sql2 = "select cctv_id, time, lot_use from Jeju_PK_DB.PK_PARKING_LOT_USE_1 " +
            "where time='" + row_cap['time'] + "' and lot_id='all' limit 1; ";
        connection.query(sql2, function (err, rows, fields) {
            var row_lot = rows[0];
            res.json(row_lot);
        });
    });
});

/* GET : android detail activity */
router.get('/detail', function (req, res) {
    var sql1 = "select * from Jeju_PK_DB.PK_MASTER where park_id=1; ";
    connection.query(sql1, function (err, rows, fields) {
        var row_pk = rows[0];
        res.json(row_pk);
    });
});

// GET: ios parking info
router.get('/info', function (req, res) {
    var page = req.query.page;
    // console.log('page:' + page);
    var sql1 = "select * from Jeju_PK_DB.PK_INFO limit " + (page - 1) * 10 + ", 10; ";
    var sql2 = "select count(*) as cnt from Jeju_PK_DB.PK_INFO;";
    connection.query(sql1 + sql2, function (err, results, fields) {
        if (err) {
            console.log(err);
        } else {
            var count = results[1][0].cnt;
            var parkingInfoJSON = new Object();
            parkingInfoJSON.count = count;
            var pakringArray = new Array();
            // results[0].push({"count":count});
            for (var i = 0; i < results[0].length; i++) {
                pakringArray.push(results[0][i]);
            }
            parkingInfoJSON.parking = pakringArray;
            // console.log(parkingInfoJSON);
            res.json(parkingInfoJSON);
        }
    });
});

// GET: ios parking info
router.get('/locate', function (req, res) {
    var limit = req.query.limit;
    //var query = "select name, address, charge_info, lot, map_x, map_y from Jeju_PK_DB.PK_INFO limit " + limit;
    var query = "select * from Jeju_PK_DB.PK_INFO limit " + limit;
    connection.query(query, function (err, result, fields) {
        if (err) {
            console.log(err);
        } else {
            res.json(result);
        }
    });
});

// GET: ios realtime parking info
router.get('/realtime', function (req, res) {
    var query1 = "select time, lot_use from Jeju_PK_DB.PK_PARKING_LOT_USE_1 where lot_id=0 order by time desc limit 1;";
    var query2 = "select time, lot_use from PK_DB.PK_LOT_USE_1 where lot_id=0 order by time desc limit 1;";
    connection.query(query1 + query2, function (err, result, fields) {
        if (err) {
            console.log(err);
        } else {
            var rJson = new Array();
            var jParkingInfo = new Object();
            jParkingInfo.name = "사무실 앞 주차장"
            jParkingInfo.time = result[0][0].time;
            jParkingInfo.empty = result[0][0].lot_use;
            rJson.push(jParkingInfo);

            var sParkingInfo = new Object();
            sParkingInfo.name = "서홍동 공영주차장"
            sParkingInfo.time = result[1][0].time;
            sParkingInfo.empty = result[1][0].lot_use;
            rJson.push(sParkingInfo);
            res.json(rJson);
        }
    });
});

router.get('/charge', function (req, res) {

	var query = "select * from PK_DB.PK_PAYMENT where payment=0 and car_number like '%3773';";
	connection.query(query, function (err, result, fields) {

		if(err){
			console.log(err);
		}
		else{
	
			res.json(result);
			
		}
	});
	
});

router.get('/payment', function (req, res) {
	var uquery = "update PK_DB.PK_PAYMENT set payment=1, payment_time=now(), approval_number = CAST(RAND()*1000000000 AS UNSIGNED) where car_number like '%3773';";
        connection.query(uquery, function (err, result, fields){
		if(err){
			console.log(err);
		}
		else{
			res.json(result);
		}
	});
});



function saveLogger(req, id, path, type, detail) {
    // 로그 파일에 로그인 IP와 사용자 정보 저장하기
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info("," + path + "," + type + "," + id + "," + ip + "," + detail);
}

module.exports = router;
