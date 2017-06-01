// liquidPeerConnection.js
// 


const LiquidPeerConnection = (function() {
	let __peer = undefined
	let __peersTable = new Map()			// key: deviceId
	let __liquidURLToEmitter = new Map()	// Stores emitter associated with liquidURL
											// the key format is "deviceId/compRef"
	let liquidStrategy = undefined
	let __variableToURLs = {}				// Stores the urls paired with a variable
	
	let __useRoutingTable					// use the routing table database
	/**
	 * Wether to package multiple B-cast messages going 
	 * via the same waypoint device into a single one.
	 */
	let __packageBroadcastMessages
	let __routingTable = new Map()			// Routing table storing known paths.

	let __messageStack = new Map()

	let __timingStats = undefined			// Map initialized when __shouldSaveTimingStats is set to true
	let __shouldSaveTimingStats = false
	let __YjsToPeerId = undefined 			// Map used in __timingStats

	let debug = true

	/**
	 * Sets up the required things for the provided peer
	 * 
	 * @param  {[type]} peer [description]
	 * @return {[type]}      [description]
	 */
	const _create = function(peer, strategy, useRoutingTable = true, packageBroadcastMessages = true) {
		return new Promise(function(resolve, reject) {
			// strategy = 'full_graph'
			// strategy = 'minimal_connection'
			console.log(`LPC startegy:${strategy} routingtable:${useRoutingTable} packaged_bcast:${packageBroadcastMessages}`)
			if(!useRoutingTable && packageBroadcastMessages) {
				/** Using packaging without a routing table currenlty does not support > 3 devices in series */
				console.error('PROBLEM!!!! No Routing Table with packeged messages does not work when > 3 devices are in serie')
			}
			liquidStrategy = new LiquidStrategy(strategy)
			__useRoutingTable = useRoutingTable
			__packageBroadcastMessages = packageBroadcastMessages
			if (debug) console.log(`LPC routingTable:${__useRoutingTable} packageBCast:${__packageBroadcastMessages}`)
			__peer = peer
			__peer.on('open', _peerOpen)
			__peer.on('connection', _peerNewConnection)
			__peer.on('close', _peerClose)
			__peer.on('disconnected', _peerDisconnect)
			__peer.on('reconnect', _peerReconnect)
			__peer.on('error', _peerError)
		})
	}

	/**
	 * Get the next hop to use for reaching the given deviceId.
	 * Checks whether or not to use the routing table.
	 * - if yes the use it first and update it.
	 * - else ask liquidStrategy each time.
	 */
	const _getNextHopToDevice = function(deviceId) {
		return new Promise(function(resolve, reject) {
			if (!__useRoutingTable) {
				// don't use the routing table -> ask liquidStrategy for path
				liquidStrategy.choosePath(deviceId).then(dst_url => {
					resolve(dst_url)
				}).catch(dst_url => {
					reject(dst_url)
				})
			} else {
				// first check the routing table and if fails fall back to liquidStrategy.
				let next_hop = __routingTable.get(deviceId)
				if (!next_hop) {
					liquidStrategy.choosePath(deviceId).then(dst_url => {
						/* Save the result into the routing table if activated. */
						__routingTable.set(deviceId, dst_url)
						resolve(dst_url)
					}).catch(dst_url => {
						reject(dst_url)
					})
				} else {
					resolve(next_hop)
				}
			}
		})
	}

	/**
	 * Get the next hops to use for reaching all the devices that are connected 
	 * with us in some way (with or without the use of relay waypoint) This 
	 * is asynchronus so it will return a Promise for a Map object 
	 * with the final destination as the key and the nextHop 
	 * and whether a connection exists as the enrty.
	 * 
	 * @return Promise Map key: final destination, entry: {nextHop, connection exists}
	 */
	const _getNextHopToAllDevices = function() {
		return new Promise(function(resolve, reject) {
			const devicesObjects = Liquid.getDevicesList()
			let devices = Object.keys(devicesObjects).map((k) => devicesObjects[k])
			// remove ourself from the devices
			const currentId = Liquid.getDeviceId()
			devices.splice(devices.findIndex(function(el) {
				if (currentId == el.device){
					return true
				}
				return false
			}), 1)

			/** 
			 * We first resolve all the destinations waypoint
			 * Then we map them into a Map with key: final_target
			 * That we eventually return
			 */
			let requests = devices.map((item) => {
				return new Promise((resolve) => {
					_getNextHopToDevice(item).then(dst_url => {
						resolve({waypoint:dst_url, final_target:item, connectionExists: true})
					}).catch(dst_url => {
						resolve({waypoint:dst_url, final_target:item, connectionExists: false})
					})
				})
			})
			Promise.all(requests).then(values => {
				let nextHops = new Map()
				values.map(item => {
					if(item.connectionExists) {
						nextHops.set(item.final_target, item.waypoint)
					}
				})
				// return nextHops
				resolve(nextHops)
			})
		})
	}

	/**
	 * Sends the given message to the given URL 
	 * using a webRTC connection if possible.
	 * 
	 * @param  {[type]} toURL   [description]
	 * @param  {[type]} message [description]
	 * @return {boolean}        boolean value indicating if the message was successfully 
	 *                          transmitted with the webRTC connection.
	 */
	const _send = function(toURL, message) {
		if(message.operation == 'yMessage'){
			_saveTimingStats(message, 'out')
		}
		return new Promise(function(resolve, reject){
			_getNextHopToDevice(toURL.device).then(dst_url => {
				/** 
				 * Are we using a relay peer? YES: wrap the message into a relay message 
				 * Also we can save this relay as the one for 
				 * reaching toURL in the routing table.
				 */
				if (dst_url.device != toURL.device) {
					/* Wrapping the message */
					const wrapped_msg = {
						operation: 'relay',
						from: Liquid.getDeviceId(), 
						to: dst_url,
						content: message
					}
					message = wrapped_msg
				}
				// If the webRTC connection was already created
				if (__peersTable.has(dst_url.device)) {
					let peer = __peersTable.get(dst_url.device)

					// if the connection is there and open
					if (peer.open) {
						peer.send(message)
						return resolve(`connection with peer ${peer} was open -> msg sent.`)
					} else {
						// The connection is there but is closed
						// TODO attempt to reconnect
						console.log('peer.open == false')
						console.log('TODO: re-open the connection!!!!!!')
						peer.send(message)
						// return reject(console.log(`TODO fix: peer.open = false [LPC._send()] __peersTable.has(${dst_url.device})`))
						return reject(new Error(`TODO fix: peer.open = false [LPC._send()] __peersTable.has(${dst_url.device})`))
					}
				} else {
					/* The peer hasen't been connected yet */
					_connectIfNeededAndThenSend(dst_url.device, message, resolve)
				}
			}).catch(dst_url => {
				/* The peer hasen't been connected yet */
				_connectIfNeededAndThenSend(dst_url.device, message, resolve)
			})
		})
	}

	/**
	 * Try to connect with the given dst_id and then send the given message.
	 * If we are already in the process of opening this connection, we 
	 * add the message to a stack that will be emptied once 
	 * the first connect is finished.
	 */
	const _connectIfNeededAndThenSend = function(dst_id, message, resolve) {
		if(!__messageStack.has(dst_id)){
			_connect(dst_id, function(){
				__peersTable.get(dst_id).send(message)
				__messageStack.get(dst_id).forEach(function(msg) {
					__peersTable.get(dst_id).send(msg)
				}, this)
				__messageStack.delete(dst_id)

				return resolve(`connection with peer ${dst_id} was open -> all msg in stack sent.`)
			})
		} else {
			__messageStack.get(dst_id).push(message)
		}
	}

	/**
	 * Relays the given message to it's destination. Either by
	 * sending it directly or by passing it to the next relay
	 */
	const _relay = function(message) {
		// check if we are the destionation and if yes unwrap the message
		const unwrapped_message = message.content
		const destination = unwrapped_message.to

		if (destination.device == Liquid.getDeviceId()){
			Liquid.sendMessage(destination, unwrapped_message)
		} else {
			// get the next hop from the liquidStrategy
			// TODO: we should use _getNextHopToDevice instead of asking LS.choosePath ???
			// _getNextHopToDevice(destination.device).then()
			liquidStrategy.choosePath(destination.device).then(next_relay => {
				// update the hops trace to include this device
				let hops = unwrapped_message.hops || []
				hops.push(Liquid.getDeviceId())
				unwrapped_message.hops = hops
				
				// Wrap the message into a new relay message
				const wrapped_message = {
					operation: 'relay',
					from: message.to,
					to: next_relay,
					content: unwrapped_message
				}
				// Send the wrapped message to the next hop
				Liquid.sendMessage(next_relay, wrapped_message)
			}).catch(next_relay => {
				console.error('PROBLEM: Promise rejected for next relay! This should not happen...')
				console.error(`dst:${destination.device} next_relay:${next_relay.device} messageFrom:${message.from} to:${message.to.device} wrappedFrom:${unwrapped_message.from.device} to:${unwrapped_message.to.device}`)
			})
		}
	}

	const _peerOpen = function(id) {
		console.log(`Peer: opened connection with server: ${id}`)
	}

	const _peerNewConnection = function(conn) {
		console.log(`_peerNewConnection: for:${conn.peer}`)
		conn.on('open', _connectionOnOpen.bind(conn))
		conn.on('data', _connectionOnData.bind(conn))
		conn.on('close', _connectionOnClose.bind(conn))
		conn.on('error', _connectionOnError.bind(conn))

		__peersTable.set(conn.peer, conn)
	}

	const _peerClose = function(conn) {
		console.log(`Peer: closed connection with server ${conn}`)
		console.log('_peerClose: TODO')
		console.error('peer connection was closed')
	}

	const _peerDisconnect = function() {
		console.log('_peerDisconnect: TODO')
		console.error('peerconnection was disconnected')
	}

	const _peerReconnect = function() {
		console.error('TODO: peer.reconnect...')
	}

	const _peerError = function(err) {
		console.error(`_peerError: TODO: ${JSON.stringify(err)}`)
		// console.error(err)
	}

	/**
	 * Connects the current device with the one corresponding to the provided deviceId
	 * 
	 * @param  {[type]} deviceId [description]
	 * @param  {[type]} success  [description]
	 * @return {[type]}          [description]
	 */
	const _connect = function(deviceId, success) {
		__messageStack.set(deviceId, [])
		if (__peer && !__peersTable.has(deviceId)) {
			const conn = __peer.connect(deviceId, {
				metadata: {
					from: Liquid.getDeviceId(),
					to: deviceId
				}
			})
			
			conn.on('open', function() {
				console.log('_connect -> on.open')
				__peersTable.set(deviceId, conn)
				
				if (success) {
					success()
				}
			})

			conn.on('data', _connectionOnData.bind(conn))
			conn.on('close', _connectionOnClose.bind(conn))
			conn.on('error', _connectionOnError.bind(conn))

		} else if (__peer && __peersTable.has(deviceId)){
			const conn = __peer.connect(deviceId, {
				metadata: {
					from: Liquid.getDeviceId(),
					to: deviceId
				}
			})
			
			conn.on('open', function() {
				console.log('_connect -> on.open')
				__peersTable.set(deviceId, conn)
				
				if (success) {
					success()
				}
			})

			conn.on('data', _connectionOnData.bind(conn))
			conn.on('close', _connectionOnClose.bind(conn))
			conn.on('error', _connectionOnError.bind(conn))

			console.log(`${deviceId} is already in __peersTable`)
			console.error(`${deviceId} is already in __peersTable`)
		} else {

			console.log(`${deviceId} problem should not end up here but still...`)
			console.error(`${deviceId} problem should not end up here but still...`)
		}
	}

	const _peerConnectionData = function(data) {
		Liquid.incomingMessage(data)
	}

	const _peerConnectionClose = function() {
		console.error('_peerConnectionClose: TODO')
	}

	const _connectionOnOpen = function() {
		if (debug) console.log(`(todo?)_connectionOnOpen peer: ${this.peer}`)
	}

	const _peerConnectionError = function(err) {
		console.log(`_peerConnectionError: TODO: ${JSON.stringify(err)}`)
		console.error('PeerConnectionError!!!!')
	}

	const _connectionOnData = function(data){
		// console.log('LPC->_connectionOnData->forward to Liquid.incomingMessage()')
		Liquid.incomingMessage(data)
	}

	const _emitBindDisconnectEvent = function(lost_peer) {
		for(let item in __variableToURLs) {
			let liquidURLs = __variableToURLs[item]
			if (debug) console.log(`BEFORE removeVar item: ${item} asd:${JSON.stringify(liquidURLs)}`)
			for(let liquidURL of liquidURLs) {
				if (liquidURL.device == lost_peer) {
					const key = `${Liquid.getDeviceId()}/${item}`
					const emitter = __liquidURLToEmitter.get(key)
					if (debug) console.log(`FOUND EMITTER FOR LOST VARIABLE! unregister ${JSON.stringify(liquidURL)}`)
					_removeVariableFromVarToURLs(liquidURL, liquidURL)
					emitter.emitEvent('bind-disconnect', [liquidURL])
				}
			}
			if (debug) console.log(`AFTER removeVar item: ${item} asd:${JSON.stringify(__variableToURLs[item])}`)
		}
	}

	const _connectionOnClose = function(){		
		if(debug) console.log(`removing ${this.peer} from __peersTable`)
		const lost_peer = this.peer
		__peersTable.delete(lost_peer)
		_emitBindDisconnectEvent(lost_peer)

		if (debug) console.log('routing table before:')
		if (debug) console.log(__routingTable)
		/*
		 * If there is a routing table LPC needs to remove the key
		 * but first we propagate the update to the other peers.
		 */
		const update_msg = {
			from: Liquid.getDeviceId(),
			to: NaN,
			operation: 'updateRoutingTable',
			visited_peers: [Liquid.getDeviceId()],
			lost_peer: lost_peer
		}
		_broadcastPeerFromRoutingTableUpdate(update_msg)
		_deletePeerFromRoutingTable(lost_peer)
		/*
		 * It the strategy's job to handle more abvanced features of the 
		 * disconnect and for example deal with the reconnections.
		 */
		liquidStrategy.disconnect(lost_peer)
	}

	/**
	 * Deletes the given peerId from the routing table
	 * @param idToDelete	peerId
	 */
	const _deletePeerFromRoutingTable = function(idToDelete) {
		__routingTable.forEach(function(value, key) {
			if(key == idToDelete) {
				// we can delete this entry as this peer disapeared
				// this should already have been done by LPC...
				if (debug) console.log(`deleting key: ${key}`)
				__routingTable.delete(key)
			}
		})
	}

	/**
	 * Broadcast to other peers the update RT message. Will only spread it if 
	 * we use a routing table and if the current peer has the peer 
	 * to delete inside its routingTable.
	 * @param update_msg	LiquidMessage 
	 */
	const _broadcastPeerFromRoutingTableUpdate = function(update_msg) {
		let rtContainsPeerId = false
		__routingTable.forEach(function(value, key) {
			if(key == update_msg.lost_peer) {
				// our RT contains peerId
				rtContainsPeerId = true
			}
		})
		if (rtContainsPeerId) {
			/** 
			 * Only spread update if the routingTable has the peerId 
			 * And if the message didn't already passed through
			 */
			if(debug) console.log('broadcast RT update message:')
			let counter = 0
			for(let entry of __peersTable.entries()) {
				if (!update_msg.visited_peers.includes(entry[0])) {
					if(debug) console.log(`*\tAsking ${entry[0]} to remove ${update_msg.lost_peer}`)
					counter += 1
					const url = {
						device: entry[0]
					}
					Liquid.sendMessage(url, update_msg)
				}
			}
			if(debug) console.log(`*\tUpdate broadcasted to ${counter} peer(s).`)
		}
	}

	/**
	 * Removes the peer contained inside the update_msg (lost_peer) 
	 * and spread the updates to other peers.
	 */
	const _updateRoutingTableMessage = function(update_msg) {
		// continue to spread the update message further if needed
		if(debug) console.log(`received updateRTmsg: ${JSON.stringify(update_msg)}`)
		_emitBindDisconnectEvent(update_msg.lost_peer)
		_broadcastPeerFromRoutingTableUpdate(update_msg)
		_deletePeerFromRoutingTable(update_msg.lost_peer)
	}

	const _connectionOnError = function(){
		console.error('########### _connectionOnError... TODO')
	}

	/**
	 * Subscribe a liquidURL and its emitter
	 * 
	 * @param  {[type]} liquidURL [description]
	 * @param  {[type]} emitter   [description]
	 * @return {[type]}           [description]
	 */
	const _subscribe = function(variableName, liquidURL, emitter) {
		if(debug) console.log(`LPC -> _subscribe() ${liquidURL.device}/${liquidURL.componentRef}/${variableName}`)
		__liquidURLToEmitter.set(`${liquidURL.device}/${liquidURL.componentRef}/${variableName}`, emitter)
	}

	const _setShouldSaveTimingStats = function(bool) {
		if(__shouldSaveTimingStats){
			__shouldSaveTimingStats = false
			if(debug) {
				console.log('__shouldSaveTimingStats = false')
				console.log('reseted __timingStats')
			}
			__timingStats = undefined
		}else{
			__shouldSaveTimingStats = true
			__timingStats = new Map()
			__YjsToPeerId = new Map()
			if (debug) console.log('__shouldSaveTimingStats = true')
		}
	}

	/**
	 * Computes the size in bytes of the given object
	 * source: https://gist.github.com/zensh/4975495
	 * @param obj			object you want the size of
	 * @param formatted		bool	whether you want [ bytes, KiB, MiB, GiB] appended
	 */
	const _memorySizeOf = function(obj, formatted) {
		var bytes = 0

		function sizeOf(obj) {
			if(obj !== null && obj !== undefined) {
				switch(typeof obj) {
				case 'number':
					bytes += 8
					break
				case 'string':
					bytes += obj.length * 2
					break
				case 'boolean':
					bytes += 4
					break
				case 'object':
					var objClass = Object.prototype.toString.call(obj).slice(8, -1)
					if(objClass === 'Object' || objClass === 'Array') {
						for(var key in obj) {
							if(!obj.hasOwnProperty(key)) continue
							sizeOf(obj[key])
						}
					} else bytes += obj.toString().length * 2
					break
				}
			}
			return bytes
		}

		if (formatted){
			return _formatByteSize(sizeOf(obj))
		}else{
			return sizeOf(obj)
		}
	}

	const _formatByteSize = function(bytes) {
		if(bytes < 1024) return bytes + " bytes"
		else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB"
		else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB"
		else return(bytes / 1073741824).toFixed(3) + " GiB"
	}

	/**
	 * Computes the speed givven start & end time as well as size.
	 * @param startTime
	 * @param endTime
	 * @param size
	 * @param formated	bool 	default=true 	wether or not to append MB/s 
	 * @return number or [formated string xx MB or Kb or B / s]
	 */
	const _compute_speed = function(startTime, endTime, size) {
		let speedBps = _compute_speed_in_bytes(startTime, endTime, size)
		let speedKbps = (speedBps / 1024).toFixed(2)
		let speedMbps = (speedKbps / 1024).toFixed(2)
		
		if(formatted) {
			if(speedMbps > 1) {
				return `${speedMbps} MB/s` 
			} else if (speedKbps){
				return `${speedKbps} KB/s`
			} else {
				return `${speedBps} B/s`
			}
		}
	}

	const _compute_speed_in_bytes = function(startTime, endTime, size) {
		let duration = (endTime - startTime) / 1000
		let bitsLoaded = size * 8
		let speedBps = (bitsLoaded / duration).toFixed(2)
		return speedBps
	}



	/**
	 * Save the time of the given message in order to be able to get transfer speed statistics.
	 * @param yMessage
	 * @param direction		in/out	descript is the message is being received or sent
	 */
	const _saveTimingStats = function(yMessage, direction) {
		if(__shouldSaveTimingStats) {
			const currentTime = Date.now()
			const pl = yMessage.payload
			if (pl && pl.ops){
				const id = pl.ops[0].id
				const sequence = id[1]
				if(debug) console.log(`${direction}\t | time:${currentTime} id:${id} to:${yMessage.to.device}`)
				// console.log(yMessage)
				// console.log(JSON.stringify(yMessage))
				if (direction == 'out') {
					let timings = [[id, currentTime]]
					const size = _memorySizeOf(yMessage, false)
					__timingStats.set(sequence, {size:size, timings:timings})
					__YjsToPeerId.set()
				} else if (direction == 'in'){
					let obj = __timingStats.get(sequence)
					if (obj && obj.timings){
						obj.timings.push([id, currentTime])
						__YjsToPeerId.set(id, yMessage.from.device)
						if(debug) _printTimings()
					}
				}
			}
		}
	}

	const _printTimings = function() {
		__timingStats.forEach(function(value, key) {
			if(value.timings.length > 1) {
				const timings = value.timings
				const start_time = timings[0][1]
				let reply_speeds = []
				for(let i=1; i<timings.length; i++) {
					let rep_time = timings[i][1]
					let delta = rep_time-start_time
					reply_speeds.push(_compute_speed_in_bytes(start_time, rep_time, value.size))
				}
				console.log(`${key}\tsize:${_formatByteSize(value.size)} \tspeeds:${reply_speeds}`)
			}
		})
	}

	const _incomingYMessage = function(message) {
		const currentTime = Date.now()
		_saveTimingStats(message, 'in')
		
		if(message.receivers){
			/**
			 * If there are receivers we loop through all of them and extract
			 * the one destined to us and process it. Once done we remove 
			 * it from the receivers list and broadcast the 
			 * message to the rest of the receivers.
			 */
			let receivers = message.receivers
			let index = receivers.findIndex((liquidURL) => {
				if(liquidURL.device == Liquid.getDeviceId()) {
					return true
				} else return false
			})
			
			if (index >= 0) {
				/* this is for us, process it and remove ourself from the receivers */
				let msg_for_us = message
				msg_for_us.to = receivers[index]
				_deliverYMessage(msg_for_us)
				receivers.splice(index, 1)
			}
			if (receivers.length > 0) {
				let msg = message
				msg.receivers = receivers
				_broadcastPackagedMessage(message.payload, message.from, receivers)
			}
		} else {
			_deliverYMessage(message)
		}
	}

	/**
	 * Deliver a yMessage by sending it to its corresponding component or emitter
	 * @param message yMessage to deliver
	 */
	const _deliverYMessage = function(message) {
		const op = message.payload.operation
		if(op) {
			if(op == 'unregister') {
				const fromURL = message.from
				const toURL = message.to
				_unregisterPairedVariable(fromURL, toURL)
			} 
		} else {
			const emitter = __liquidURLToEmitter.get(`${message.to.device}/${message.to.componentRef}/${message.to.variable}`)
			if (emitter) {
				emitter.emitEvent('y-message', [message.from, message])
			} else {
				if (debug) console.warn(`emitter not registered yet for ${message.from.device}. Fallback to Liquid.getComponent()`)
				const cmp = Liquid.getComponent(message.to)
				if(cmp){
					cmp.receiveYMessage(message)
				}else{
					if (debug) console.error('TODO: component undefined... probably have to re-clone the cmp.')
				}
			}
		}
	}

	const _registerPairedVariable = function(fromURL, toURL) {
		const key = `${fromURL.componentRef}/${fromURL.variable}`

		if (!_variableToURLsContains(key, toURL)) {
			_addUrlToVariable(fromURL, toURL)
			_notifyAboutOtherPairedVariables(fromURL, toURL)
		}
	}

	/**
	 * Unregisters the previsouly paired varible. Executed 
	 * when on other peer unregisters itself.
	 */
	const _unregisterPairedVariable = function(fromURL, toURL) {
		if(debug)console.log(`_unregister fromUrl:${JSON.stringify(fromURL)} toURL:${JSON.stringify(toURL)}`)
		_removeVariableFromVarToURLs(toURL, fromURL)
		const emitter = __liquidURLToEmitter.get(`${toURL.device}/${toURL.componentRef}/${toURL.variable}`)
		if (emitter) {
			emitter.emitEvent('bind-disconnect', [fromURL])
		} else {
			console.error(`PROBLEM no emitter for: ${toURL.device}/${toURL.componentRef}/${toURL.variable}`)
		}
	}

	/**
	 * Unregisters the previsouly paired varible. Executed 
	 * when we remove the variable ourself locally.
	 */
	const _unregisterLocalPairedVariable = function(variableURL) {
		if(debug)console.log(`_unregisterLocal varURL:${JSON.stringify(variableURL)}`)
		_removeURLFromVarToURLs(variableURL)
	}

	/**
	 * Notify toURL about other previously paired variables
	 * 
	 * @param  {[type]} fromURL [description]
	 * @param  {[type]} toURL   [description]
	 * @return {[type]}         [description]
	 */
	const _notifyAboutOtherPairedVariables = function(fromURL, toURL) {
		const key = `${fromURL.componentRef}/${fromURL.variable}`
		let message = {
			operation: 'otherPairedVariables',
			from: fromURL,
			to: toURL,
			pairedVariables: __variableToURLs[key]
		}
		Liquid.sendMessage(toURL, message)
	}

	/**
	 * Compares the two given liquidURLs and returns true if both 
	 * the device and componentRef are the same, false otherwise
	 * 
	 * @param  {liquidURL} aURL [description]
	 * @param  {liquidURL} bURL [description]
	 * @return {boolean}      	[description]
	 */
	const liquidUrlsAreEqual = function(aURL, bURL) {
		if (aURL.device == bURL.device) {
			if (aURL.componentRef == bURL.componentRef) {
				return true
			}
		}
		return false
	}

	const _variableToURLsContains = function(key, url) {
		if (!__variableToURLs[key]) {
			return false
		}

		for (let saved_url of __variableToURLs[key]) {
			if (url.device == saved_url.device) {
				if (url.componentRef == saved_url.componentRef) {
					if (url.variable == saved_url.variable) {
						return true
					}
					// return true
				}
			}
		}
		return false
	}

	/**
	 * Adds the given url to the __variableToURLs[]
	 * @param url	liquidURL
	 * @param value	variable
	 */
	const _addUrlToVariable = function(url, value) {
		const key = `${url.componentRef}/${url.variable}`
		// just a check to avoid adding multiple time the same
		if (!_variableToURLsContains(key, value)) {
			__variableToURLs[key] = __variableToURLs[key] || []
			__variableToURLs[key].push(value)
		}
	}

	/**
	 * Remove the item from __variableToURLs corresponding 
	 * to the given url that match the given value.
	 * @param url	liquidURL
	 * @param value	liquidURL
	 */
	const _removeVariableFromVarToURLs = function(url, value) {
		let key = `${url.componentRef}/${url.variable}`
		let arr = __variableToURLs[key]
		if (arr) {
			arr.splice(arr.findIndex(function(el) {
				if (value.device == el.device){
					if(value.componentRef == el.componentRef) {
						if (value.type == el.type && value.variable == el.variable){
							// console.warn(`value:${JSON.stringify(value)} ?= el:${JSON.stringify(el)} => true`)
							return true
						}
					}
				}
				// console.warn(`value:${JSON.stringify(value)} ?= el:${JSON.stringify(el)} => false`)
				return false
			}), 1)
			/* make sure to delete any reference if the array is empty */
			if (arr.length > 0){
				__variableToURLs[key] = arr
			} else {
				delete __variableToURLs[key]
			}
		} else {
			const key = `${url.componentRef}/${url.variable}`
			arr = __variableToURLs[key]

			if(debug)console.log(`TODO?: removeVarTO....  key: ${key}`)
			if(debug)console.log(JSON.stringify(__variableToURLs))
		}
	}

	/**
	 * Delete all items from __variableToURLs corresponding 
	 * to the key made from the given url.
	 * @param url	liquidURL
	 */
	const _removeURLFromVarToURLs = function(url) {
		let key = `${url.componentRef}/${url.variable}`
		if(debug)console.log(`_removeURLFromVarToURLs delete key:${key}`)
		delete __variableToURLs[key]
	}

	const _pairOtherVariables = function(message) {
		for (let url of message.pairedVariables) {
			const key = `${message.to.componentRef}/${message.to.variable}`
			if (liquidUrlsAreEqual(url, message.to)){
				/*
				 * If this url is the current as we don't want to connect a 
				 * variable with itself but save the other side to 
				 * __variableToURLs if it isn't already saved
				 */
				if ( !LiquidPeerConnection.variableToURLsContains(key, message.from)) {
					LiquidPeerConnection.addUrlToVariable(message.to, message.from)
				}
				continue
			}
			if (!LiquidPeerConnection.variableToURLsContains(key, url)) {
				let fromURL = message.to
				
				let msgFrom = {
					from: fromURL,
					to: url,
					operation: 'pairFromVariable',
				}
				let msgTo = {
					from: fromURL,
					to: url,
					operation: 'pairToVariable',
				}
				
				if(debug)console.log(`SENDING PAIR MESSAGES 1:${fromURL.device}/${fromURL.componentRef}  2:${url.device}/${url.componentRef}`)
				Liquid.sendMessage(fromURL, msgFrom)
				Liquid.sendMessage(url, msgTo)

				if (!liquidUrlsAreEqual(fromURL, message.to)) {
					LiquidPeerConnection.addUrlToVariable(fromURL.componentRef, message.to)
				}
			}
		}
	}

	/**
	 * Returns the peersTable
	 */
	const _getPeersTableMap = function() {
		return __peersTable
	}

	/**
	 * Returns the timingStats in a JSON array
	 */
	const _getTimingStats = function() {
		// get the number of reply speeds
		if(debug) console.log('Reteiving timingStats...')
		let max_nb_reply = 0
		__timingStats.forEach(function(value, key) {
			if(value.timings.length > max_nb_reply) {
				max_nb_reply = value.timings.length
			}
		})
		
		let data = []
		let index = 0
		__timingStats.forEach(function(value, key) {
			if(value.timings.length > 0) {
				const timings = value.timings
				const start_time = timings[0][1]
				let reply_speeds = []
				for(let i=1; i<timings.length; i++) {
					let rep_time = timings[i][1]
					let peerId = __YjsToPeerId.get(timings[i][0])
					let delta = rep_time-start_time
					if(debug) console.error(`delta for peer ${timings[i][0]}: ${delta}`)
					reply_speeds.push([peerId, _compute_speed_in_bytes(start_time, rep_time, value.size)])
				}
				
				data.push(reply_speeds)
				index += 1
			}
		})
		if(debug){
			console.log('__timingStats:')
			console.log(__timingStats)
			console.log('timingStats data is:')
			console.log(data)
		}
		return data
	}

	/**
	 * Returns the routing table
	 */
	const _getRoutingTable = function() {
		return __routingTable
	}

	/**
	 * Checks whether or not the routing table are used.
	 * @return true is we use them false otherwise
	 */
	const _isRoutingTableActive = function() {
		return __useRoutingTable
	}

	/**
	 * Checks whether or not to save the update timing stats.
	 */
	const _isSaveTimingStatsActive = function() {
		return __shouldSaveTimingStats
	}

	/**
	 * Checks whether or not we should packed broadcast messages
	 * going via a comon peer into a single message.
	 */
	const _shouldPackageBroadcastMessages = function() {
		return __packageBroadcastMessages
	}

	/**
	 * Broadcast the given yMessage using unicast for 
	 * messages going through the same waypoint peer
	 * @param yMessage		the message to broadcast
	 * @param fromURL		origin URL of the message
	 * @param destinations	the destinations of the broadcast
	 */
	const _broadcastPackagedMessage = function(yMessage, fromURL, destinations) {
		/** We first resolve all the destinations waypoint */
		let requests = destinations.map((item) => {
			return new Promise((resolve) => {
				_getNextHopToDevice(item.device).then(dst_url => {
					resolve({waypoint:dst_url, url:item})
				})	
			})
		})
		/** Once we have all the waypoints, we combine the ones with the same waypoint */
		Promise.all(requests).then(values => {
			let destinationsMap = new Map()
			values.map(item => {
				const key = `${item.waypoint.device}`				
				if (!destinationsMap.get(key)){
					destinationsMap.set(key, [])
				}
				let array = destinationsMap.get(key)
				array.push(item.url)
				destinationsMap.set(key, array)
			})
			return destinationsMap
		}).then(destinationsMap => {
			/** Finally send 1 single message to all the combined waypoint. */
			destinationsMap.forEach((receivers, key) => {
				if(receivers.length > 1) {
					const waypoint = {
						device: key
					}
					const message = {
						operation: 'yMessage',
						receivers: receivers,
						payload: yMessage,
						from: fromURL,
						to: waypoint
					}
					Liquid.sendMessage(waypoint, message)
				} else {
					/** If there is only one receiver we can send it without packaging */
					const n_message = {
						operation: 'yMessage',
						payload: yMessage,
						from: fromURL,
						to: receivers[0]
					}
					Liquid.sendMessage(receivers[0], n_message)
				}
			})
		})
	}

	/**
	 * Update the routing table with the given deviceId and relayURL if we 
	 * are using a routingTable and it doesn't already contains it.
	 * @param deviceId	destination id
	 * @param relayURL	relay id
	 */
	const _updateRoutingTableIfNeeded = function(deviceId, relayURL) {
		if (__useRoutingTable && !__routingTable.has(deviceId)) {
			/** We are using a routing table
			 *  deviceId not save yet.
			 */
			if (debug) console.log(`LPC_updateRoutingTable query: ${deviceId}  relay:${relayURL.device}`)
			__routingTable.set(deviceId, relayURL)
		}
	}

	const _strategyMessage = function(message) {
		/** Sneak peek into the strategy message to add routing
		 * table data from received strategy messages.
		*/
		if(message.sub_operation == 'reply' && message.answer == true) {
			const fromURL = message.fromURL
			const query = message.queryURL
			_updateRoutingTableIfNeeded(query, fromURL)
		}
		liquidStrategy.receiveMessage(message)
	}

	/*
		----------------------------------------
		Stuff used for the stats component that should be present on all devices.
		----------------------------------------
	 */
	
	/**
	 * Transform the given object into an array of values
	 * @param  {[type]} obj [description]
	 * @return {[type]}     [description]
	 */
	var _toArray = function(obj) {
		return Object.keys(obj).map(function(key) {
			return {
				name: key,
				value: obj[key]
			}
		})
	}

	/**
	 * Transform the __peersTable into something that can be sent via PeerJS.
	 * Only take relevant information out of it.
	 * @return {[type]} [description]
	 */
	var _generateSendableConnList = function() {
		let data = _toArray(__peersTable)
		let conns = []
		for (var i = 0; i < data.length; i++) {
			let from = data[i].value.metadata.from
			let to = data[i].value.metadata.to
			let status = data[i].value.open
			let browser = data[i].value._peerBrowser
			let speed1 = 0
			let speed2 = 0
			let conn = {from, to, status, browser, speed1, speed2}
			conns.push(conn)
		}
		return conns
	}
	
	/**
	 * Called when a getConnectoinList request is received.
	 * Generates a list of all established connections
	 * from this device and sent it back to sender.
	 * @param  {[type]} message [description]
	 * @return {[type]}         [description]
	 */
	const _incomingGetConnectionsList = function (message) {
		console.log('GOT _incomingGetConnectionsList REQUEST')
		var fromUrl = message.from
		// var target = message.target

		var data = _generateSendableConnList()
		// var encodedString = btoa(string);
		// var data = _toArray(_getConnectionsList())
		Liquid.sendMessage(fromUrl, {
			operation: 'getConnectionsListReply',
			from: Liquid.getDeviceId(),
			to: fromUrl,
			data: data
		})
	}

	const _incomingGetConnectionsListReply = function(message) {
		console.log('GOT _incomingGetConnectionsListReply REPLY')
		var messageTo = message.to
		// var fromURL = message.from
		// _getComponent(messageTo).receiveConnectionsList(message)
		// let key = `${messageTo.device}/${messageTo.componentRef}`
		// __liquidURLToEmitter.get(key).receiveConnectionsList(message)
		Liquid.getComponent(messageTo).receiveConnectionsList(message)
	}

	const _bandwidthTest = function (message) {
		const endTime = Date.now()
		// const delta = (endTime - message.start)
		// const downloadSize = message.dataSize

		// Time estimation of the transmission
		let duration = (endTime - message.start) / 1000
		let reply_opreation = message.operation
		if (message.operation == 'bandwidthTest') reply_opreation = 'bandwidthTestReply'
		else if(message.operation == 'bandwidthTest2') reply_opreation = 'bandwidthTestReply2' 
		// Now send back the message to the sender
		let toURL = message.from
		let fromURL = message.to
		let message2 = {
			from: fromURL,
			to: toURL,
			target: {
				device: toURL.device
			},
			operation: reply_opreation,
			connectionId: message.connectionId,
			start: Date.now(),
			duration: duration,
			dataSize: message.dataSize,
			data: message.data
		}
		Liquid.sendMessage(toURL, message2)
	}

	const _bandwidthTestReply = function (message) {
		let endTime = Date.now()
		let duration = (endTime - message.start) / 1000

		let component_to = Liquid.getComponent(message.to)		
		component_to.receive_connection_speed_results(message, duration)
	}

	/**
	 * Method called when receiving a ping request from an other peer.
	 * Replies simply to the sender and adds the locale time current 
	 * local time (WARNING: uses 2 different michine time)
	 */
	const _pingTest = function(message) {
		let endTime = Date.now()
		let duration = (endTime - message.start) / 1000
		// Now send back the message to the sender
		let toURL = message.from
		let fromURL = message.to
		let reply_opreation = message.operation
		if (message.operation == 'pingTest') reply_opreation = 'pingTestReply'
		else if(message.operation == 'pingTest2') reply_opreation = 'pingTestReply2'
		
		let message2 = {
			from: fromURL,
			to: toURL,
			target: {
				device: toURL.device
			},
			operation: reply_opreation,
			connectionId: message.connectionId,
			start: message.start,
			start_reply: Date.now(),
			duration: duration,
		}
		Liquid.sendMessage(toURL, message2)
	}

	/**
	 * Ping request received back. Computes the difference between
	 * initial request time and now and updates the ping field.
	 */
	const _pingTestReply = function(message) {
		let endTime = Date.now()
		let duration = (endTime - message.start)
		// let messageTo = message.to
		let component_to = Liquid.getComponent(message.to)		
		component_to.receive_ping_results(message, duration)
	}

	/**
	 * Trace a request by adding the hops from the source to the destination 
	 * in an array and then back to the source. When the request 
	 * reaches back the source, the array will contain 
	 * all the hops to and from the destination.
	 * @deprecated Trace is now included in all messages by default 
	 * you can use ping instead and look for the visited_peers.
	 */
	const _trace = function(message) {
		const currentId = Liquid.getDeviceId()
		if(message.to.device == currentId) {
			// we are the final destination of this trace request
			// swap source and destination
			const tmp = message.from
			message.from = message.to
			message.to = tmp

			// update the hops to include this device
			let hops = message.hops || []
			hops.push(currentId)
			message.hops = hops

			// change the operation type to a traceReply
			message.operation = 'traceReply'

			// reply back to the source of the trace
			Liquid.sendMessage(message.to, message)
		} else {
			// we are a hop for this trace. This should NEVER HAPPEN
			console.error('PROBLEM WITH TRACE!!!!! SHOULD NEVER REACH THIS POINT')
		}
	}

	/**
	 * Called when receiving the reply of a trace request
	 * @deprecated trace is now included in all message
	 */
	const _traceReply = function(message) {
		// we are the source of this trace request
		console.error('TODO: implement handling of trace reply:')
		console.warn(JSON.stringify(message))
	}

	return {
		create: _create,
		connect: _connect,
		send: _send,
		incomingYMessage: _incomingYMessage,
		subscribe: _subscribe,
		pairOtherVariables: _pairOtherVariables,
		registerPairedVariable: _registerPairedVariable,
		// should not be accessible from outside of LPC
		// unregisterPairedVariable: _unregisterPairedVariable,
		unregisterLocalPairedVariable: _unregisterLocalPairedVariable,
		relay: _relay,
		variableToURLsContains: _variableToURLsContains,
		addUrlToVariable: _addUrlToVariable,
		strategyMessage: _strategyMessage,
		isRoutingTableActive: _isRoutingTableActive,
		updateRoutingTableMessage: _updateRoutingTableMessage,
		shouldPackageBroadcastMessages: _shouldPackageBroadcastMessages,
		broadcastPackagedMessage: _broadcastPackagedMessage,

		// used in stats-component
		getNextHopToAllDevices: _getNextHopToAllDevices,
		getRoutingTable: _getRoutingTable,
		getPeersTableMap: _getPeersTableMap,
		updateRoutingTableIfNeeded: _updateRoutingTableIfNeeded,
		incomingGetConnectionsList: _incomingGetConnectionsList,
		incomingGetConnectionsListReply: _incomingGetConnectionsListReply,
		bandwidthTest: _bandwidthTest,
		bandwidthTestReply: _bandwidthTestReply,
		pingTest: _pingTest,
		pingTestReply: _pingTestReply,
		saveTimingStats: _saveTimingStats,
		setShouldSaveTimingStats: _setShouldSaveTimingStats,
		getTimingStats: _getTimingStats,
		isSaveTimingStatsActive: _isSaveTimingStatsActive
	}
})()