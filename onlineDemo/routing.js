let log = require('debug')("ljs:deploymentServer");
let path = require('path')

let minimist = require('minimist')
let args = minimist(process.argv)
let configPath = path.join('..', args.c ? args.c : 'config.js')
let config = require(configPath);

let client = config.client
client.port = config.server.publicPort
client.host = config.server.host
client.signalingRoute = config.server.signalingRoute

module.exports = function(app) {
	app.set('view engine', 'jade');
	app.set('views', path.join(__dirname, 'views'))

	app.get('/', function(req, res){
		res.render('index.jade')
	})

	app.get('/chat', function(req, res){
		res.render('chat.jade')
	})

	app.get('/chat/client', function(req, res){
		var data = {
			client: client
		}

		res.render('chatstart.jade', data)
	})

	app.get('/chat/device', function(req, res){
		var data = {
			client: client
		}

		res.render('chatend.jade', data)
	})

	app.get('/photo/admin', function(req, res){
		var data = {
			client: client
		}

		res.render('photostart.jade', data)
	})

	app.get('/photo/guest', function(req, res){
		var data = {
			client: client
		}

		res.render('photoend.jade', data)
	})

	app.get('/photo', function(req, res){
		res.render('photo.jade')
	})

	app.get('/deck', function(req,res){
		var data = {
			client: client
		}

		res.render('deck.jade', data)
	})

	app.get('/hand', function(req,res){
		var data = {
			client: client
		}

		res.render('hand.jade', data)
	})

	app.get('/map', function(req,res){
		var data = {
			client: client
		}

		res.render('map.jade', data)
	})

	app.get('/map/offset', function(req,res){
		var data = {
			client: client
		}

		res.render('offset.jade', data)
	})

	app.get('/editor', function(req,res){
		var data = {
			client: client
		}

		res.render('dynamicEditor.jade', data)
	})
}