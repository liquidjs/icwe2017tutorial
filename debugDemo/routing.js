var log = require('debug')("ljs:deploymentServer");
var config = require('../config');
var path = require('path')

let client = config.client
client.port = config.server.publicPort
client.host = config.server.host
client.signalingRoute = config.server.signalingRoute

module.exports = function(app) {
	app.set('view engine', 'jade');
	app.set('views', path.join(__dirname, 'views'))

	app.get('/', function(req,res){


		var data = {
			client: client
		}

		res.render('index.jade', data)
	})
}
