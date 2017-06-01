var liquid = {
	variable: function(v, value) {
		var o = {}	
		o[v] = value
		socket.emit('state', o)
	},

	// shared: function(v, value, windowId, permissions, clones, pair, excluded) {
	// 	if(excluded == undefined) {
	// 		excluded = {
	// 			device: -1,
	// 			token: -1,
	// 			subscribe: false
	// 		}
	// 	}

	// 	if(permissions.subscribe) {
	// 		for(var i = 0; i < clones.length; i++) {
	// 			var o = {}
	// 			o[v] = value

	// 			if(clones[i].device != excluded.device || clones[i].token != excluded.token) {
	// 				socket.emit('local', {
	// 					local: o,
	// 					type: 'read',
	// 					device: clones[i].device,
	// 					token: clones[i].token,
	// 					from: application.device_id
	// 				})
	// 			}
	// 		}
	// 	}

	// 	if(permissions.publish && pair != undefined && !excluded.subscribe) {
	// 		var o = {}
	// 		o[v] = value

	// 		socket.emit('local', {
	// 			local: o,
	// 			type: 'write',
	// 			device: pair.device,
	// 			windowId: pair.windowId,
	// 			from: application.device_id
	// 		})
	// 	}
	// },

	localClose: function(windowId, pair, clones){
		if(pair != undefined) {
			socket.emit('local', {
				type: 'pairClose',
				device: pair.device,
				token: pair.token,
				windowId: pair.windowId,
				from: application.device_id
			})
		}

		for(var i = 0; i < clones.length; i++) {
			socket.emit('local', {
				type: 'cloneClose',
				device: clones[i].device,
				token: clones[i].token,
				from: application.device_id
			})
		}
	},

	localMove: function(windowId, clones, from) {
		for(var i = 0; i < clones.length; i++) {
			socket.emit('local', {
				type: 'cloneMove',
				device: clones[i].device,
				token: clones[i].token,
				from: from,
				pair: {
					user: application.user,
					token: clones[i].token,
					device: application.device_id,
					windowId: windowId
				}
			})
		}
	},

	localNotify: function(windowId, pair) {
		socket.emit('local', {
			type: 'notifyClone',
			device: pair.device,
			token: pair.token,
			windowId: pair.windowId,
			from: application.device_id
		})
	},

	moveWindow: function(windowId, device, page){
		if(device != application.device_id) {
			var locals = liquid.closeWindow(windowId)
			
			var from = application.device_id
			liquid.notifyNewWindow(device, page, locals, undefined, from)
		}
	},

	cloneWindow: function(sharedId, windowId, device, page, token) {
		var liquid_page = application.windowReferences[windowId]

		var storage = liquid_page.getStorage()
		var pair = {
			user: application.user,
			device: application.device_id,
			windowId: windowId,
			sharedId: sharedId,
			token: token,
			username: application.user
		}

		var from = application.device_id

		liquid.notifyNewWindow(device, page, {storage: storage, clones: undefined}, pair, from)
	},

	closeWindow: function(windowId) {
		var div = document.getElementById('draggableArea')
		var liquid_page = application.windowReferences[windowId]

		var locals = liquid_page.getShared()
		var pair = liquid_page.getPair()

		locals.pair = pair

		liquid.localClose(windowId, pair, locals.clones)

		div.removeChild(liquid_page)
		delete application.windowReferences[windowId]

		for(var s in application.subscriptions) {
			delete application.subscriptions[s][windowId]
		}

		return locals
	},

	addWindow: function(pageName, locals, pair, from) {
		var id = liquid.createUniqueId()
		var frameId = 'liquid_frame_' + id

		var div = document.getElementById('draggableArea')
		var frame = document.createElement('liquid-page')
		var page = document.createElement('liquid-page-' + pageName)

		frame.setAttribute('id', frameId)
		frame.setAttribute('class', 'liquid_frame')

		// div.addEventListener('mousedown', mouseDown, false)
		// window.addEventListener('mouseup', mouseUp, false)

		// var mouseUp = function() {
		// 	window.removeEventListener('mousemove', elementMove, true);
		// }

		// var mouseDown = function(e) {
		// 	window.addEventListener('mousemove', elementMove, true);
		// }

		// var elementMove = function() {	
		// 	div.style.position = 'absolute'
		// 	div.style.top = e.clientY + 'px'
		// 	div.style.left = e.clientX + 'px'
		// }

		frame.windowId = id
		frame.addLiquidComponent(page, pageName, application.devices, pair)
		div.appendChild(frame)

		if(pair != undefined) {
			frame.sharedId = pair.sharedId
			liquid.registerCloneWindow(pair, id)
		} else {
			frame.sharedId = application.device_id + "_" + id
		}

		if(!application.windows[pageName]) {
			application.windows[pageName] = []
		}

		application.windows[pageName].push(id)
		application.windowReferences[id] = frame

		for(var i = 0; i < application.variable_subscriptions[pageName].length; i++) {
			application.subscriptions[application.variable_subscriptions[pageName][i]][id] = frame
		}

		for(var i = 0; i < application.variable_subscriptions[pageName].length; i++) {
			var v = application.variable_subscriptions[pageName][i]
			var value = application.state[v]
			frame.postVariable(v,value)
		}

		if(locals == undefined) {
			if(application.locals[pageName] != undefined) {
				// for(var i = 0; i < application.locals[pageName].length; i++) {
				// 	var varName = application.locals[pageName][i]
				// 	var varInit = application.initialisations[varName]
				// 	frame.registerLocalVariable(varName, varInit, application.permissions[varName])
				// }
			}
		} else {
			if(locals.storage != undefined) {
				var storage = locals.storage
				for(var n in storage) {
					frame.registerSharedVariable(n, storage[n], application.permissions[n])
				}
			}

			if(locals.clones != undefined) {
				var clones = locals.clones
				frame.postClones(clones)
				liquid.localMove(id, clones, from)
			}

			if(locals.pair != undefined) {
				frame.postPair(locals.pair)
				liquid.registerCloneWindow(locals.pair, id)
				liquid.localNotify(id, locals.pair)
			}
		}

		return frameId
	},

	notifyNewWindow: function(device, page, locals, pair, from) {
		socket.emit('newWindow', {
			device: device,
			page: page,
			locals: locals,
			pair: pair,
			from: from
		})
	},

	registerCloneWindow: function(pair, windowId) {
		var device = pair.device
		var token = pair.token

		if(application.registeredClones[device] == undefined) {
			application.registeredClones[device] = {}
		}

		application.registeredClones[device][token] = windowId
	},

	// unregisterCloneWindow: function(device) {
	// 	delete application.registeredClones[device]
	// },

	updateRegisterCloneWindow: function(from, pair) {
		var token = pair.token
		var windowId = application.registeredClones[from][token]

		liquid.registerCloneWindow(pair, windowId)
	},

	// registerCloneWindow: function (pair, device) {
	// 	var windowId = pair.windowId
	// 	var token = pair.token

	// 	if(application.registeredClones[windowId] == undefined) {
	// 		application.registeredClones[windowId] = {}
	// 	}
	// 	application.registeredClones[windowId][device] = token


	// 	if(application.subscribedClones[device] == undefined) {
	// 		application.subscribedClones[device] = {}
	// 	}
	// 	application.subscribedClones[device][token] = windowId
	// },

	// registerCloneWindow: function(pair, windowId) {
	// 	var token = pair.token
	// 	var device = pair.device

	// 	if(application.registeredClones[device] == undefined) {
	// 		application.registeredClones[device] = {}
	// 	}
	// 	application.registeredClones[device][token] = windowId
	// },

	createUniqueId: function () {
		application.counter = application.counter + 1
		return application.counter
	},

	createUniqueToken: function() {
		application.token = application.token + 1
		return application.counter
	},

	localStorageChange: function(v) {
		for(var i in application.windowReferences) {
			application.windowReferences[i].localStorageChange(v)
		}
	},

	sessionStorageChange: function(v) {
		for(var i in application.windowReferences) {
			application.windowReferences[i].sessionStorageChange(v)
		}
	}
}