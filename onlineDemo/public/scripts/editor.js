let load = function() {
	window.type = 'editor'

	liquidConfig.secure = location.protocol == 'https:' ? true : false

  Liquid.addEventListener("editorInfo", function(e){
  	console.log(e)
  	for(var i = 0; i < e.devices.length; i++) {
  		if(Liquid.getDeviceId() == e.devices[i].deviceId) {
  			Liquid.setUsername('ed' + i)
  			Liquid.triggerSpatialEvent('username', 'ed' + i)
  		}
  	}
  });

  liquidConfig.websocketCustomData = {
    type: window.type
  }
  
	Liquid.configure(liquidConfig)
	.then(function() {
		return Liquid.createComponent('spatial-configure', document.querySelector('.toolbar'), {})
	})
	.then(function(){
		return Liquid.loadAndCreateComponent('generator', document.querySelector('.generator'), {'liquidui': 'spatial1'})
	}).then(function(){
		// document.querySelector('.buttons').style.display = 'flex'
	})

	// var randomNumber = Math.floor(Math.random() * (1000000 - 0)) + 0;
	// document.querySelector('#nickname').value = 'guest' + randomNumber

	// document.querySelector('#addChat').addEventListener("click", function(){
	// 	Liquid.loadAndCreateComponent('chat', document.querySelector('.verticalContainer'), {'liquidui': 'spatial1'})
	// })
}