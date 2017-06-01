var load = function() {
	Liquid.configure(liquidConfig)
	.then(function() {
		Liquid.createComponent('migrate', document.querySelector('body'), {})
	}).then(function() {
		// Liquid.loadAndCreateComponent('text', document.querySelector('body'), {'liquidui': 'spatial'})
	})
}
