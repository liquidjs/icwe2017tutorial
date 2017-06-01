var getColorAtOffset = function(data, offset) {
	return {
		red: data[offset],
		green: data[offset + 1],
		blue: data[offset + 2],
		alpha: data[offset + 3]
	};
}

var bound = function(value, interval) {
	return Math.max(interval[0], Math.min(interval[1], value));
}

var effects = function(canvas, filter, options) {

	var context = canvas.getContext("2d");
	var imageData = context.getImageData(0,0, canvas.width, canvas.height);

	imageData.data = Filters[filter](canvas, imageData.data, options)

	context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL()
}