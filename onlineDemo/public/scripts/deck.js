var load = function() {
	window.type = 'deck'
	window.hands = []

	liquidConfig.secure = location.protocol == 'https:' ? true : false

	liquidConfig.websocketCustomData = {
    type: window.type,
    //TODO
    is: 'guest'
  };

  window.lockApp = false

  Liquid.addEventListener("rejectDeck", function(){
  	dialog.open()
  	window.lockApp = true
  });

  Liquid.addEventListener("deckInfo", function(e){
  	window.hands = e.hands
  });

  var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1
 	if (is_chrome == true) {
		Liquid.configure(liquidConfig)
		.then(function(){
			Liquid.setUsername('d')
			if(!lockApp) {
				return Liquid.loadComponent('card')
			}
		})
		.then(function() {
			if(!lockApp) {
				return Liquid.loadAndCreateComponent('deck', document.querySelector('#container'), {})
			}
		})
	} else {
    alert("Please use Google Chrome")
	}
}
