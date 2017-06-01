let log = require('debug')("ljs:signalingServer");
let ExpressPeerServer = require('peer').ExpressPeerServer;

module.exports = function(express, app, http, config) {
  let openServer = function() {
    // Path to the signaling server
    let options = {
        debug: true
    }
    let peerServer = ExpressPeerServer(http, options)
    app.use('/' + config.server.signalingRoute, peerServer)

    // Listeners
    peerServer.on('connection', function(id) {
      log('Peer connected: ' + id)
    });

    peerServer.on('disconnect', function(id) {
      log('Peer disconnected: ' + id)
    });
  }

  if(config.server && config.server.signalingRoute) {
    openServer()
    log('Signaling server started on port ' + config.server.port)
  } else {
    log('Signaling server not enabled')
  }
}