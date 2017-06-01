let log = require('debug')("ljs:init");
let path = require('path')
let minimist = require('minimist')

log('Create express server')
let express = require('express')
let app = express()
let http = require('http').Server(app)

let args = minimist(process.argv)
let configPath = path.join('..', args.c ? args.c : 'config.js')
let config = require(configPath);

log('Loading deploymentServer')
require('./deploymentServer')(express, app, http, config)

log('Loading websocketServer')
require('./websocketServer')(express, app, http, config)

log('Loading signalingServer')
require('./signalingServer')(express, app, http, config)

if(config.server) {
	log('Listen on port ' + config.server.port)
	http.listen(config.server.port)
}

log('Done')