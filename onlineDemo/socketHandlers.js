let path = require('path')
let minimist = require('minimist')
let args = minimist(process.argv)
let configPath = path.join('..', args.c ? args.c : 'config.js')
let config = require(configPath);

let demoVisibility = config.demoVisibility

module.exports = function(io){
  const EventEmitter = require('events')
  const emitter = new EventEmitter()

  let deck = undefined
  let hands = []
  let handsInfo = []

  let photos = []
  let photosInfo = []

  let chats = []
  let chatsInfo = []

  let editors = []
  let editorsInfo = []

  let sendHandsInfo = function() {
  	if(deck != undefined) {
	  	for(let i = 0; i < hands.length; i++) {
	  		hands[i].socket.emit("socketCustom", {
	        type: "handInfo",
	        message: {
	        	number: i+1,
	        	deck: deck.deviceId
	        }
	      })
			}
		}
  }

  let sendHandInfo = function(deviceId) {
  	if(deck != undefined) {
	  	for(let i = 0; i < hands.length; i++) {
	  		if(hands[i].deviceId == deviceId) {
	  			hands[i].socket.emit("socketCustom", {
		        type: "handInfo",
		        message: {
		        	number: i+1,
		        	deck: deck.deviceId
		        }
		      })
	  		}
			}
		}
  }

  let sendChatsInfo = function() {
    for(let i = 0; i < chats.length; i++) {
      chats[i].socket.emit("socketCustom", {
        type: "chatInfo",
        message: {
          devices: chatsInfo
        }
      })
    }
  }

  let sendPhotosInfo = function() {
    for(let i = 0; i < photos.length; i++) {
      photos[i].socket.emit("socketCustom", {
        type: "photoInfo",
        message: {
          devices: photosInfo
        }
      })
    }
  }

  let sendDeckInfo = function() {
  	if(deck != undefined) {
  		 deck.socket.emit("socketCustom", {
	      type: "deckInfo",
	      message: {
	      	hands: handsInfo
	      }
	    });
  	}
  }

  let sendEditorsInfo = function() {
    for(let i = 0; i < editors.length; i++) {
      editors[i].socket.emit("socketCustom", {
        type: "editorInfo",
        message: {
          devices: editorsInfo
        }
      })
    }
  }

  emitter.on('onConnect', function(e){
  	console.log('connected ' + e.data.type)

  	if(e.data.type == 'deck') {
  		if(deck == undefined) {
  			deck = {
  				deviceId: e.deviceId,
  				socket: e.socket
  			}

  			sendHandsInfo()
  			sendDeckInfo()
  		} else {
  			e.socket.emit("socketCustom", {
          type: "rejectDeck"
        });
  		}
  	}

  	if(e.data.type == 'hand') {
  		hands.push({
  			deviceId: e.deviceId,
  			socket: e.socket
  		})
  		handsInfo.push({
  			deviceId: e.deviceId
  		})

  		sendHandInfo(e.deviceId)
  		sendDeckInfo()
  	}

    if(e.data.type == 'photo') {
      photos.push({
        deviceId: e.deviceId,
        socket: e.socket
      })
      photosInfo.push({
        deviceId: e.deviceId
      })

      sendPhotosInfo(e.deviceId)
    }

    if(e.data.type == 'chat') {
      chats.push({
        deviceId: e.deviceId,
        socket: e.socket
      })
      chatsInfo.push({
        deviceId: e.deviceId
      })

      sendChatsInfo(e.deviceId)
    }

    if(e.data.type == 'editor') {
      editors.push({
        deviceId: e.deviceId,
        socket: e.socket
      })
      editorsInfo.push({
        deviceId: e.deviceId
      })

      sendEditorsInfo(e.deviceId)
    }
  })

  emitter.on('onDisconnect', function(e){
 		console.log('disconnect')
  	
  	if(e.data.type == 'deck') {
  		if(deck && deck.deviceId == e.deviceId) {
  			deck = undefined
  		}
  	} else if (e.data.type == 'hand'){
  		for(let i = 0; i < hands.length; i++) {
  			if(hands[i].deviceId == e.deviceId) {
  				hands.splice(i,1)
  				handsInfo.splice(i,1)
  				
  				sendHandsInfo()
  				sendDeckInfo()
  				return
  			}
  		}
  	} else if (e.data.type == 'chat'){
      for(let i = 0; i < chats.length; i++) {
        if(chats[i].deviceId == e.deviceId) {
          chats.splice(i,1)
          chatsInfo.splice(i,1)
          
          sendChatsInfo()
          return
        }
      }
    } else if (e.data.type == 'photo'){
      for(let i = 0; i < photos.length; i++) {
        if(photos[i].deviceId == e.deviceId) {
          photos.splice(i,1)
          photosInfo.splice(i,1)
          
          sendPhotosInfo()
          return
        }
      }
    } else if(e.data.type == 'editor'){
      for(let i = 0; i < editors.length; i++) {
        if(editors[i].deviceId == e.deviceId) {
          editors.splice(i,1)
          editorsInfo.splice(i,1)
          
          sendEditorsInfo()
          return
        }
      }
    }
  })

  return emitter
}
