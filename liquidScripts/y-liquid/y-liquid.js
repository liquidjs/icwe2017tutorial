
function Liquid(room, options, liquidPage){
  if(options === undefined){
    options = {};
  }

  if(options.host === undefined) {
    options.host = "http://localhost";
  }

  if(options.port === undefined) {
    options.port = 12304
  }

  // var swr = new SimpleWebRTC(options);
  // this.swr = swr;
  
  var lp = liquidPage
  var roomName = room
  var userId = undefined
  var url = "http://" + options.host + ":" + options.port
  var socket = io(url, {'force new connection': true})
  this.socket = socket
  
  var p2pOptions = {
    numClients: 5
  }
  var p2p = new P2P(socket)
  this.p2p = p2p
  var self = this;

  socket.on('disconnect', function() {
    lp.connected = false
  })

  socket.on('handshake', function() {
    lp.connected = true
    socket.emit('joinRoom', {
      name: roomName, 
      page: lp.name,
      globals: lp.globals
    })
  })

  socket.on('joinRoom', function(data) {
    userId = data.id
    p2p.upgrade()
  })

  socket.on('globalChange', function(data) {
    var v = data.v
    var value = data.value

    lp.forwardGlobalChange(v, value)
  })

  p2p.on('upgrade', function() {
    var when_bound_to_y = function() {
      self.init({
        role : "slave",
        syncMethod : "syncAll",
        user_id : userId
      });

      self.userJoined("broadcastUser", "slave")
    }

    if(self.is_bound_to_y){
      when_bound_to_y();
    } else {
      self.on_bound_to_y = when_bound_to_y;
    }
  })

  p2p.on('liquid-message', function(data) {
    self.receiveMessage("broadcastUser", data)
  })
}

Liquid.prototype.send = function(uid, message){
  this.p2p.emit('liquid-message', message)
};

Liquid.prototype.broadcast = function(message){
  this.p2p.emit("liquid-message", message);
};

Liquid.prototype.globalChange = function(v, value) {
  this.socket.emit('globalChange', {variable: v, value: value})
}

if(window !== undefined){
  if(window.Y !== undefined){
    window.Y.Liquid = Liquid;
  } else {
    console.err("You must first include Y, and then the Liquid Connector!");
  }
}
if(typeof module !== 'undefined'){
  module.exports = Liquid;
}

