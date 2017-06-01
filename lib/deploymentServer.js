let log = require('debug')("ljs:deploymentServer");
let path = require('path')
let fs = require('fs')

let cors = require('cors')

let routing = undefined

let publicFolder = undefined
let applicationFolder = undefined
let liquidComponentFolder = undefined
let dependencyComponentFolder = undefined


module.exports = function(express, app, http, config) {
	let openServer = function() {
		// Routing for developers
		routing = require(path.join(__dirname, '..', config.applicationFolder, 'routing'))

		// Cross domain requests
		app.use(cors());
		app.options('*', cors());

		// Init public folders: bower, application, liquidComponents and other dependencies
		bowerFolder = path.join(__dirname, '..', 'bower_components')
		applicationFolder = path.join(__dirname, '..', config.applicationFolder, 'public')
		liquidComponentFolder = path.join(__dirname, '..', 'liquidScripts')

		app.use(express.static(bowerFolder))
		app.use(express.static(applicationFolder))
		app.use(express.static(liquidComponentFolder))

		// Start listening
		http.listen(config.server.port)
		routing(app)
	}

	if(config.server) {
	  openServer()
	  log('HTTP server on port ' + config.server.port)
	} else {
	  log('Deployment server not enabled')
	}
}