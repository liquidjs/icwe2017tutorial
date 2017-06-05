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

  var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1
  if (is_chrome == true) {
		Liquid.configure(liquidConfig)
		.then(function() {
			return Liquid.createComponent('spatial-configure', document.querySelector('.toolbar'), {})
		})
		.then(function(){
			return Liquid.loadAndCreateComponent('chat', document.querySelector('.verticalContainer'), {'liquidui': 'spatial1'})
		}).then(function(){
			document.querySelector('.buttons').style.display = 'flex'
		})

		var randomNumber = Math.floor(Math.random() * (1000000 - 0)) + 0;
		document.querySelector('#nickname').value = 'guest' + randomNumber

		document.querySelector('#addChat').addEventListener("click", function(){
			Liquid.loadAndCreateComponent('chat', document.querySelector('.verticalContainer'), {'liquidui': 'spatial1'})
		})
	} else {
    alert("Please use Google Chrome")
	}
}

var getNickname = function() {
	return document.querySelector('#nickname').value
}