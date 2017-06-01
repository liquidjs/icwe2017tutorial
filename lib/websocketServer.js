let log = require('debug')("ljs:websocketServer");
let path = require('path')
let fs = require('fs')

module.exports = function(expres, app, http, config) {
  let io = require('socket.io')(http);

  let socketHandlers = require(path.join(__dirname, '..', config.applicationFolder, 'socketHandlers'))

  let _devices = [];
  let _links = {pairedDevices:[], pairedComponents:[], pairedVariables:[]}

  let application = {
    id_progression: 0,
    socket_subscriptions: {},
    devices: {},
    sockets: {},
    usernames: {},
    devicesInfo: {}
  }

  let initialiseApplication = function() {
    application.components = []
    application.components = loadableComponents()
    application.variable_forwarding = 'socket'
  }

  let loadableComponents = function() {
    const componentsFolder = path.join(__dirname, '..', config.applicationFolder, 'public', 'components')
    const files = fs.readdirSync(componentsFolder)

    const components = []
    for(let i = 0; i < files.length; i++) {
      const regularExpression = /liquid-component-(.*?).html/
      let name = files[i].match(regularExpression)

      if(name) {
        components.push(name[1])
      }
    }
    return components
  }

  let openSocketServer = function() {
    const rooms = {}
    const clients = {}
    const cache = {}
    const customEmitter = socketHandlers(io)

    io.on('connection', function(socket){
      let __id = socket.id
      let __device_id = undefined
      let __customData = undefined

      socket.emit('handshake' , {})

      socket.on('handshake', function(message){
        let type = message.type

        switch(type) {
          case 'new':
            __device_id = createID()

            application.sockets[__id] = socket
            application.devices[__device_id] = __id
            application.usernames[__device_id] = __device_id
            application.devicesInfo[__device_id] = message.device

            socket.emit('connected', {
              id: __device_id,
            })
            // io.sockets.emit('deviceList', {
            //   devices: application.usernames,
            //   devicesInfo: application.devicesInfo
            // })
            log('Connected: ' + __device_id)
            break;
          case 'reconnect':
            __device_id = message.id
            let name = message.username

            if(!isValidUsername(name)) {
              name = __device_id
            }

            application.sockets[__id] = socket
            application.devices[__device_id] = __id
            application.usernames[__device_id] = name
            application.devicesInfo[__device_id] = message.device

            log('Reconnected: ' + __device_id)
            socket.emit('reconnected', {})
            break;
          default:
            console.log('Error on handshake: Message type: ' + message.type)
            break;
        }

        io.sockets.emit('componentsList', {components: application.components})
        
        if(message.custom && message.custom.websocketCustomData) {
          __customData = message.custom.websocketCustomData
          customEmitter.emit('onConnect', {
            deviceId: __device_id,
            data: __customData,
            socket: socket
          })

          io.sockets.emit('deviceList', {
            devices: application.usernames,
            devicesInfo: application.devicesInfo
          })
        } else {
          io.sockets.emit('deviceList', {
            devices: application.usernames,
            devicesInfo: application.devicesInfo
          })
        }
      })

      socket.on('username', function(data) {
        let name = data.name

        if(isValidUsername(name)) {
          application.usernames[__device_id] = name
          io.sockets.emit('deviceList', {
            devices: application.usernames,
            devicesInfo: application.devicesInfo
          })
        } else {
          //TODO: low priority
        }
      })

      socket.on('relay', function(data) {
        let id = application.devices[data.to.device]
        let socketTo = application.sockets[id]

        if(socketTo) {
          socketTo.emit('relay', data)
        }
      })

      socket.on('disconnect', function() {
        delete application.sockets[__id]
        delete application.devices[__device_id]
        delete application.usernames[__device_id]
        delete application.devicesInfo[__device_id]

        if(__customData) {
          customEmitter.emit('onDisconnect', {
            deviceId: __device_id,
            data: __customData
          })
          io.sockets.emit('deviceList', {
            devices: application.usernames,
            devicesInfo: application.devicesInfo
          })
        } else {
          io.sockets.emit('deviceList', {
            devices: application.usernames,
            devicesInfo: application.devicesInfo
          })
        }
      })

      socket.on('error', function(err) {
        log('Error ' + err)
      })
    });
  }

  let openServer = function() {
    initialiseApplication()
    openSocketServer()
  }

  if(config.server) {
    openServer()
    log('Websocket server started on port ' + config.server.port)
  } else {
    log('Websocket server not enabled')
  }
}

/*
 * Returns a unique ID
 */
let createID = function() {
  let date = new Date()
  return date.getTime()
}

let isValidUsername = function(username) {
  if(username == undefined || username == '') {
    return false
  }
  return true
}

let  getSocketByDeviceId = function(deviceId) {
  if(!application.devices[deviceId])
    return undefined

  let socketId = application.devices[deviceId]
  return application.sockets[socketId]
}