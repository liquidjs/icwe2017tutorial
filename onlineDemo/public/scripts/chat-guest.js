var load = function() {
	window.type = 'chat'
	
	liquidConfig.secure = location.protocol == 'https:' ? true : false
	
	liquidConfig.websocketCustomData = {
    type: window.type
  };

  Liquid.addEventListener("chatInfo", function(e){
  	for(var i = 0; i < e.devices.length; i++) {
  		if(Liquid.getDeviceId() == e.devices[i].deviceId) {
  			Liquid.setUsername('c' + i)
  			Liquid.triggerSpatialEvent('username', 'c' + i)
  		}
  	}
  });

	Liquid.configure(liquidConfig)
	.then(function() {
		return Liquid.createComponent('spatial-configure', document.querySelector('.toolbar'), {})
	}).then(function(){
		document.querySelector('.buttons').style.display = 'flex'
	})

	var randomNumber = Math.floor(Math.random() * (1000000 - 0)) + 0;
	document.querySelector('#nickname').value = 'guest' + randomNumber

	
}

var getNickname = function() {
	return document.querySelector('#nickname').value
}