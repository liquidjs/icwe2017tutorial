let log = require('debug')("ljs:deploymentServer");
let path = require('path')

let minimist = require('minimist')
let args = minimist(process.argv)
let configPath = path.join('..', args.c ? args.c : 'config.js')
let config = require(configPath);

/* 
	Add code here
*/

module.exports = function(app) {
	/*
		Add your code here
	*/
	app.get('/', function(req, res){
		res.sendFile(path.join(__dirname + '/views/index.html'))
	})
}