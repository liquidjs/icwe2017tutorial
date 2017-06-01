/**
 * @param	{name}	name of the strategy to use
 */
const LiquidStrategy = function(name) {
	this.choosePath = strategies[name].choosePath
	this.receiveMessage = strategies[name].receiveMessage
	this.disconnect = strategies[name].disconnect
}

/**
 * Responsible for returning the next hop peer in order to reach the destination
 * It must be implemented using Promise. 
 * @param	{[uid]}			destination		uid of the peer you are seeking info about. 
 * @return	{[liquidURL]}	next_hop		liquidURL of next_hop to forward the message.
 */
LiquidStrategy.prototype.choosePath = function(destination) {
	this.choosePath(destination)
}

/**
 * Responsible of receiving messages sent by the strategy. For sending 
 * strategyMessage use the message operation to 'strategyMessage'/
 * @param {[Object]}	message		message sent by the strategy	
 */
LiquidStrategy.prototype.receiveMessage = function(message) {
	this.receiveMessage(message)
}

/**
 * Called upon the disconnection of a peer that had a direct connection.
 * @param {[uid]}	peerId	Id of the peer that was disconnected
 */
LiquidStrategy.prototype.disconnect = function(peerId) {
	this.disconnect(peerId)
}

const promisePool = {}
const answerPool = {}
const reply_counter = new Map() 	// keeps track of how many negative replies we got
									// once we get nb_sent_query negative we can safly reply negativ
const debug = false					// debug flag to display console logs.

