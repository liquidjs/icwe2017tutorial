var addPicture = function(n) {
	var canvas = document.querySelector('#canvas')
  var ctx = canvas.getContext('2d');

  var image = new Image();
  image.onload = function(){
  	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  	Liquid.loadAndCreateComponent('picture', document.querySelector('.verticalContainer'), {'liquidui': 'spatial'})
  	.then(function(component){
      component.image = canvas.toDataURL('image/jpeg');
    })
  }
  image.src = "/images/unfilter" + n + ".png"
}

var takePicture = function() {
	let video = document.getElementById("video")
  let canvas = document.getElementById("canvas")
  let photo = document.getElementById("photo")
  let ctx = canvas.getContext('2d');

  ctx.drawImage(video, 0, 0, 300, 240);

	Liquid.loadAndCreateComponent('picture', document.querySelector('.verticalContainer'), {'liquidui': 'spatial'})
	.then(function(component){
    component.image = canvas.toDataURL('image/jpeg');
  })
}

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

var Filters = {
	grayscale: function(canvas, data, options) {
		for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
      	var offset = (i * canvas.width + j) * 4;
      	var colors = getColorAtOffset(data, offset)

      	var average = (colors.red + colors.green + colors.blue) / 3
				data[offset] = average;
				data[offset + 1] = average;
				data[offset + 2] = average;
				data[offset + 3] = colors.alpha;
    	}
  	}

  	return data
	},

	optGrayscale: function(canvas, data) {
		for (var i = 0; i < canvas.height; i++) {
	      for (var j = 0; j < canvas.width; j++) {
	      	var offset = (i * canvas.width + j) * 4;
	      	var colors = getColorAtOffset(data, offset)

					var avg = 0.2126 * colors.red + 0.7152 * colors.green + 0.0722 * colors.blue;
    			data[offset] = avg
    			data[offset + 1] = avg
    			data[offset + 2] = avg
	    }
	  }

  	return data
	},


	brightness: function(canvas, data, options) {
		var adjustment = options.adjustment || 40

		for (var i = 0; i < canvas.height; i++) {
	      for (var j = 0; j < canvas.width; j++) {
	      	var offset = (i * canvas.width + j) * 4;
	      	var colors = getColorAtOffset(data, offset)

	      	data[offset] += adjustment
    			data[offset + 1] += adjustment
    			data[offset + 2] += adjustment
	    }
	  }

  	return data
	},

	threshold: function(canvas, data, options) {
		var threshold = options.threshold || 100

		for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
      	var offset = (i * canvas.width + j) * 4;
      	var colors = getColorAtOffset(data, offset)

      	var avg = 0.2126 * colors.red + 0.7152 * colors.green + 0.0722 * colors.blue;
      	var newColor = (avg >= threshold) ? 255 : 0;

				data[offset] = newColor;
				data[offset + 1] = newColor;
				data[offset + 2] = newColor;
		  }
		}

  	return data
	},

	negative: function(canvas, data) {
		for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
      	var offset = (i * canvas.width + j) * 4;
      	var colors = getColorAtOffset(data, offset)

				data[offset] = 255 - colors.red;
				data[offset + 1] = 255 - colors.green;
				data[offset + 2] =  255 - colors.blue;
				data[offset + 3] = colors.alpha;
		  }
		}

  	return data
	},

	convolute: function(canvas, data, options) {
		var weights = options.weights || 
		// [1/9, 1/9, 1/9,
  //   1/9, 1/9, 1/9,
  //   1/9, 1/9, 1/9]
  	[0, -1, 0,
  	 -1, 5, 0,
  	  0, -1, 0]
		var side = Math.round(Math.sqrt(weights.length));
		var halfSide = Math.floor(side / 2);

		var opaque = options.opaque || false
		var alphaFactor = opaque ? 1 : 0;

		var tmpCanvas = document.createElement('canvas');
		var tmpCtx = tmpCanvas.getContext('2d');

		var tempImageData = tmpCtx.createImageData(canvas.width, canvas.height);
		var tempData = tempImageData.data	

		for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
      	tempI = i
      	tempJ = j
      	var offset = (i * canvas.width + j) * 4;

      	var red = 0
      	var green = 0
      	var blue = 0
      	var alpha = 0

      	for (var convI = 0; convI < side; convI++) {
        	for (var convJ = 0; convJ < side; convJ++) {
        		var tempConvI = tempI + convI - halfSide;
          	var tempConvJ = tempJ + convJ - halfSide;

          	if (tempConvI >= 0 && tempConvI < canvas.height && tempConvJ >= 0 && tempConvJ < canvas.width) {
	            var convOffset = (tempConvI * canvas.width + tempConvJ) * 4;
	            var wt = weights[(convI * side) + convJ];

	            red += data[convOffset] * wt;
	            green += data[convOffset + 1] * wt;
	            blue += data[convOffset + 2] * wt;
	            alpha += data[convOffset + 3] * wt;
          	}
        	}
        }

        tempData[offset] = red;
				tempData[offset + 1] = green;
				tempData[offset + 2] = blue;
				tempData[offset + 3] = alpha + alphaFactor * (255-alpha)
      }
    }

    for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
     		var offset = (i * canvas.width + j) * 4;

     		data[offset] = tempData[offset]
     		data[offset + 1] = tempData[offset + 1]
     		data[offset + 2] = tempData[offset + 2]
     		data[offset + 3] = tempData[offset + 3]
      }
    }

    return data
	},

	convoluteUnsigned: function(canvas, data, options) {
		var weights = options.weights || 
  	[0, -1, 0,
  	 -1, 5, -1,
  	  0, -1, 0]
		var side = Math.round(Math.sqrt(weights.length));
		var halfSide = Math.floor(side / 2);

		var opaque = options.opaque || false
		var alphaFactor = opaque ? 1 : 0;

		var tempData = new Array(canvas.height * canvas.width * 4)	

		for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
      	tempI = i
      	tempJ = j
      	var offset = (i * canvas.width + j) * 4;

      	var red = 0
      	var green = 0
      	var blue = 0
      	var alpha = 0

      	for (var convI = 0; convI < side; convI++) {
        	for (var convJ = 0; convJ < side; convJ++) {
        		var tempConvI = tempI + convI - halfSide;
          	var tempConvJ = tempJ + convJ - halfSide;

          	if (tempConvI >= 0 && tempConvI < canvas.height && tempConvJ >= 0 && tempConvJ < canvas.width) {
	            var convOffset = (tempConvI * canvas.width + tempConvJ) * 4;
	            var wt = weights[(convI * side) + convJ];

	            red += data[convOffset] * wt;
	            green += data[convOffset + 1] * wt;
	            blue += data[convOffset + 2] * wt;
	            alpha += data[convOffset + 3] * wt;
          	}
        	}
        }

        tempData[offset] = red;
				tempData[offset + 1] = green;
				tempData[offset + 2] = blue;
				tempData[offset + 3] = alpha + alphaFactor * (255-alpha)
      }
    }

    return tempData
	},

	contrast: function(canvas, data, options) {
		var contrast = options.contrast || 128
		var contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
		
		for (var i = 0; i < canvas.height; i++) {
	      for (var j = 0; j < canvas.width; j++) {
	      	var offset = (i * canvas.width + j) * 4;
	      	var colors = getColorAtOffset(data, offset)

	      	// var average = (colors.red + colors.green + colors.blue) / 3
					data[offset] = bound(Math.floor((colors.red - 128) * contrastFactor) + 128, [0, 255]);
					data[offset + 1] = bound(Math.floor((colors.green - 128) * contrastFactor) + 128, [0, 255]);
					data[offset + 2] =  bound(Math.floor((colors.blue - 128) * contrastFactor) + 128, [0, 255]);
					data[offset + 3] = colors.alpha;
	    }
	  }

  	return data
	},

	sobel: function(canvas, data, options) {
		var grayscale = data.slice()

		grayscale = Filters.convolute(canvas, grayscale, {})

		var horizontal = grayscale.slice()
		var vertical = grayscale.slice()

		vertical = Filters.convoluteUnsigned(canvas, vertical, {weights:[
				-1 ,-2 ,-1, 
				 0 ,0 ,0, 
				 1, 2, 1]})

		horizontal = Filters.convoluteUnsigned(canvas, horizontal, {weights:[
				-1,0, 1, 
				-2,0, 2, 
				-1,0, 1]})

		for (var i = 0; i < data.length; i += 4) {
			var v = Math.abs(vertical[i])
			var h = Math.abs(horizontal[i])
			var hv = Math.sqrt(Math.pow(h,2) + Math.pow(v,2))/4
		  data[i] = h;
		  data[i + 1] = v;
		  data[i + 2] = hv;
		  data[i + 3] = 255;
		}
	}
}

var asciiFromCanvas = function(canvas, options) {
	var characters = (" .,:;i1tfLCG08@").split("");

	var context = canvas.getContext("2d");
	
	var asciiCharacters = "";

	var contrast = options.contrast || 128
	var contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

	for (var y = 0; y < canvas.width; y += 2) { // every other row because letters are not square
		for (var x = 0; x < canvas.height; x++) {
			var offset = (y * canvas.width + x) * 4;

			var color = getColorAtOffset(imageData.data, offset);

			var contrastedColor = {
				red: bound(Math.floor((color.red - 128) * contrastFactor) + 128, [0, 255]),
				green: bound(Math.floor((color.green - 128) * contrastFactor) + 128, [0, 255]),
				blue: bound(Math.floor((color.blue - 128) * contrastFactor) + 128, [0, 255]),
				alpha: color.alpha
			};

			var brightness = (0.299 * contrastedColor.red + 0.587 * contrastedColor.green + 0.114 * contrastedColor.blue) / 255;
			var character = characters[(characters.length - 1) - Math.round(brightness * (characters.length - 1))];

			asciiCharacters += character;
		}
		asciiCharacters += "\n";
	}

	return asciiCharacters
}