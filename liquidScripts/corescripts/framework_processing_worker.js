var worker = {
	id: undefined,
	closeRequest: false,
}

onmessage = function(event) {
	var data = event.data
	var type = data.type
	switch(type) {
		case "close":
			worker.closeWorker = true
			break;
		case "configuration":
			worker.id = data.id
			break;
		default:
			console.log(data)
			break;
	}
}

var closeWorker = function() {
	postMessage({
		type: "close",
		id: worker.id
	})
	close()
}