const strategies = {
	minimal_connection: {
		choosePath: function (destination) {
			/* 
				- Do I have a path?
				- Do the connection still exists?
				 - if YES to both --> return path
				 - else --> _createPath() --> return path
			*/
			return new Promise(function(resolve, reject) {
				/** Prefer direct connections over toure with replay.
				 * --> check first the peersTable then routingTable.
				 */
				const peersTable = LiquidPeerConnection.getPeersTableMap()
				const routingTable = LiquidPeerConnection.getRoutingTable()
				if (peersTable.size == 0) {
					/* we don't know anybody --> reject promise */
					const liquidURL = {
						device: destination
					}
					// resolve(liquidURL)
					reject(liquidURL)
				} else if(peersTable.has(destination)) {
					/* we know the destination --> resolve promise */
					const liquidURL = {
						device: destination
					}
					resolve(liquidURL)
				} else if(LiquidPeerConnection.isRoutingTableActive() && routingTable.has(destination)){
					/**
					 * We are using the routingTable and it contains 
					 * a route to 'destination' --> use it.
					 */
					resolve(routingTable.get(destination))
				} else {
					/* we don't directly know the destination --> ask our peers about it */
					const id = Liquid.createUniqueId()
					let visited_peers = []
					visited_peers.push(Liquid.getDeviceId())
					const message = {
						operation: 'strategyMessage',
						sub_operation: 'query',
						promiseId: id,
						visited_peers: visited_peers,
						fromURL: {device:Liquid.getDeviceId()},
						to: undefined,
						queryURL: destination
					}
					if(debug) console.log(`* initial query asked sent to ${peersTable.size} peers.`)
					reply_counter.set(id, {counter: 0, sent: peersTable.size}) // initialize this query id
					for (let entry of peersTable.entries()) {
						if(debug) console.log(`\tAsking ${entry[0]} about ${destination}`)
						const url = {
							device: entry[0]
						}
						message.to = url
						Liquid.sendMessage(url, message)
					}

					promisePool[id] = {resolve: resolve, reject: reject /* interval: interval*/}

					// const startTime = new Date().getTime()
					// let interval = setInterval(function(){
					// 	if ((new Date().getTime() - startTime) > 2000) {
					// 		clearTimeout(interval)
					// 		return reject(console.error('Timeout Error!!!!!'))
					// 	}
					// 	if (strategies.minimal_connection.__resolved_value != undefined) {
					// 		clearTimeout(interval)
					// 		const liquidURL = {
					// 			device: strategies.minimal_connection.__resolved_value
					// 		}
					// 		return resolve(liquidURL)
					// 	} else {
					// 		console.warn('waiting for answer...')
					// 	}
						
					// }, 500)
				}
			}.bind(this))
		},
		
		disconnect: function(peerId) {
			if (LiquidPeerConnection.isRoutingTableActive()) {
				const routingTable = LiquidPeerConnection.getRoutingTable()
				/* 
				* get all the peers that were relayed by this.peer, create 
				* a new connection with them according to the strategy
				*/
				routingTable.forEach(function(value, key) {
					if (value.device == peerId) {
						// The reconnection is the job of the liquidStrategy
						if (debug) console.log(`Found a peer that need to be reconnected: ${key}`)

						LiquidPeerConnection.connect(key, function(){
							if (debug) console.log(`connection with ${key} established....`)
							routingTable.delete(key)
							const url = {
								device: key
							}
							routingTable.set(key, url)
							if (debug) console.log('routing table updated... now is:')
							if (debug) console.log(routingTable)
						})
					} else if (value.device == key) {
						LiquidPeerConnection.connect(key, function(){
							if (debug) console.log(`connection with ${key} established....`)
							routingTable.delete(key)
							const url = {
								device: key
							}
							routingTable.set(key, url)
							if (debug) console.log('routing table updated... now is:')
							if (debug) console.log(routingTable)
						})
					}else {
						console.warn(`PROBLEM? value: ${value.device} key: ${key}`)
					}
				})
			}
		},

		receiveMessage: function(message){
			switch (message.sub_operation) {
			case 'query':
				if(debug) {
					console.log(`Received QUERY startegy message from ${message.fromURL.device}, type: ${message.sub_operation}, queryURL: ${JSON.stringify(message.queryURL)}`)
				}
				strategies.minimal_connection._queryMessage(message)
				break
			case 'reply':
				if(debug) {
					console.log(`startegy REPLY message from ${message.fromURL.device}, queryURL: ${JSON.stringify(message.queryURL)}, answer: ${message.answer}, promiseId: ${message.promiseId}`)
				}
				strategies.minimal_connection._replyMessage(message)
				break
			}

		},

		/**
		 * Received a query message about a peer.
		 * Check if we know it and reply.
		 */
		_queryMessage: function(message) {
			// check if we already saw this message and if yes, discard it
			if (message.visited_peers.includes(Liquid.getDeviceId())) {
				if(debug) console.warn(`Message already seen.... skip msg:${JSON.stringify(message)}`)
				return
			}
			const query = message.queryURL
			const peersTable = LiquidPeerConnection.getPeersTableMap()
			const routingTable = LiquidPeerConnection.getRoutingTable()
			const useRoutingTable = LiquidPeerConnection.isRoutingTableActive()

			let visited_peers = message.visited_peers
			visited_peers.push(Liquid.getDeviceId())
			let reply_message = undefined
			// If we know the peer we reply directly positively
			if (peersTable.has(query) || (useRoutingTable && routingTable.has(query))) {
				reply_message = {
					operation: 'strategyMessage',
					sub_operation: 'reply',
					visited_peers: visited_peers,
					promiseId: message.promiseId,
					fromURL: {device:Liquid.getDeviceId()},
					to: message.fromURL,
					queryURL: message.queryURL,
					answer: true
				}
				Liquid.sendMessage(message.fromURL, reply_message)
			} else {
				/** We have no ieda about this peer --> ask our peers about it. */
				strategies.minimal_connection._spreadQueryMessageToPeers(message, visited_peers, peersTable)
			}
		},

		/**
		 * Spread the query message that we received to peers we are connected to.
		 */
		_spreadQueryMessageToPeers: function(message, visited_peers, peersTable) {
			// otherwise ask peer if they are already connected to it
			reply_counter.set(message.promiseId, {counter: 0, sent: 0}) // initialize this query id
			let new_query_message = {
				operation: 'strategyMessage',
				sub_operation: 'query',
				promiseId: message.promiseId,
				visited_peers: visited_peers,
				fromURL: {device:Liquid.getDeviceId()},
				to: undefined,
				queryURL: message.queryURL
			}
			let sent_counter = 0 // keeps track of the number of spreaded queries.
			for (let entry of peersTable.entries()) {
				// only send to peer if peer isn't already in message.visitedPeers.
				if (!message.visited_peers.includes(entry[0])) {
					if(debug) console.log(`\tAsking ${entry[0]} about ${message.queryURL}`)
					const url = {
						device: entry[0]
					}
					new_query_message.to = url
					Liquid.sendMessage(url, new_query_message)
					sent_counter += 1
					// increase the sent nb in the reply_counter
					let rc_sc = reply_counter.get(message.promiseId)
					rc_sc.sent = sent_counter
					reply_counter.set(message.promiseId, rc_sc)
				}
			}
			if(debug) console.log(`* query forwarded to: ${sent_counter} peers`)
			if(sent_counter > 0) {
				answerPool[message.promiseId] = message.fromURL
			} else {
				/* We haven't sent any spreaded messages (we have no other peers)
				*  Resolve this promise directly with negative answer.
				*/
				if(debug) console.log(`RESOLVED sent_counter == 0 reply to: ${message.fromURL.device} answer: false`)
				const reply_message = {
					operation: 'strategyMessage',
					sub_operation: 'reply',
					visited_peers: visited_peers,
					promiseId: message.promiseId,
					fromURL: {device:Liquid.getDeviceId()},
					to:message.fromURL,
					queryURL: message.queryURL,
					answer: false
				}
				Liquid.sendMessage(message.fromURL, reply_message)
			}
		},

		/**
		 * Received a reply for a previously sent query message.
		 * Check the answer, 
		 * 	if answer == false --> new connection
		 * 	else --> use the sender of this message as relay.
		 */
		_replyMessage: function(message) {
			if(debug) console.log(`Visited peers: ${message.visited_peers.toString()}`)

			if (message.answer == false) {
				// check how many negative reply we already got
				let rc = reply_counter.get(message.promiseId)
				rc.counter = rc.counter + 1
				reply_counter.set(message.promiseId, rc)
				// console.error(`PRE query:${message.queryURL} answer:${message.answer} from:${message.fromURL.device} message:`)
				if(rc.counter < rc.sent){
					// we should wait for answer from other peers before failing
					return
				} 
				// else if(rc.counter > rc.sent){
				// 	console.error('received more answer than we asked for.... Should not be possible')
				// 	return
				// } 
				else {
					// all peers answers are negative -> reject promise.
					const liquidURL = {
						device: message.queryURL
					}					
					const promise = promisePool[message.promiseId]
					if (promise) {
						/** There is a promise for this id -> resolve it */
						promise.reject(liquidURL)
						// promise.resolve(liquidURL)
						delete promisePool[message.promiseId]
					} else {
						/** 
						 *  There is no promise -> reply with a message
						 *  This case occures after we spreaded the query to our peers.
						 *  While waiting the source of the query was saved into answerPool
						 *  So get it from there and send a 'reply' with the negative answer
						 */
						const msg_fromURL = answerPool[message.promiseId]
						if (msg_fromURL) {
							const reply_message = {
								operation: 'strategyMessage',
								sub_operation: 'reply',
								visited_peers: message.visited_peers,
								promiseId: message.promiseId,
								fromURL: {device:Liquid.getDeviceId()},
								to:msg_fromURL,
								queryURL: message.queryURL,
								answer: false
							}
							Liquid.sendMessage(msg_fromURL, reply_message)
							delete answerPool[message.promiseId]
						}
					}
					//Mayebe TODO before deleting clear the interval if you ever do It
				}
			} else {
				const promise = promisePool[message.promiseId]
				/** We can save the value into our routing table for future uses. */
				LiquidPeerConnection.updateRoutingTableIfNeeded(message.queryURL, message.fromURL)
				if (promise) {
					promisePool[message.promiseId].resolve(message.fromURL)
					delete promisePool[message.promiseId]
				} else {
					/** 
					 * This case occures after we spreaded the query to our peers.
					 * While waiting the source of the query was saved into 
					 * answerPool. Get it from there and send a 'reply' 
					 * with the POSITIVE answer because there is no 
					 * promise -> reply with a message.
					 */
					const msg_fromURL = answerPool[message.promiseId]
					if (msg_fromURL) {
						const reply_message = {
							operation: 'strategyMessage',
							sub_operation: 'reply',
							visited_peers: message.visited_peers,
							promiseId: message.promiseId,
							fromURL: {device:Liquid.getDeviceId()},
							to: msg_fromURL,
							queryURL: message.queryURL,
							answer: true
						}
						Liquid.sendMessage(msg_fromURL, reply_message)
						delete answerPool[message.promiseId]	
					} else {
						console.warn(`${message.promiseId} not found in answerpool --> skip`)
					}
				}
				
			}
		}

	},
	full_graph: {
		choosePath: function(destination) {
			return new Promise((resolve) => {
				if(debug){
					console.log(`Checking path for dst: ${destination}`)
					console.log('Full graph strategy -> there is a direct connection')
				}
				const liquidURL = {
					device: destination
				}
				return resolve(liquidURL)
			})
		},

		receiveMessage: function(message){
			console.error(`TODO: received strategy message: ${message}`)
		}
	}
}