// ********* app.js 파일

// 디렉터리 관리를 위해 path 모듈 사용
const path = require("path");


// HTTP 서버(express) 생성 및 구동

// 1. express 객체 생성
const express = require('express');
const app = express();
var data = '{"timeStamp" : "-", "UTC" : "-", "CallSign" : "-", "Pos" : "-", "Alt" : "-", "Speed" : "-", "Direct" : "-"}';
var dgram = require('dgram');
var socket = dgram.createSocket('udp4');

// 2. "/" 경로 라우팅 처리
app.use("/", (req, res)=>{
    res.sendFile(path.join(__dirname, './index.html')); // index.html 파일 응답
})

// 3. 53000 port에서 서버 구동
const HTTPServer = app.listen(53000, ()=>{
    console.log("Server is open at port:53000");
});



// WebSocekt 서버(ws) 생성 및 구동

// 1. ws 모듈 취득
const wsModule = require('ws');

// 2. WebSocket 서버 생성/구동
const webSocketServer = new wsModule.Server( 
    {
        server: HTTPServer, // WebSocket서버에 연결할 HTTP서버를 지정한다.
        //port: 30002 // WebSocket연결에 사용할 port를 지정한다(생략시, http서버와 동일한 port 공유 사용)
    }
);


// connection(클라이언트 연결) 이벤트 처리
webSocketServer.on('connection', (ws, request)=>{

    // 1) 연결 클라이언트 IP 취득
    const ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    
    console.log(`새로운 클라이언트[${ip}] 접속`);
    
    // 2) 클라이언트에게 메시지 전송
    if(ws.readyState === ws.OPEN){ // 연결 여부 체크
        //ws.send(`클라이언트[${ip}] 접속을 환영합니다[${data}] from 서버`); // 데이터 전송
        ws.send(data);

    }
    
    // 3) 클라이언트로부터 메시지 수신 이벤트 처리
    ws.on('message', (msg)=>{
        console.log(`클라이언트[${ip}]에게 수신한 메시지 : ${msg}`);
        ws.send(data);
    })
    
    // 4) 에러 처러
    ws.on('error', (error)=>{
        console.log(`클라이언트[${ip}] 연결 에러발생 : ${error}`);
    })
    
    // 5) 연결 종료 이벤트 처리
    ws.on('close', ()=>{
        console.log(`클라이언트[${ip}] 웹소켓 연결 종료`);
        clearInterval(ws.interval);
    })

    ws.interval = setInterval(() => {
        // 1초마다 클라이언트로 메시지 전송
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      }, 50);

    
});


// UDP Socket open(53100)
socket.bind(53100);

socket.on('listening', function() {
    console.log('listening event');
});

socket.on('message', function(msg, rinfo) {
    console.log('메세지 도착', rinfo.address, msg.toString());
    
    var UTC = Buffer.alloc(20);
    var CallSign = Buffer.alloc(20);
    var Pos = Buffer.alloc(20);
   
    //---timestamp
    var dtimeStamp = (0xff & msg[3]) << 24  |
    (0xff & msg[2]) << 16  |
    (0xff & msg[1]) << 8   |
    (0xff & msg[0]) << 0;

    //---utc
    msg.copy(UTC, 0, 4, 24);
    var strUTC = UTC.toString();
    

    //---callsign
    msg.copy(CallSign, 0, 24, 44);
    var strCallSign = CallSign.toString();
    
    //---pos
    msg.copy(Pos, 0, 44, 64);
    var strPos = Pos.toString();

    var dAlt = (0xff & msg[67]) << 24  |
    (0xff & msg[66]) << 16  |
    (0xff & msg[65]) << 8   |
    (0xff & msg[64]) << 0;
    var dSpeed= (0xff & msg[71]) << 24  |
    (0xff & msg[70]) << 16  |
    (0xff & msg[69]) << 8   |
    (0xff & msg[68]) << 0;

    var dDirect = (0xff & msg[75]) << 24  |
    (0xff & msg[74]) << 16  |
    (0xff & msg[73]) << 8   |
    (0xff & msg[72]) << 0;

    console.log("timestamp " + dtimeStamp);
    console.log("UTC " + strUTC);
    console.log("CallSign " + strCallSign);
    console.log("Pos " + strPos);
    console.log("Alt " + dAlt);
    console.log("Speed " + dSpeed);
    console.log("Direct " + dDirect);
    
    var flightData = {
        timeStamp : dtimeStamp,
        UTC : strUTC,
        CallSign :strCallSign,
        Pos : strPos,
        Alt : dAlt,
        Speed : dSpeed,
        Direct : dDirect

    };

    var jsonData = JSON.stringify(flightData);

    data = jsonData;
   
});

socket.on('close', function() {
    console.log('close event');
});