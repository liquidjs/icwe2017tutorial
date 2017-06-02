let load = function() {
	let liquidOptions = {
		host: 'localhost',
		port: 8888
	}

	Liquid.configure(liquidOptions)
	.then(function(){
		return Liquid.createComponent('migrate')
	})
}