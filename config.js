var config = {
	applicationFolder: 'applicationTemplate/',

	server: {
		port: 8888,
		publicPort: 8888,
		signalingRoute: 'signaling',
		host: 'localhost'
	},

	client: {
		strategy: 'full_graph',
		useRoutingTable: true,
		webrtc: true,
		relay: false
	},
}

module.exports = config
