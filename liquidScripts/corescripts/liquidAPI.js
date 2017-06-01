var Liquid = (function () {
	var __database = undefined
	var __databaseName = 'LiquidDatabase'
	var __remoteDatabase = false

	// Devices
	var __peer = undefined
	var __peersTable = {}
	var __socket = undefined

	// Connection
	var __initialised = false
	var __connected = false
	var __deviceId = getSessionDeviceId()
	var __instanceId = getInstanceDeviceId()

	// Components
	var __componentsAvailable = {}
	var __componentsReference = {}
	var __componentsSummary = {}

	var __state = undefined
	var __commons = undefined
	var __locals = undefined

	var __state = {}
	var __counter = 0
	var __token = 0
	var __windows = {}
	var __windowReferences = {}
	var __subscriptions = {}
	var __devices = {}
	var __devicesInfo = {}
	var __registeredClones = {}

	var __username = undefined

	var __loadedAssets = {}

	var __loadedComponents = []
	var __importedComponents = {}

	// Events
	var __customEvents = {}
	var __listeners = {}

	// UI
	var __loading = false
	var __lastTouchedElement = undefined
	var __liquidHook = {}

	var __waitingPromises = {}

	var __defaultLiquidComponents = [
		{relUrl: 'liquid-behavior/newLiquid-behavior.html', ext: 'html'},
		{relUrl: 'liquid-ui-behavior/liquid-ui-behavior.html', ext: 'html'},
		{relUrl: 'liquid-ui/liquid-ui.html', ext: 'html'},
		{relUrl: 'liquid-component-migrate/liquid-component-migrate.html', ext: 'html'},
		{relUrl: 'liquid-container/liquid-container.html', ext: 'html'},
		{relUrl: 'liquid-spatial-configure/liquid-spatial-configure.html', ext: 'html'}
	]

	var __defaultDependencies = [
		{relUrl: 'mobile-detect/mobile-detect.js', ext: 'script'},
		{relUrl: 'eventEmitter/EventEmitter.min.js', ext: 'script'},
		{relUrl: 'object.observe/dist/object-observe.js', 'ext': 'script'},
		{relUrl: 'array.observe/array-observe.js', 'ext': 'script'},
		{relUrl: '/components/socket.io-client/socket.io-client.js', ext: 'script'},
		{relUrl: '/components/peerjs/peerjs.js', ext: 'script'},
		{relUrl: 'es6-promise-polyfill/promise.js', ext: 'script'},
		{relUrl: 'yjs/y.js', ext: 'script'},
		{relUrl: 'y-map/y-map.js', ext: 'script'},
		{relUrl: 'y-array/y-array.js', ext: 'script'},
		{relUrl: 'y-text/y-text.js', ext: 'script'},
		{relUrl: 'y-memory/y-memory.js', ext: 'script'},
		{relUrl: 'y-liquid/y-liquid-new.js', ext: 'script'},
		{relUrl: 'pouchdb/dist/pouchdb.min.js', ext: 'script'},
		{relUrl: 'pouchdb-find/dist/pouchdb.find.min.js', ext: 'script'},
		{relUrl: '/components/qrcode/qrcode.min.js', ext: 'script'},
		{relUrl: 'corescripts/liquidPeerConnection.js', ext: 'script'},
		{relUrl: 'corescripts/liquidStrategy.js', ext: 'script'}
	]

	var _liquidAssets = [
		'liquid-behavior/newLiquid-behavior.html',
		'liquid-ui-behavior/liquid-ui-behavior.html',
		'liquid-ui/liquid-ui.html',
		'liquid-component-migrate/liquid-component-migrate.html',
		'liquid-container/liquid-container.html',
		'mobile-detect/mobile-detect.js',
		'eventEmitter/EventEmitter.min.js',
		'observe-js/src/observe.js',
		'object.observe/dist/object-observe.js',
		'array.observe/array-observe.js',
		'socket.io-client/socket.io-client.js',
		'peerjs/peerjs.js',
		'es6-promise-polyfill/promise.js',
		'yjs/y.js',
		'y-map/y-map.js',
		'y-array/y-array.js',
		'y-text/y-text.js',
		'y-memory/y-memory.js',
		'y-liquid/y-liquid-new.js',
		'pouchdb/dist/pouchdb.min.js',
		'pouchdb-find/dist/pouchdb.find.min.js',
		'components/liquid-component-array.html',
		'components/liquid-component-container.html',
		'components/liquid-component-email.html',
		'components/liquid-component-gallery.html',
		'components/liquid-component-googlemaps.html',
		'components/liquid-component-image.html',
		'components/liquid-component-object.html',
		'components/liquid-component-text.html',
		'components/liquid-component-webcam.html',
		'ui/liquid-ui-photo.html'
	]

	var __customMessageHandlers = {}
	var __config = {}
	var __defaultConfig = {
		strategy: 'full_graph',
		useRoutingTables: true,
		packageBroadcastMessages: true,
		host: 'localhost',
		signalingRoute: 'signaling',
		port:80,
		relay: false
	}

	/**
	* SANI Thesis attributes
	*/

	var __spatialReference = undefined

	var _checkDevice = function() {
		var md = new MobileDetect(window.navigator.userAgent)
		if (md.phone()) {
			return md.tablet() ? 'Phone/Tablet' : 'Phone'
		} else if (md.tablet()) {
			return 'Tablet'
		} else if (md.is('Bot') || md.is('MobileBot')) {
			return 'Bot'
		} else if (md.is('TV') || md.is('Console')) {
			return 'TV/Console'
		} else {
			if(md.mobile() == 'UnknownPhone') {
				return 'Phone'
			} else {
				return 'Desktop'
			}
		}
	}

	var _isLoadedDefaultLiquid = function() {
		return new Promise(function(resolve, reject) {
			var isAllLoaded = true

			for(var c in __defaultLiquidComponents) {
				var name = __defaultLiquidComponents[c].relUrl
				if(__importedComponents[name] === undefined) {
					isAllLoaded = false
				}
			}

			if(isAllLoaded) {
				resolve()
			} else {
				reject(new Error('Default components are not loaded'))
			}
		})
	}

	var _loadDefaultLiquidComponents = function() {
		return new Promise(function(resolve, reject) {
			var load = function(components) {
				var c = components.shift()
				if(c) {
					_ajaxRequest(c)
						.then(function(){
							load(components)
						}).catch(reject)
				} else {
					resolve()
				}
			}

			load(__defaultLiquidComponents.slice())
		})
	}

	var _loadDefaultDependencies = function() {
		return new Promise(function(resolve, reject) {
			var load = function(components) {
				var c = components.shift()
				if(c) {
					_ajaxRequest(c)
						.then(function(){
							load(components)
						}).catch(reject)
				} else {
					resolve()
				}
			}

			load(__defaultDependencies.slice())
		})
	}

	var _loadComponent = function(componentName) {
		return new Promise(function(resolve, reject) {
			_isLoadedComponent()
				.catch(function(){
					var component = {relUrl: 'components/liquid-component-' + componentName + '.html', ext: 'html'}
					if(!_isloadedAsset(component.relUrl)) {
						_ajaxRequest(component).then(function(){
							__loadedComponents.push(componentName)
							resolve()
						})
					} else {
						resolve()
					}
				})
		})
	}

	var _isLoadedComponent = function(componentName) {
		return new Promise(function(resolve, reject){
			if(__loadedComponents[componentName]) {
				resolve()
			} else {
				reject()
			}
		})
	}

	var _registerRoomToken = function(component, opts) {
		if(opts && opts.roomToken) {
			component._setRoomToken(opts.roomToken)
		}

		if (!component.roomToken) {
			component._setRoomToken(Date.now())
		}
	}

	var _registerComponent = function(component, componentName, opts) {
		if(component.__liquidComponentUrl == undefined) {
			var newIdentifier = _createUniqueId();

			var componentUrl = {
				device: __deviceId,
				componentRef: newIdentifier,
				type: componentName
			}

			component.__liquidComponentUrl = componentUrl;
			__componentsReference[newIdentifier] = component;
			__componentsSummary[newIdentifier] = component.__liquidComponentUrl;
		}
	}

	var _createComponent = function(componentName, element, opts) {
		return new Promise(function(resolve, reject) {
			var component = document.createElement('liquid-component-' + componentName);

			if(opts && opts.liquidui) {
				component.liquidui = opts.liquidui
			}

			if(opts && opts.bindings) {
		    for(var value in opts.bindings) {
	        var propertyValue = opts.bindings[value]
	        component[value] = propertyValue
		    }
			}

			_registerComponent(component, componentName, opts)
			_registerRoomToken(component, componentName, opts)

			if(typeof element == 'string') {
				if(element.split(':')[0] == 'liquid-hook') {
					var hookLabel = element.split(':')[1]
					element = _getHook(hookLabel)
				} else {
					element = document.querySelector(element)
				}
			}

			if(element == undefined) {
				element = document.querySelector('body')
			}

			if(element && Polymer.dom(element)) {
				Polymer.dom(element).appendChild(component)
			} else {
				element.appendChild(component);
			}

			resolve(component)
		})
	}

	var _loadAndCreateComponent = function(componentName, element, opts) {
		return new Promise(function(resolve, reject) {
			_loadComponent(componentName)
				.then(function(){
					_createComponent(componentName, element, opts)
						.then(resolve)
						.catch(reject)
			}).catch(reject)
		})
	}

	var _createMessage = function(fromURL, toURL, operation, target, data, promiseToken) {
		message = {
			from: fromURL,
			to: toURL,
			operation: operation,
			target: target || {},
			data: data || {},
			promiseToken: promiseToken || Date.now()
		}

		return message
	}

	var _closeComponent = function(componentURL) {
		var component = __componentsReference[componentURL.componentRef]

		if(component) {
			var parent = component.parentNode;
			parent.removeChild(component);
		}

		//TODO Delete from Liquid component references


		// var div = document.getElementById('draggableArea')
		// var liquid_page = __windowReferences[windowId]

		// var locals = liquid_page.getShared()
		// var pair = liquid_page.getPair()

		// locals.pair = pair

		// liquid.localClose(windowId, pair, locals.clones)

		// div.removeChild(liquid_page)
		// delete __windowReferences[windowId]

		// for(var s in __subscriptions) {
		// 	delete __subscriptions[s][windowId]
		// }

		// return locals
	}

	var _deleteComponent = function(fromURL, toURL, type, message) {
		return new Promise(function(resolve, reject) {
			if(!message) {
				const target = {
					device: toURL.device
				}

				const data = {}

				message = _createMessage(fromURL, toURL, 'delete', target, data)
			}

			__waitingPromises[message.promiseToken] = {resolve: resolve, reject: reject}
			_sendMessage(toURL, message)
		})
	}

	var _migrateComponent = function(fromURL, toURL, message) {
		return new Promise(function(resolve, reject) {
			if(!message) {
				const target = {
					device: toURL.device
				}

				const data = {
					liquidStorage: _getComponent(fromURL).getLiquidVariablesValue()
				}

				message = _createMessage(fromURL, toURL, 'migrate', target, data)
			}

			__waitingPromises[message.promiseToken] = {resolve: resolve, reject: reject}

			_sendMessage(toURL, message)
		})
	}

	var _forkComponent = function(fromURL, toURL, message) {
		return new Promise(function(resolve, reject) {
			if(!message) {
				const target = {
					device: toURL.device
				}

				const data = {
					liquidStorage: _getComponent(fromURL).getLiquidVariablesValue()
				}

				message = _createMessage(fromURL, toURL, 'fork', target, data)
			}

			__waitingPromises[message.promiseToken] = {resolve: resolve, reject: reject}
			_sendMessage(toURL, message)
		})
	}

	var _cloneComponent = function(fromURL, toURL, message) {
		return new Promise(function(resolve, reject) {
			if(!message) {
				var fromComponent = _getComponent(fromURL)

				//TODO containers...
				var childComponents = undefined
				if(fromComponent && fromComponent._isContainerComponent()) {
					fromComponent._getLiquidChildComponents()
				}

				const target = {
					device: toURL.device
				}

				const data = {
					liquidui: '',
					isContainer: fromComponent._isContainerComponent(),
					liquidStorage: fromComponent.getLiquidVariablesValue(),
					liquidChildComponents: childComponents
				}
				message = _createMessage(fromURL, toURL, 'clone', target, data)
			}

			__waitingPromises[message.promiseToken] = {resolve: resolve, reject: reject}
			_sendMessage(toURL, message)
		})
	}

	var _cloneAndHideComponent = function(fromURL, toURL, message) {
		if(!message) {
			message = _createCloneMessage(fromURL, toURL, 'cloneHide')
		}

		_sendMessage(toURL, message)
	}

	var _pairComponent = function(fromURL, toURL) {
		var variables = _getComponent(toURL).getLiquidVariablesList()

		for(var i in variables) {
			var fromVariableURL = {
				device: fromURL.device,
				componentRef: fromURL.componentRef,
				type: fromURL.type,
				variable: i
			}

			var toVariableURL = {
				device: toURL.device,
				componentRef: toURL.componentRef,
				type: toURL.type,
				variable: i
			}
			_pairVariable(toVariableURL, fromVariableURL)
		}
	}

	var _pairVariable = function(fromURL, toURL, liquidOptions) {
		var messageFrom = {
			from: fromURL,
			to: toURL,
			operation: 'pairFromVariable',
			options: liquidOptions
		}

		var messageTo = {
			from: fromURL,
			to: toURL,
			operation: 'pairToVariable',
			options: liquidOptions
		}

		_sendMessage(fromURL, messageFrom)
		_sendMessage(toURL, messageTo)

		// LiquidPeerConnection.registerPairedVariable(fromURL, toURL)
	}

	// var notifyNewWindow = function(device, page, locals, pair, from) {
	// 	socket.emit('newWindow', {
	// 		device: device,
	// 		page: page,
	// 		locals: locals,
	// 		pair: pair,
	// 		from: from
	// 	})
	// }

	// var registerCloneWindow = function(pair, windowId) {
	// 	var device = pair.device
	// 	var token = pair.token

	// 	if(__registeredClones[device] == undefined) {
	// 		__registeredClones[device] = {}
	// 	}

	// 	__registeredClones[device][token] = windowId
	// }

	// var updateRegisterCloneWindow = function(from, pair) {
	// 	var token = pair.token
	// 	var windowId = __registeredClones[from][token]

	// 	liquid.registerCloneWindow(pair, windowId)
	// }

	var _createUniqueId = function () {
		__counter = __counter + 1
		return __counter
	}

	// var createUniqueToken = function() {
	// 	__token = __token + 1
	// 	return __counter
	// }

	// var localStorageChange = function(v) {
	// 	for(var i in __windowReferences) {
	// 		__windowReferences[i].localStorageChange(v)
	// 	}
	// }

	// var sessionStorageChange = function(v) {
	// 	for(var i in __windowReferences) {
	// 		__windowReferences[i].sessionStorageChange(v)
	// 	}
	// }

	// var executeVariable = function(v, value) {
	// 	if(__executions[v] != undefined) {
	// 		var f = __executions[v][2]

	// 		if(__locals[f] != undefined)
	// 			__locals[f](value)
	// 	}
	// }

	// var onVariableChange = function(v,value) {
	// 	socket.emit('change', {
	// 		v: v,
	// 		value: value
	// 	})
	// }

	// var _set = function(v, value) {
	// 	var tempValue = value

	// 	if(__executions[v] != undefined) {
	// 		var f = __executions[v][0]

	// 		if(__locals[f] != undefined)
	// 			tempValue = __locals[f](value)
	// 	}

	// 	__state[v] = tempValue
	// 	onVariableChange(v, tempValue)
	// }

	// var _get = function(v) {
	// 	return __state[v]
	// }

	var _setUsername = function (name) {
		// var name = document.querySelector('#username').value
		if(name == undefined) {
			name = __deviceId
		}

		__user = name
		__username = name
		__socket.emit('username', {name: name})
	}

	var _create = function(opts, messageRouting) {
		return new Promise(function(resolve, reject) {
			_configure(opts, messageRouting)
				.then(_loadDefaultDependencies)
				.then(_configureSocket) // Connect websocketServer
				.then(_loadDatabase)
				.then(_loadDefaultLiquidComponents)
				.then(_preloadComponents)
				.then(resolve)
				.catch(reject)
		})
	}

	var _configure = function(opts, routing) {
		return new Promise(function(resolve, reject) {
			for(var c in opts) {
				if(c == 'username') {
					__username = opts[c]
				}
				else if(!__config[c]) {
					__config[c] = opts[c]
				}
			}

			if(routing != undefined) {
				__customMessageHandlers = routing
			}

			resolve()
		})
	}

	var _preloadComponents = function(){
		return new Promise(function(resolve, reject) {
			var nodes = document.querySelectorAll('*')
			for(var i in nodes){
				if(nodes[i].localName && nodes[i].localName.indexOf('liquid-component') != -1 ) {
					_loadComponent(nodes[i].tagName.toLowerCase().replace('liquid-component-',''),function(){});
				}
			}

			resolve()
		})
	}


	var _isConnected = function() {
		return __connected
	}

	var _addEventListener = function(type, listener) {
		if (typeof __listeners[type] == "undefined"){
			__listeners[type] = [];
		}

		if(typeof listener == 'function') {
			__listeners[type].push(listener);
		}
	}

	var _removeEventListener = function(type, listener) {
		if (__listeners[type]){
			for (var p in __listeners[type]){
				if (__listeners[type][p] === listener){
					__listeners[type].splice(p, 1);
					break;
				}
			}
		}
	}

	var _runEvent = function(type, params) {
		var listeners = __listeners[type]
		if(listeners) {
			for(var l in listeners){
				listeners[l].apply(this, params)
			}
		}
	}



	var _getComponents = function() {
		return __componentsSummary
	}

	var _getComponent = function(componentURL) {
		return __componentsReference[componentURL.componentRef]
	}

	var _getLoadedComponents = function() {
		return __loadedComponents
	}

	var _getLoadableComponents = function() {
		return __componentsAvailable
	}

	var _getDeviceId = function() {
		return __deviceId
	}

	var _getUsername = function() {
		return __username
	}

	var _getConnectionState = function() {
		return __connected
	}

	var _getDevicesList = function() {
		return __devices
	}

	var _getDevicesInfoList = function() {
		return __devicesInfo
	}

	var _ajaxRequest = function(file) {
		return new Promise(function(resolve, reject) {
			__loading = true
			_runEvent('loadingChange', [__loading])

			let server = __config.host || __defaultConfig.host
			let port = __config.port || __defaultConfig.port

			if(!server || !port) {
				reject(new Error('Impossible to read configurations'))
			}

			let req = new XMLHttpRequest();
			
			// let url = '${__config.secure ?}'
			var url = __config.secure ? 'https://' + server : 'http://' + server + ':' + port
			if(file.ext == 'script') {
				_requestScript(url, file)
					.then(function(){
						__loading = false
						_runEvent('loadingChange', [__loading])
						resolve()
					})
			} else if (file.ext == 'html') {
				_requestHTML(url, file)
					.then(function(){
						__loading = false
						_runEvent('loadingChange', [__loading])
						resolve()
					})
			}

			// var checkNextServer = function(servers) {
			// 	var server = servers.shift()
			// 	if(server) {
			// 		var req = new XMLHttpRequest();
			// 		// var url = __config.secure ? 'https://' + server : 'http://' + server
					
			// 		var url = "http://" + server
			// 		if(__config.secure) {
			// 			url = "https://" + server
			// 		}
			// 		// req.open('GET', url + '/echo', true)

			// 		// req.onreadystatechange = function() {
			// 		// 	if (req.readyState == 4) {
			// 		// 		if(req.status == 200) {
			// 					if(file.ext == 'script') {
			// 						_requestScript(url, file)
			// 							.then(function(){
			// 								__loading = false
			// 								_runEvent('loadingChange', [__loading])
			// 								resolve()
			// 							})
			// 					} else if (file.ext == 'html') {
			// 						_requestHTML(url, file)
			// 							.then(function(){
			// 								__loading = false
			// 								_runEvent('loadingChange', [__loading])
			// 								resolve()
			// 							})
			// 					}
			// 		// 		} else {
			// 		// 			checkNextServer(servers)
			// 		// 		}
			// 		// 	}
			// 		// }
			// 		// req.send()
			// 	} else {
			// 		reject(new Error('Servers are not available'))
			// 	}
			// }

			// checkNextServer(serversList)
		})
	}

	var _requestScript = function(server, file) {
		return new Promise(function(resolve, reject) {
			var fetchURL = server + '/' + file.relUrl
			fetch(fetchURL).then(function(response){
				return response.text();
			})
				.then(function(scriptText){
					return _createScriptTag(scriptText, file)
				})
				.then(resolve)
				.catch(reject)
		})
	}

	//TODO: polyfill
	var _requestHTML = function(server, file) {
		return new Promise(function(resolve, reject) {
			var fetchURL = server + '/' + file.relUrl
			fetch(fetchURL)
				.then(function(response){
					return response.text();
				})
				.then(function(importText){
					return _createImportTag(importText, file, server)
						.then(resolve)
						.catch(resolve)
				})
		})
	}

	var _createScriptTag = function(scriptText, file, element) {
		return new Promise(function(resolve, reject) {
			if(!__loadedAssets[file]) {
				var script = document.createElement('script');
				script.textContent = scriptText

				document.querySelector('head').appendChild(script)

				__importedComponents[file.relUrl] = true
				_saveAsset(file, script, scriptText)
			}
			resolve(script)
		})
	}

	var _createImportTag = function(importText, file, server) {
		return new Promise(function(resolve, reject) {
			if(__loadedComponents[file.Url] && typeof __loadedComponents[file.Url] == 'object') {
				resolve('Already loaded')
			} else {
				if(!__loadedAssets[file]) {
					var tempDiv = document.createElement('div')
					tempDiv.innerHTML = importText

					var link = document.createElement('div')
					document.querySelector('head').appendChild(link)

					var linkPromises = []
					var internalLinks = tempDiv.querySelectorAll('link')
					for(var i = 0; i < internalLinks.length; i++) {
						var tempUrl = internalLinks[i].getAttribute('href').replace('../','')
						if(_isLiquidAsset(tempUrl)) {
							if(!_isloadedAsset(tempUrl)){
								linkPromises.push(_requestHTML(server, {relUrl: tempUrl, ext:'html'}))
							}
						} else {
							linkPromises.push(_addAndwaitLinkTagLoad(internalLinks[i], link))
						}
					}

					Promise.all(linkPromises)
						.then(function(){
							var scriptPromises = []
							var internalScripts = tempDiv.querySelectorAll('script')
							for(var i = 0; i < internalScripts.length; i++) {
								var scriptText = internalScripts[i].textContent
								scriptPromises.push(_executeScript(scriptText, link))
							}

							var tags = tempDiv.children
							for(var i = 0; i < tags.length; i++) {
								if(tags[i].tagName != 'LINK'){
									link.appendChild(tags[i])
								}
							}

							Promise.all(scriptPromises).then(function(){
								_runEvent('loadingChange', [__loading])
								_saveAsset(file, link, importText)
								resolve(link)
							})
						})
				}
			}
		})
	}

	var _addAndwaitLinkTagLoad = function(linkTag, element) {
		return new Promise(function(resolve, reject) {
			var link = document.createElement('link');
			link.href = linkTag.getAttribute('href')
			link.rel = linkTag.rel;
			link.onload = function(){
				resolve()
			}
			element.appendChild(link)
		})
	}

	var _executeScript = function(scriptText) {
		return new Promise(function(resolve, reject) {
			eval(scriptText)
			resolve()
		})
	}

	/*
	 getSessionDeviceId
	 if deviceid is saved in session state then return it else return undefined.
	 */
	function getSessionDeviceId(){
		var devId = window.sessionStorage.getItem("liquidjs_id");
		if(devId) {
			__initialised = true
			return devId;
		} else {
			return undefined;
		}
	}

	function getInstanceDeviceId() {
		return Date.now()
	}

	/*
	 writeSessionDeviceId(id)
	 args: id:int(DeviceId)
	 writes device id in the session storage
	 */
	var writeSessionDeviceId= function (id) {
		window.sessionStorage.setItem("liquidjs_id", id);
	}

	var _isSocketConnected = function() {
		if(__socket && __socket.connected) {
			return true
		}
			
		return false
	}
	
	var _socketDisconnect = function() {
		if(__socket && __socket.connected) {
			__socket.disconnect()
		}
	}

	var _configureSocket = function() {
		return new Promise(function(resolve, reject) {
			var websocketServer = __config.host || __defaultConfig.host
			var port = __config.port || __defaultConfig.port

			if(port != 80) {
				websocketServer = websocketServer + ':' + port
			}

			var opts = __config.websocketServerOpts || __defaultConfig.websocketServerOpts

			if(!websocketServer) {
				reject(new Error('Impossible to read websocketServer configurations'))
			}

			let secure = __config.secure || __defaultConfig.secure
			let options = {
				secure: secure
			}

			__socket = io(websocketServer, options)

			__socket.on('socketCustom', function(e) {
				_runEvent(e.type, [e.message])
			})

			__socket.on('disconnect', function() {
				__connected = false
				_runEvent('disconnect')
			})

			__socket.on('handshake', function() {
				if(__initialised) {
					__socket.emit('handshake', {
						type: 'reconnect',
						id: __deviceId,
						username: __username,
						device: _checkDevice(),
						custom:{
							websocketCustomData: __config.websocketCustomData
						}
					})
				} else {
					__socket.emit('handshake', {
						type: 'new',
						device: _checkDevice(),
						custom:{
							websocketCustomData: __config.websocketCustomData
						}
					})
				}
			})

			__socket.on('reconnected', function() {
				__connected = true

				_configurePeer()
				_runEvent('reconnect')
			})

			__socket.on('connected', function(data) {
				__deviceId = data.id
				__user = data.id

				__connected = true
				__initialised = true
				writeSessionDeviceId(__deviceId);
				for(var s in __state) {
					__subscriptions[s] = {}
				}

				_configurePeer()
				_runEvent('connect', [__deviceId, __loadedComponents])
			})

			__socket.on('componentsList', function(data) {
				__componentsAvailable = data.components
				_runEvent('loadableComponentsListUpdate', [__componentsAvailable])
			})

			__socket.on('deviceList', function(data) {
				__devices = data.devices
				__devicesInfo = data.devicesInfo
				_runEvent('pairedDevicesListUpdate', [__devices, __devicesInfo])
			})

			__socket.on('state', function(data){
				for(var v in data) {
					var value = data[v]

					__state[v] = value

					for(var w in __subscriptions[v]) {
						__subscriptions[v][w].postVariable(v,value)
					}
				}
			})

			__socket.on('relay', function(data) {
				_incomingMessage(data)
			})

			__socket.on('liquidRestApi', function(data, fn){
				var user = data.user
				var device = data.device
				var component = data.component
				var componentType = data.componentType
				var variable = data.variable
				var peersTable=[]


				console.error('Should use peersTable from LiquidPeerConnection')
				// const peersTable = LiquidPeerConnection.getPeersTable()
				// for(var peer in peersTable){
				// 	if(peersTable.get(peer).peer){
				// 		console.log(`############ _configureSocket() ${peer}`)
				// 		peersTable.push(peersTable.get(peer).peer);
				// 	}
				// }
				for(var peer in __peersTable){
					if(__peersTable[peer].peer){
						console.log(`############ _configureSocket() ${peer}`)
						peersTable.push(__peersTable[peer].peer);
					}
				}
				var componentsList=[];
				for(var c in __componentsSummary){
					componentsList.push({component:__componentsSummary[c],
						variables:_getComponent(__componentsSummary[c]).__liquidVariablesList})
				}

				if(device && component && variable) {
					//TODO
				} else if(device && component) {
					//TODO
				} else if(device) {
					fn(false, {
						devices: {
							device: __deviceId,
						},
						components:componentsList,
						peersTable:peersTable
					})
				} else {
					fn(true, undefined)
				}
			})

			__socket.on('custom', function(data) {
				var customType = data.customOperation
				if(__customMessageHandlers[customType]) {
					__customMessageHandlers(message)
				}
			})

			resolve()
		})
	}

	var _configurePeer = function() {
		if(__peer) {
			__peer.destroy()
		}

		if(!__peer || __peer.disconnected) {
			if(!__config.host) {
				console.log('Could not find signaling server host')
				return
			}

			let opts = __config.signalingServerOpts || __defaultConfig.signalingServerOpts

			let host = __config.host || __defaultConfig.host
			let signalingRoute = __config.signalingRoute || __defaultConfig.signalingRoute
			let secure = __config.secure || __defaultConfig.secure

			let port = __config.port || (secure ? 443 : 80)

			__peer = new Peer(__deviceId,  {
				host: host,
				port: port,
				path: signalingRoute,
				secure: secure
			})

			const strategy = __config.strategy || __defaultConfig.strategy
			const useRoutingTables = __config.useRoutingTables || __defaultConfig.useRoutingTables
			const packageBroadcastMessages = __config.packageBroadcastMessages || __defaultConfig.packageBroadcastMessages
			LiquidPeerConnection.create(__peer, strategy, useRoutingTables, packageBroadcastMessages)

			// // let peer = ...
			// __peer = new Peer(__deviceId, {
			// 	host: host[1],
			// 	port: port[1],
			// 	path: '/' + path[1]
			// });

			// // TODO __peer = LiquidPeerConnection(__peer)

			// __peer.on('open', _peerOpen)
			// __peer.on('connection', _peerNewConnection)
			// __peer.on('close', _peerClose)
			// __peer.on('disconnected', _peerDisconnect)
			// __peer.on('error', _peerError)
		}
	}

	// var _connectDevice = function(device, success) {
	// 	throw new Error('This should not be called anymore! Use LiquidPeerConnection')
	// 	return
	// 	if(__peer && !__peersTable[device]) {
	// 		var conn = __peer.connect(device, {
	// 			metadata: {
	// 				from: __deviceId,
	// 				to: device
	// 			}
	// 		})

	// 		conn.on('open', function() {
	// 			console.log(`############ _connectDevice().on(open) ${device}`)
	// 			__peersTable[device] = conn

	// 			if(success) {
	// 				success()
	// 			}
	// 		})

	// 		conn.on('data', _peerConnectionData.bind(conn))
	// 		conn.on('close', _peerConnectionClose.bind(conn))
	// 		conn.on('error', _peerConnectionError.bind(conn))
	// 	} else {
	// 		if (!__peer) {
	// 			throw new Error('!__peer')
	// 		}
	// 		if (__peersTable[device]) {
	// 			throw new Error(`__peersTable[device]: ${device}`)
	// 		}
	// 	}
	// }

	var _sendSocketCustomMessage = function(type, message) {
		__socket.emit(type, message)
	}

	var _broadcastMessageToTable = function(tableURL, message) {
		//TODO
	}

	var _sendMessage = function(liquidURL, message) {
		var deviceIdTo = liquidURL.device
		if(deviceIdTo) {
			// Myself
			if(deviceIdTo == __deviceId) {
				_incomingMessage(message)
				return
			}

			// If webRTC is not configured
			if(__config.relay) {
				__socket.emit('relay', message)
				return
			}

			LiquidPeerConnection.send(liquidURL, message).then(function(result){
				// console.log(result)
			}).catch(result => {
				console.error(result)
			})
			// LiquidPeerConnection.send(liquidURL, message).then(function(result){
			// 	// console.log(result)
			// }, function(err){
			// 	console.error(err)
			// })

			// if (!LiquidPeerConnection.send(liquidURL, message)) {
			// 	// something went wrong while sending via the webRTC connection
			// 	// fallback on the socket
			// 	console.log('Send returned false -> __socket relay')
			// 	__socket.emit('relay', message)
			// }

			// // If webRTC is configured
			// if(__peersTable[deviceIdTo]) {
			// 	if(__peersTable[deviceIdTo].open == true) {
			// 		// if peer exists and is connected
			// 		console.log(`!!! SEND to:${deviceIdTo} open==true  op:${message.operation}`)
			// 		// __peer.send(toURL, message)
			// 		__peersTable[deviceIdTo].send(message)
			// 	} else {
			// 		// if peer exists but it isn't connected -> relay on socket
			// 		__socket.emit('relay', message)
			// 		//TODO when attempt to reconnect?
			// 	}
			// } else {
			// 	// if peer wasn't created
			// 	_connectDevice(deviceIdTo, function() {
			// 		console.log(`_sendMessage() not yet in peersTable, connect from:${message.from.device} -to:${message.to.device}`)
			// 		let conn = __peersTable[deviceIdTo]

			// 		__peersTable[deviceIdTo].send(message)
			// 		_connectComponent(liquidURL, message)
			// 	})
			// 	// _connectComponent(liquidURL, message)
			// }
		}
	}

	var _incomingMessage = function(message) {
		switch(message.operation) {
			case 'yMessage':
				LiquidPeerConnection.incomingYMessage(message)
				// _incomingYMessage(message)
				break;
			case 'migrate':
				_incomingMigrateComponent(message)
				break;
			case 'migrationComplete':
				_incomingMigrateComponentComplete(message)
				break;
			case 'fork':
				_incomingForkComponent(message)
				break;
			case 'forkComplete':
				_incomingForkComponentComplete(message)
				break;
			case 'clone':
				_incomingCloneComponent(message, 'clone')
				break;
			case 'cloneCreated':
				_incomingCloneCreated(message)
				break;
			case 'cloneHide':
				_incomingCloneComponent(message, 'cloneHide')
				break;
			case 'cloneHideCreated':
				_incomingCloneHideCreated(message)
				break;
			case 'delete':
				_incomingDeleteComponent(message)
				break;
			case 'deleteComplete':
				_incomingDeleteComponentComplete(message)
				break;
			case 'pairFromVariable':
				// console.warn('pair FROM from:'+ message.from.device+' to:'+message.to.device)
				_incomingPairFromVariable(message)
				break;
			case 'pairToVariable':
				// console.warn('pair TO from:'+message.from.device+' to:'+message.to.device)
				_incomingPairToVariable(message)
				break;
			case 'requestAsset':
				_incomingRequestAsset(message)
				break;
			case 'assetFile':
				_incomingAssetFile(message)
				break;
			case 'custom':
				var customType = message.customOperation
				if(__customMessageHandlers[customType]) {
					__customMessageHandlers(message)
				}
				break;
			case 'getConnectionsList':
				LiquidPeerConnection.incomingGetConnectionsList(message)
				// _incomingGetConnectionsList(message)
				break;
			case 'getConnectionsListReply':
				LiquidPeerConnection.incomingGetConnectionsListReply(message)
				// _incomingGetConnectionsListReply(message)
				break;
			case 'bandwidthTest':
			case 'bandwidthTest2':
				LiquidPeerConnection.bandwidthTest(message)
				// _bandwidthTest(message)
				break;
			case 'bandwidthTestReply':
			case 'bandwidthTestReply2':
				LiquidPeerConnection.bandwidthTestReply(message)
				// _bandwidthTestReply(message)
				break;
			case 'pingTest':
			case 'pingTest2':
				LiquidPeerConnection.pingTest(message)
				break;
			case 'pingTestReply':
			case 'pingTestReply2':
				LiquidPeerConnection.pingTestReply(message)
				break;
			case 'otherPairedVariables':
				LiquidPeerConnection.pairOtherVariables(message)
				break;
			case 'relay':
				LiquidPeerConnection.relay(message)
				break;
			case 'strategyMessage':
				LiquidPeerConnection.strategyMessage(message)
				break;
			case 'updateRoutingTable':
				LiquidPeerConnection.updateRoutingTableMessage(message)
				break;
			default:
				break;
		}
	}

	var _peerOpen = function(id) {
		console.log('Peer: opened connection with server: ' + id)

		// this.userJoined(id, 'master')
	}

	// var _peerNewConnection = function(conn) {
	// 	conn.on('data', _peerConnectionData.bind(conn))
	// 	conn.on('close', _peerConnectionClose.bind(conn))
	// 	conn.on('error', _peerConnectionError.bind(conn))

	// 	console.log(`############ _peerNewConnection() ${conn.metadata.from}`)
	// 	__peersTable[conn.metadata.from] = conn
	// 	// _setupConnection(conn)
	// }

	var _peerRenewConnection = function(conn) {
		console.error('Should be done in LiquidPeerConnection not here')
		console.log('Peer: renew connection: ' + conn)
		conn.on('data', _peerConnectionData.bind(conn))
		conn.on('close', _peerConnectionClose.bind(conn))
		conn.on('error', _peerConnectionError.bind(conn))

		__peersTable[conn.metadata.from] = conn
	}

	// var _peerClose = function() {
	// 	console.log('Peer: closed connection with server')
	// }

	// var _peerDisconnect = function() {
	// 	console.log('Peer: disconnected')
	// }

	// var _peerError = function(err) {
	// 	console.log('Peer: error: ' + JSON.stringify(err))
	// }

	//this = peerConnection (conn), set with .bind()
	var _peerConnectionData = function(data) {
		_incomingMessage(data)
	}

	// var _peerConnectionClose = function() {
	// 	console.log('PeerConnectionClose...')
	// }

	// var _peerConnectionError = function(err) {
	// 	console.log('Peer: error: ' + JSON.stringify(err))
	// }

	var _peerConnectionError = function(err) {
		console.log('Peer: error: ' + JSON.stringify(err))
	}

	var _setLastTouch = function(liquidURL, liquidui, liquidStorage) {
		__lastTouchedElement = {
			liquidURL: liquidURL,
			liquidui: liquidui,
			liquidStorage: liquidStorage
		}
	}

	var _getLastTouch = function() {
		return __lastTouchedElement
	}

	var _incomingDeleteComponent = function(message) {
		_closeComponent(message.to)

		const replyMessage = _createMessage(message.to, message.from, 'deleteComplete', {}, {}, message.promiseToken)
		_sendMessage(message.from, replyMessage)
	}

	var _incomingMigrateComponent = function(message) {
		var fromURL = message.from
		var target = message.target
		var element = target.element

		if(!target.element) {
			element = document.querySelector('body')
		}

		let assetName = 'components/liquid-component-' + fromURL.type + '.html'
		if(!_isloadedAsset(assetName)) {
			_requestAsset(assetName, fromURL.device)
			.then(function(){
				_createComponent(fromURL.type, element, {liquidui: message.data.liquidui})
					.then(function(component) {
						component._populateStorage(message.data.liquidStorage/*, message.data.liquidPairings*/)

						const replyMessage = _createMessage(component.__liquidComponentUrl, fromURL, 'migrationComplete', {}, {}, message.promiseToken)
						_sendMessage(fromURL, replyMessage)
					})
			})
		} else {
			_createComponent(fromURL.type, element, {liquidui: message.data.liquidui})
				.then(function(component) {
					component._populateStorage(message.data.liquidStorage/*, message.data.liquidPairings*/)

					const replyMessage = _createMessage(component.__liquidComponentUrl, fromURL, 'migrationComplete', {}, {}, message.promiseToken)
					_sendMessage(fromURL, replyMessage)
				})
		}
	}

	var _incomingForkComponent = function(message) {
		var fromURL = message.from
		var target = message.target
		var element = target.element

		if(!target.element) {
			element = document.querySelector('body')
		}

		if(target.componentRef) {
			// container
		}

		let assetName = 'components/liquid-component-' + fromURL.type + '.html'
		if(!_isloadedAsset(assetName)) {
			_requestAsset(assetName, fromURL.device)
			.then(function(){
				_createComponent(fromURL.type, element, {liquidui: message.data.liquidui})
					.then(function(component) {
						component._populateStorage(message.data.liquidStorage)

						const replyMessage = _createMessage(component.__liquidComponentUrl, fromURL, 'forkComplete', {}, {}, message.promiseToken)
						_sendMessage(fromURL, replyMessage)
					})	
			})
		} else {
			_createComponent(fromURL.type, element, {liquidui: message.data.liquidui})
				.then(function(component) {
					component._populateStorage(message.data.liquidStorage)

					const replyMessage = _createMessage(component.__liquidComponentUrl, fromURL, 'forkComplete', {}, {}, message.promiseToken)
					_sendMessage(fromURL, replyMessage)
				})	
		}
	}

	var _incomingCloneComponent = function(message, type) {
		var fromUrl = message.from
		var target = message.target
		var element = target.element
		
		if(!target.element) {
			element = document.querySelector('body')
		}
		
		let assetName = 'components/liquid-component-' + fromUrl.type + '.html'
		if(!_isloadedAsset(assetName)) {
			_requestAsset(assetName, fromUrl.device)
			.then(function(){
				_createComponent(fromUrl.type, element, {liquidui: message.data.liquidui, roomToken: message.data.roomToken})
					.then(function(component) {
						component._populateStorage(message.data.liquidStorage)
						var defaultChilds = component._getLiquidChildComponents().default.slice() // copy array

						while(defaultChilds.length > 0) {
							var currentURL = defaultChilds.shift()
							for(var i = 0; i < message.data.liquidChildComponents.default.length; i++) {
								if(!message.data.liquidChildComponents.default[i].copyURL &&
									message.data.liquidChildComponents.default[i].type == currentURL.type) {
										message.data.liquidChildComponents.default[i].copyURL = currentURL
								}
							}
						}

						var toAdd = message.data.liquidChildComponents.added
						var added = 0

						for(var i = 0; i < toAdd.length; i++) {
							var closure = function(pos) {
								_loadAndCreateComponent(toAdd[pos].type, component.$[toAdd[pos].data.element], {liquidui: toAdd[pos].data.liquidui, roomToken: message.data.roomToken})
									.then(function(component){
										added++

										message.data.liquidChildComponents.added[pos].copyURL = addedComponentURL

										if(added == toAdd.length) {
											_sendMessage(fromUrl, {
												operation: type + "Created",
												from: component.__liquidComponentUrl,
												to: fromUrl,
												data: message.data
											})
										}
									})
							}(i)
						}

						// Does not contain any component
						if(toAdd.length == 0) {
							const replyMessage = _createMessage(component.__liquidComponentUrl, fromUrl, type + "Created", {}, message.data, message.promiseToken)
							_sendMessage(fromUrl, replyMessage)
						}
					})
			})
		} else {
			_createComponent(fromUrl.type, element, {liquidui: message.data.liquidui, roomToken: message.data.roomToken})
				.then(function(component) {
					component._populateStorage(message.data.liquidStorage)
					var defaultChilds = component._getLiquidChildComponents().default.slice() // copy array

					while(defaultChilds.length > 0) {
						var currentURL = defaultChilds.shift()
						for(var i = 0; i < message.data.liquidChildComponents.default.length; i++) {
							if(!message.data.liquidChildComponents.default[i].copyURL &&
								message.data.liquidChildComponents.default[i].type == currentURL.type) {
									message.data.liquidChildComponents.default[i].copyURL = currentURL
							}
						}
					}

					var toAdd = message.data.liquidChildComponents.added
					var added = 0

					for(var i = 0; i < toAdd.length; i++) {
						var closure = function(pos) {
							_loadAndCreateComponent(toAdd[pos].type, component.$[toAdd[pos].data.element], {liquidui: toAdd[pos].data.liquidui, roomToken: message.data.roomToken})
								.then(function(component){
									added++

									message.data.liquidChildComponents.added[pos].copyURL = addedComponentURL

									if(added == toAdd.length) {
										_sendMessage(fromUrl, {
											operation: type + "Created",
											from: component.__liquidComponentUrl,
											to: fromUrl,
											data: message.data
										})
									}
								})
						}(i)
					}

					// Does not contain any component
					if(toAdd.length == 0) {
						const replyMessage = _createMessage(component.__liquidComponentUrl, fromUrl, type + "Created", {}, message.data, message.promiseToken)
						_sendMessage(fromUrl, replyMessage)
					}
				})
		}
	}

	var _incomingCloneCreated = function(message) {
		var fromURL = message.from
		var toURL = message.to

		_pairComponent(fromURL, toURL)

		var containerChilds = message.data.liquidChildComponents
		for(var i = 0; i < containerChilds.added.length; i++) {
			var originalURL = {
				device: containerChilds.added[i].device,
				componentRef: containerChilds.added[i].componentRef,
				type: containerChilds.added[i].type
			}

			var clonedURL = {
				device: containerChilds.added[i].copyURL.device,
				componentRef: containerChilds.added[i].copyURL.componentRef,
				type: containerChilds.added[i].copyURL.type
			}

			_pairComponent(clonedURL, originalURL)
		}

		for(var i = 0; i < containerChilds.default.length; i++) {
			var originalURL = {
				device: containerChilds.default[i].device,
				componentRef: containerChilds.default[i].componentRef,
				type: containerChilds.default[i].type
			}

			var clonedURL = {
				device: containerChilds.default[i].copyURL.device,
				componentRef: containerChilds.default[i].copyURL.componentRef,
				type: containerChilds.default[i].copyURL.type
			}

			_pairComponent(clonedURL, originalURL)
		}
	}

	var _incomingCloneHideCreated = function(message) {
		_incomingCloneCreated(message)
		_getComponent(message.to).style.display = 'none'
	}

	var _incomingDeleteComponentComplete = function(message) {
		__waitingPromises[message.promiseToken].resolve()
		delete __waitingPromises[message.promiseToken]
	}

	var _incomingMigrateComponentComplete = function(message) {
		_closeComponent(message.to)

		__waitingPromises[message.promiseToken].resolve()
		delete __waitingPromises[message.promiseToken]
	}

	var _incomingForkComponentComplete = function(message) {
		__waitingPromises[message.promiseToken].resolve()
		delete __waitingPromises[message.promiseToken]
	}

	var _incomingPairFromVariable = function(message) {
		var messageFrom = message.from
		var messageTo = message.to

		_getComponent(messageFrom).pairVariableOutgoing(messageFrom, messageTo)
		LiquidPeerConnection.registerPairedVariable(messageFrom, messageTo)
	}

	var _incomingPairToVariable = function(message) {
		var messageFrom = message.from
		var messageTo = message.to

		_getComponent(messageTo).pairVariableIncoming(messageFrom, messageTo)
		LiquidPeerConnection.registerPairedVariable(messageTo, messageFrom)
	}

	var _incomingYMessage = function(message) {
		LiquidPeerConnection.incomingYMessage(message)
		// var messageTo = message.to
		// _getComponent(messageTo).receiveYMessage(message)
	}


	// var _registerVariable = function(componentURL, variable) {
	// 	if(componentURL.device == __deviceId) {

	// 	} else {
	// 		//propagate to correct device
	// 	}
	// }

	// state = {}
	// commons = exports.__load_commons()
	// locals = __load_locals

	var _getDeviceSnapshot = function() {
		var snapshot = {
			components: {}
		}
		for(var i in __componentsReference) {
			snapshot.components[i] = __componentsReference[i]._getComponentSnapshot()
		}

		return snapshot
	}

	var _createDefaultDatabaseObject = function(type) {
		return {
      _id: type,
      snapshots: {}
    }
	}

	var _loadDatabase = function() {
		return new Promise(function(resolve, reject) {
			__database = new PouchDB(__databaseName)
			if(__database){
				__database.createIndex({
				  index: {
				    fields: ['type', 'label']
				  }
				}).then(function (result) {
				  if(result.result == 'created') {
				  	resolve()
				  } else if(result.result == 'exists') {
				  	resolve()
				  }
				}).catch(function (err) {
				  reject(err)
				})
			} else {
				reject(new Error('LocalDB is not loaded'))
			}
		})
	}

	var _saveDeviceState = function(label) {
		return new Promise(function(resolve, reject) {
			var tempId = Date.now().toString()

			if(!label)
				label = tempId

			var snapshot = _getDeviceSnapshot()

			var newDocument = {
				_id: tempId,
				type: 'deviceState',
				label: label,
				snapshot: snapshot
			}

			__database.put(newDocument)
				.then(function(doc) {
			 		resolve(doc)
				})
				.catch(reject)
		})
	}

	var _loadDeviceState = function(label) {
		return new Promise(function(resolve, reject) {
			_getDeviceState(label)
				.then(function(result) {
					if(result[0]) {
						var componentKeys = Object.keys(result[0].snapshot.components)

						var load = function(index) {
							if(index < componentKeys.length) {
								var savedComp = result[0].snapshot.components[componentKeys[index]]
								if(savedComp.type != 'migrate') {
									var createAndPopulate = _loadAndCreateComponent(savedComp.type, document.querySelector('body'), savedComp.options)
										.then(function(component){
											component._populateStorage(savedComp.variables)
										}).then(function(){
											index++
											load(index)
										})
										.catch(reject)
								} else {
									index++
									load(index)
								}
							} else {
								resolve()
							}
						}
						load(0)

					} else {
						reject(new Error('Label does not exist'))
					}
				})
				.catch(reject)
		})
	}

	var _getDeviceState = function(label) {
		return new Promise(function(resolve, reject) {
			__database.find({
			  selector: {
			    type: 'deviceState',
			    label: label
			  }
			})
				.then(function(result) {
					resolve(result.docs)
				})
				.catch(reject)
		})
	}

	var _getAllDeviceState = function() {
		return new Promise(function(resolve, reject) {
			__database.find({
			  selector: {
			    type: 'deviceState'
			  }
			})
				.then(function(result) {
					resolve(result.docs)
				})
				.catch(reject)
		})
	}

	// var _saveComponentState = function(label, componentURL) {
	// 	return new Promise(function(resolve, reject) {

	// 	})
	// }

	// var _loadComponentState = function(label) {

	// }

	// var _getComponentState = function(label) {

	// }

	// var _getAllComponentState = function() {

	// }

	// var _saveVariableState = function(label) {

	// }

	// var _loadVariableState = function(label) {

	// }

	// var _getVariableState = function(label) {

	// }

	// var _getAllVariableState = function() {

	// }

	var _isLiquidAsset = function(assetName) {
		return _liquidAssets.indexOf(assetName) != -1
	}

	var _isloadedAsset = function(relUrl) {
		return __loadedAssets[relUrl] != undefined
	}

	var _loadAsset = function(file, ext) {
		return new Promise(function(resolve, reject) {
			var relUrl = 'ui/liquid-ui-' + file + '.html'

			if(_isloadedAsset(relUrl)) {
				return resolve()
			} else {
				__loadedAssets[relUrl] = true
			}

			_ajaxRequest({
				relUrl: relUrl,
				ext: ext
			})
				.then(resolve)
				.catch(reject)
		})
	}

	var _getAsset = function(name) {
		var assetDescription = __loadedAssets[name]

		// if(!assetDescription) {
		// 	name = 'components/' + name + '.html'
		// 	assetDescription = __loadedAssets[name]
		// }

		console.log(assetDescription)

		var asset = {
			name: name,
			assetContent: assetDescription.textContent,
			type: assetDescription.file.ext
		}
		return asset
	}

	var _saveAsset = function(file, component, textContent) {
		component.id = file.relUrl

		__loadedAssets[file.relUrl] = {
			file: file,
			component: component,
			textContent: textContent
		}
	}

	var _requestAsset = function(asset, deviceId) {
		return new Promise(function(resolve, reject) {
			var fromURL = {
				device: _getDeviceId()
			}

			var toURL = {
				device: deviceId
			}

			var message = _createMessage(fromURL, toURL, 'requestAsset', {}, {
				asset: asset
			})

			__waitingPromises[message.promiseToken] = {resolve: resolve, reject: reject}

			_sendMessage(toURL, message)
		})
	}

	var _incomingRequestAsset = function(message) {
		var fromURL = {
			device: _getDeviceId()
		}

		var toURL = message.from

		var message = _createMessage(fromURL, toURL, 'assetFile', {}, _getAsset(message.data.asset), message.promiseToken)

		_sendMessage(toURL, message)
	}

	var _incomingAssetFile = function(message) {
		if(message.data.type == 'script') {
			if(!document.getElementById(message.data.name)) {
				_createScriptTag(message.data.assetContent, {relUrl: message.data.name, ext: 'script'})
					.then(function(){
						__waitingPromises[message.promiseToken].resolve()
						delete __waitingPromises[message.promiseToken]
					})
			}
		} else if (message.data.type == 'html') {
			_createImportTag(message.data.assetContent, {relUrl: message.data.name, ext: 'html'})
				.then(function(){
					__waitingPromises[message.promiseToken].resolve()
					delete __waitingPromises[message.promiseToken]
				})
		}
	}

	var _existsLiquidHook = function(label) {
		if(__liquidHook[label])
				return true

		return false
	}

	var _createLiquidHook = function(label, dom) {
		__liquidHook[label] = dom
	}

	var _removeLiquidHook = function(label) {
		delete __liquidHook[label]
	}

	var _createHook = function(hook, label) {
		__liquidHook[label] = hook
	}

	var _removeHook = function(label) {
		delete __liquidHook[label]
	}

	var _getHook = function(label) {
		return __liquidHook[label]
	}

	/**
	 * Allows to get access to the peersTable from liquid-component-stats
	 * @return {[type]} [description]
	 */
	var _registerSpatial = function(spatialReference) {
		__spatialReference = spatialReference
	}

 var _getConnectionsList = function() {
		return __peersTable
 }

var _getSpatial = function() {
		return __spatialReference
	}

	var _triggerSpatialEvent = function(type, data) {
		_runEvent('spatial-' + type, [data])
	}

	var _triggerUIEvent = function(type, data) {
		_runEvent('UI-' + type, [data])
	}

	var _getLiquidComponentUrl = function() {
		__liquidComponentUrl
	}


	return {
		configure: _create,
		isConnected: _isConnected,

		// Assets API
		loadedAssets: __loadedAssets,
		loadAsset: _loadAsset,
		requestAsset: _requestAsset,

		// Devices API
		// connectDevice: _connectDevice, // this is now provided by LiquidPeerConnection
		sendMessage: _sendMessage,
		sendSocketCustomMessage: _sendSocketCustomMessage,

		// Components API
		registerComponent: _registerComponent,
		registerRoomToken: _registerRoomToken,
		loadComponent: _loadComponent,
		createComponent: _createComponent,
		loadAndCreateComponent: _loadAndCreateComponent,
		closeComponent: _closeComponent,
		deleteComponent: _deleteComponent,
		migrateComponent: _migrateComponent,
		forkComponent: _forkComponent,
		cloneComponent: _cloneComponent,
		cloneAndHideComponent: _cloneAndHideComponent,
		pairComponent: _pairComponent,

		// Variable API
		pairVariable: _pairVariable,

		// Persistence API
		saveDeviceState: _saveDeviceState,
		loadDeviceState: _loadDeviceState,
		getAllDeviceState: _getAllDeviceState,
		getDeviceState: _getDeviceState,
		// saveComponentState: _saveComponentState,
		// loadComponentState: _loadComponentState,
		// getAllComponentState: _getAllComponentState,
		// getComponentState: _getComponentState,
		// saveVariableState: _saveVariableState,
		// loadVariableState: _loadVariableState,
		// getAllVariableState: _getAllVariableState,
		// getVariableState: _getVariableState,

		createMessage: _createMessage,

		getLoadedComponents: _getLoadedComponents,
		getLoadableComponents: _getLoadableComponents,

		getComponents: _getComponents,
		getComponent: _getComponent,
		getDeviceId: _getDeviceId,
		getDevicesList: _getDevicesList,
		getDevicesInfoList: _getDevicesInfoList,
		getUsername: _getUsername,
		getConnectionState: _getConnectionState,

		setUsername: _setUsername,

		addEventListener: _addEventListener,
		removeEventListener: _removeEventListener,

		setLastTouch: _setLastTouch,
		getLastTouch: _getLastTouch,

		// Yoel's
		getConnectionsList: _getConnectionsList,
		getLiquidComponentURL: _getLiquidComponentUrl,
		incomingMessage: _incomingMessage,

		createHook: _createHook,
		removeHook: _removeHook,

		registerSpatial: _registerSpatial,
		triggerSpatialEvent: _triggerSpatialEvent,
		triggerUIEvent: _triggerUIEvent,

		createUniqueId: _createUniqueId,
		getSpatial: _getSpatial,

		isSocketConnected: _isSocketConnected,
		socketDisconnect: _socketDisconnect,

		createImportTag: _createImportTag,
	}
})();
