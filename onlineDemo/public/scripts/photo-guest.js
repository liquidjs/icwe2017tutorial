var load = function() {
	window.type = 'photo'

  liquidConfig.secure = location.protocol == 'https:' ? true : false
  
	liquidConfig.websocketCustomData = {
    type: window.type
  };

  Liquid.addEventListener("photoInfo", function(e){
  	for(var i = 0; i < e.devices.length; i++) {
  		if(Liquid.getDeviceId() == e.devices[i].deviceId) {
  			Liquid.setUsername('p' + i)
  			Liquid.triggerSpatialEvent('username', 'p' + i)
  		}
  	}
  });

	Liquid.configure(liquidConfig)
	.then(function() {
		return Liquid.createComponent('spatial-configure', document.querySelector('.toolbar'), {})
	})
}