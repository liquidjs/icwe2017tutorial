module.exports = function(io){
  const EventEmitter = require('events')
  const emitter = new EventEmitter()

  emitter.on('onConnect', function(e){
  
  })

  emitter.on('onDisconnect', function(e){
   
  })

  return emitter
}
