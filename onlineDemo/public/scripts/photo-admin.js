var load = function() {
  let video = document.getElementById("video")
  let canvas = document.getElementById("canvas")
  let photo = document.getElementById("photo")
  let ctx = canvas.getContext('2d');

  if (navigator.getUserMedia == undefined) {
    navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.getUserMedia;
    window.URL = window.URL || window.webkitURL;
  }
  var videoConstraints = {
    mandatory: {
      maxHeight: 240,
      maxWidth: 300
    },
    optional: []
  };


  let noStream = function (e) {
    console.log('Fail to load stream');
    console.log(e);
  }

  let yesStream = function (stream) {
    video.src = window.URL.createObjectURL(stream);
  }

  navigator.getUserMedia({ video: videoConstraints}, yesStream, noStream);

	window.type = 'photo'

  if (location.protocol != 'https:' && location.hostname != 'localhost' && location.hostname != '127.0.0.1') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
  }

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
	}).then(function(){
		document.querySelector('.container').style.display = 'flex'
	})
}