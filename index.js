/* The express module is used to look at the address of the request and send it to the correct function */
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var crypto = require('crypto');
var Io = require('socket.io');
var usermodel = require('./user.js').getModel();

/* The http module is used to listen for requests from a web browser */
var http = require('http');

/* The path module is used to transform relative paths to absolute paths */
var path = require('path');

/* Creates an express application */
var app = express();

var iterations = 10000;

/* Creates the web server */
var server = http.createServer(app);

/* creates the socket server */
var io = Io(server);

/* Defines what port to use to listen to web requests */
var port =  process.env.PORT ? parseInt(process.env.PORT) : 8080;

var dbAddress = process.env.MONGODB_URI || 'mongodb://127.0.0.1/game';

function addSockets() {

	io.on('connection', (socket) => {
		console.log('user connected')
		socket.on('disconnect', () => {
			console.log('user disconnected');
		});
		socket.on('message', (message) => {
			io.emit('newMessage', message);
		});
	});
}


function startServer() {
	addSockets();

	function authenticateUser(username, password, callback) {
		if(!username) return callback('No username provided');
		if(!password) return callback('No password provided');
		usermodel.findOne({userName: username}, function(err, user) {
			if(err) return callback('Error in getting user from database');
			if(user.userName !== username) return callback('Username does not exist');
			crypto.pbkdf2(password, user.salt, 10000, 256, 'sha256', function(err, hash) {
				if(err) return callback('Error hashing password');
				if(password !== hash.toString('base64')) return callback('Wrong password');
				callback(null);
			});

		})
	}

	app.use(bodyParser.json({ limit: '16mb' }));
	app.use(express.static(path.join(__dirname, 'public')));

	app.post('/login', (req, res, next) => {

		var username = req.body.userName;
		var password = req.body.password;

		authenticateUser(username, password, function(err) {
			res.send({error: err});
		});

	});

	app.get('/login', (req, res, next) => {
		var filePath = path.join(__dirname, './login.html');
		res.sendFile(filePath);
	});

	/* Defines what function to call when a request comes from the path '/' in http://localhost:8080 */
	app.get('/form', (req, res, next) => {

		/* Get the absolute path of the html file */
		var filePath = path.join(__dirname, './index.html')

		/* Sends the html file back to the browser */
		res.sendFile(filePath);
	});

	app.post('/form', (req, res, next) => {

	  	// Converting the request in an user object
	  	var newuser = new usermodel(req.body);

	  	// Grabbing the password from the request
	  	var password = req.body.password;

	  	// Adding a random string to salt the password with
	  	var salt = crypto.randomBytes(128).toString('base64');
	  	newuser.salt = salt;

	  	// Winding up the crypto hashing lock 10000 times
	  	crypto.pbkdf2(password, salt, iterations, 256, 'sha256', function(err, hash) {
	  		if(err) {
	  			return res.send({error: err});
	  		}
	  		newuser.password = hash.toString('base64');
	  		// Saving the user object to the database
	  		newuser.save(function(err) {

	  			// Handling the duplicate key errors from database
	  			if(err && err.message.includes('duplicate key error') && err.message.includes('userName')) {
	  				return res.send({error: 'Username, ' + req.body.userName + 'already taken'});
	  			}
	  			if(err) {
	  				return res.send({error: err.message});
	  			}
	  			res.send({error: null});
	  		});
	  	});

  	});

	app.get('/game', (req, res, next) => {

		var filePath = path.join(__dirname, './game.html')
		res.sendFile(filePath);

	});

	/* Defines what function to all when the server recieves any request from http://localhost:8080 */
	server.on('listening', () => {

		/* Determining what the server is listening for */
		var addr = server.address()
			, bind = typeof addr === 'string'
				? 'pipe ' + addr
				: 'port ' + addr.port
		;

		/* Outputs to the console that the webserver is ready to start listenting to requests */
		console.log('Listening on ' + bind);
	});

	/* Tells the server to start listening to requests from defined port */
	server.listen(port);
}

mongoose.connect(dbAddress, startServer)
