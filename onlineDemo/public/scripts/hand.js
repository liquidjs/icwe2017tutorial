var load = function() {
	window.type = 'hand'

	window.deck = undefined
	window.hand = undefined

  liquidConfig.secure = location.protocol == 'https:' ? true : false
  
	liquidConfig.websocketCustomData = {
    type: window.type
  };

  Liquid.addEventListener("handInfo", function(e){
  	window.deck = e.deck
  	window.hand = e.number
  	document.getElementById('numberTag').innerHTML = e.number
  	Liquid.triggerUIEvent('handChange');
  });

	Liquid.configure(liquidConfig)
	.then(function(){
    Liquid.setUsername('h')
		return Liquid.loadComponent('card')
	}).then(function(){
		// Liquid.createComponent('card', document.querySelector('#container'), {bindings: {
  //     view: 'back',
  //     card: 'card spades rank13'
  //   }})
	})
}
