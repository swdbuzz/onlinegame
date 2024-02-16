process.on('uncaughtException', function(err){ console.log(err); }); 

var express = require('express');



var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");



var SOCKET_LIST = {};
 
var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	}
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}
 
var Player = function(id){
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.hp = 10;
	self.hpMax = 10;
	self.score = 0;
	self.username = "";
	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();
 
		if(self.pressingAttack){
			self.shootBullet(self.mouseAngle);
		}
	}
	self.shootBullet = function(angle){
		var b = Bullet(self.id,angle);
		b.x = self.x;
		b.y = self.y;
	}
 
 
	self.updateSpd = function(){
		if(self.pressingRight)
			self.spdX = self.maxSpd;
		else if(self.pressingLeft)
			self.spdX = -self.maxSpd;
		else
			self.spdX = 0;
 
		if(self.pressingUp)
			self.spdY = -self.maxSpd;
		else if(self.pressingDown)
			self.spdY = self.maxSpd;
		else
			self.spdY = 0;		
	}

	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number:self.number,
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
		}
	}
	self.getUpdatePack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
		}
	}




	Player.list[id] = self;
	initPack.player.push(self.getInitPack())
	return self;
}
Player.list = {};
Player.onConnect = function(socket, user){
	var player = Player(socket.id);
	player.username = user;
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
		else if(data.inputId === 'attack')
			player.pressingAttack = data.state;
		else if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
	});
	
	socket.emit('init',{
		selfId:socket.id,
		player: Player.getAllInitPack(),
		bullet: Bullet.getAllInitPack(),
	})
}
Player.getAllInitPack = function() {
	var players = []
	for (var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}
Player.onDisconnect = function(socket){
	
		for (var i in SOCKET_LIST)
			
			SOCKET_LIST[i].emit('addToChat',"Server: " + Player.list[socket.id].username + " Has left the server!")
		
	
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());		
	}
	return pack;
}
 
 
var Bullet = function(parent,angle){
	var self = Entity();
	self.id = Math.random();
	self.spdX = Math.cos(angle/180*Math.PI) * 10;
	self.spdY = Math.sin(angle/180*Math.PI) * 10;
	self.parent = parent;
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 100)
			self.toRemove = true;
		super_update();
 
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 16 && self.parent !== p.id){
				p.hp -= 1;
				var shooter = Player.list[self.parent];
				
				if (p.hp <= 0) {
					if (shooter) 
						shooter.score += 1;
					p.hp = p.hpMax;
					p.x = Math.random() * 500
					p.y = Math.random() * 500
				}
				self.toRemove = true;
			}
		}
	}
	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number:self.number
		}
	}
	self.getUpdatePack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			
		}
	}
	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack())
	return self;
}
Bullet.list = {};
Bullet.getAllInitPack = function() {
	var bullets = []
	for (var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
} 
Bullet.update = function(){
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		}
			
		else
			pack.push(bullet.getUpdatePack());		
	}
	return pack;
}
 
var DEBUG = true;

var USERS = {
	//username:password
	"bob":"asd",
	"bob2":"bob",
	"bob3":"ttt"
}
var isValidPassword = function(data,cb){
	setTimeout(function(){
		cb(USERS[data.username] === data.password);
	},10);
}
var isUsernameTaken = function(data,cb){
	setTimeout(function(){
		cb(USERS[data.username]);
	},10);
}
var addUser = function(data,cb){
	setTimeout(function(){
		USERS[data.username] = data.password;
		cb();
	},10);
}
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
 
	socket.on('signIn',function(data){
		isValidPassword(data,function(res){

			if(res){
				Player.onConnect(socket, data.username);
				socket.emit('signInResponse',{success:true});
			} else {
				socket.emit('signInResponse',{success:false});			
			}
		});
	});
	socket.on('signUp',function(data){
		isUsernameTaken(data,function(res){
			if(res){
				socket.emit('signUpResponse',{success:false});		
			} else {
				addUser(data,function(){
					socket.emit('signUpResponse',{success:true});					
				});
			}
		});		
	});
	
	socket.on('disconnect',function(){
		
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	socket.on('sendMsgToServer',function(data,playeruser){
		var playerName = ("" + socket.id).slice(2,7);
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat', playeruser + ': ' + data);
		}
	});
 
	socket.on('evalServer',function(data){
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);		
	});
	
	socket.on('PlayerJoined',function(data){
		var user = data.username
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat',"Server: " + user + " Has Joined the server!");
		}
	})
	
 
});
	
var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};
 
setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update(),
	}
 
	for(var i in SOCKET_LIST){
		
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack)
		
	}
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
},1000/25);
 




