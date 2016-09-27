function logEvent(str) {
  console.log(str);
  var d = document.createElement('div');
  d.innerHTML = str;
  document.getElementById('result').appendChild(d);
}
function clearEvent() {
	document.getElementById('result').innerHTML = "";
}


function logError(message) {
  $('#myProgress')
        .attr('class', 'progress-bar progress-bar-danger')
        .css('width', '100%')
        .attr('aria-valuenow', 100).html(message);
  logEvent(message);
}

function getImageDim(image) {
	var result = {};
	document.body.appendChild(image);
	result['width'] = image.offsetWidth;
	result['height'] = image.offsetHeight;
	document.body.removeChild(image);
	return result;
}

function createContext(width, height) {
	var canvas = document.createElement('canvas');
	canvas.width = width;
        canvas.height = height;
        return canvas.getContext("2d");
}

function downloadZIP(url,detect_age_gender) {
	JSZipUtils.getBinaryContent(url, function(err, data) {
		try {
			JSZip.loadAsync(data).then(function(zip) {
				return zip.file("oAgeGender.json").async("string");
			}).then(function success(text) {
				detect_age_gender($.parseJSON(text));	
			}, function error(e) {
				logError( e);
			});
		} catch (e) {
			logError(e);
		}
	});
}




function preproc(targetLen, model,image,value, callback) {
   /* get canvas and main image*/
   var canvas = document.getElementById('output');
   var context  = canvas.getContext("2d");
		var xStart = value[0][0];
		var yStart = value[0][1];
		var absol_width = value[1][0];
		var absol_height = value[1][1];
		logEvent("Detected face: xStart="+xStart+" yStart="+yStart+" width="+absol_width+" height="+absol_height);


		var dimLargeImage = getImageDim(image);
		canvas_one_face = document.createElement('canvas');
		canvas_one_face.width = absol_width;
	        canvas_one_face.height = absol_height;
	        context_one_face = canvas_one_face.getContext("2d");
		context_one_face.drawImage(image,xStart,yStart,absol_width,absol_height,0,0,absol_width,absol_height);

  		var targetLen = 224;
   		
		var image_one_face = new Image();
		image_one_face.setAttribute('crossOrigin', 'anonymous');
		image_one_face.onload = function () {

  			var sourceWidth = this.width;
 	 		var sourceHeight = this.height;
			var shortEdge = Math.min(this.width, this.height);
			var yy = Math.floor((sourceHeight - shortEdge) / 2);
			var xx = Math.floor((sourceWidth - shortEdge) / 2);		
			

			var canvas_resized = document.createElement('canvas');
			canvas_resized.width = targetLen;
			canvas_resized.height = targetLen;
			var context_resized = canvas_resized.getContext("2d");
			
    			context_resized.drawImage(image_one_face,xx, yy, shortEdge, shortEdge, 0, 0,targetLen, targetLen);
				
			
			var image_resized = new Image();
			image_resized.onload=function () {
    				 var imgdata = context_resized.getImageData(0, 0, targetLen, targetLen);
				 var data = new Float32Array(targetLen * targetLen * 3);
				 var stride = targetLen * targetLen;
	
    				for (var i = 0; i < stride; ++i) {
   				   data[stride * 0 + i] = imgdata.data[i * 4 + 0] - 120;
      				   data[stride * 1 + i] = imgdata.data[i * 4 + 1] - 114;
      				   data[stride * 2 + i] = imgdata.data[i * 4 + 2] - 109;
    				}
    				nd = ndarray(data, [1, 3, targetLen, targetLen]);		
   				callback(nd,model);
			}
			image_resized.src =canvas_resized.toDataURL("image/png");
		}
		
		image_one_face.src =canvas_one_face.toDataURL("image/png");
}

function drawRectangleFaces(findValues) {
   var length = findValues.length;
   for (var indeValue = 0; indeValue < length; indeValue++) {
   	var coords = findValues[indeValue];
	var canvas = document.getElementById("output");
	var ctx = canvas.getContext("2d");
	ctx.rect(coords[2][0],coords[2][1],coords[3][0],coords[3][1]);
	ctx.stroke();

   }

}




function forwardAndShowResults(nd,model) {  
       		   pred = new Predictor(model, {'data': [1, 3, 224, 224]});
		   pred.setinput('data', nd);
		
		   var start = new Date().getTime();
	           logEvent("start... prediction... this can take a while");
		   pred.forward();
	           logEvent("finished prediction....");
	
	           out = pred.output(0);
       		   var index = new Array();
       		   for (var i=0;i<out.data.length;i++) {
       	      		index[i] = i;
                   }
	   
		   max_output = 5;
       		   index.sort(function(a,b) {return out.data[b]-out.data[a];});
		   var end = new Date().getTime();
        	   var time = (end - start) / 1000;
	

        	   logEvent("time-cost=" + time + " sec");
        	   for (var i = 0; i < max_output; i++) {
        	     	logEvent('Top-' + (i+1) + ':' + model.synset[index[i]] + ', value=' + out.data[index[i]]);
        	   }

	            pred.setinput('data', nd);
		   out = pred.output(1);
		   var index = new Array();
		   for (var i=0;i<out.data.length;i++) {
		     index[i] = i;
		   }  

 		   max_output = 2;        
		   index.sort(function(a,b) {return out.data[b]-out.data[a];});
		       for (var i = 0; i < max_output; i++) {
		     logEvent('Top-' + (i+1) + ':' + model.synset[index[i]+14] + ', value=' + out.data[index[i]]);
		   }
		   pred.destroy();
		   

}

function isFace(image,findValues) {
      drawRectangleFaces(findValues);
      downloadZIP("./model/oAgeGender.zip", function(model) {
   	var length = findValues.length;
	for (var indexValue = 0; indexValue < length; indexValue++) {	
		var points_one_face = findValues[indexValue];
       		preproc(224, model, image,points_one_face, forwardAndShowResults);
	}

   });

}

function predict (src,async) {
       clearEvent();
       logEvent("Processing image...");
       detectNewFace(src,async, isFace);
}


function detectNewFace(src, async, isFace) {
	
	var elapsed_time = (new Date()).getTime();
	var image = new Image();
	var canvas = document.getElementById("output");
	var ctx = canvas.getContext("2d");
	image.onload = function () {
		/* load image, and draw it to canvas */

		var boundingWidth = document.getElementById("content").offsetWidth - 4;
		var boundingHeight = window.innerHeight - document.getElementById("header").offsetHeight - 120;
		var viewport = document.getElementById("viewport");
		var newWidth = this.width, newHeight = this.height, scale = 1;
		if (this.width * boundingHeight > boundingWidth * this.height) {
			newWidth = boundingWidth;
			newHeight = boundingWidth * this.height / this.width;
			scale = newWidth / this.width;
		} else {
			newHeight = boundingHeight;
			newWidth = boundingHeight * this.width / this.height;
			scale = newHeight / this.height;
		}
		viewport.style.width = newWidth.toString() + "px";
		viewport.style.height = newHeight.toString() + "px";
		canvas.width = newWidth;
		canvas.style.width = newWidth.toString() + "px";
		canvas.height = newHeight;
		canvas.style.height = newHeight.toString() + "px";
		ctx.drawImage(image, 0, 0, newWidth, newHeight);
		elapsed_time = (new Date()).getTime();
		function post(comp) {		
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'rgba(230,87,0,0.8)';

			var factorUp = 0.60;
			var factorDown = 0.50;
			var factorLeft = 0.50;
			var factorRight = 0.50;

			var findValues = [];

			/* draw detected area */
			for (var i = 0; i < comp.length; i++) {

				var offsetLeft = (comp[i].width * factorLeft);
				var offsetRight = offsetLeft+(comp[i].width * factorRight);
				var offsetUp = (comp[i].height * factorUp);
				var offsetDown = offsetUp+(comp[i].height * factorDown);

				var xStart = comp[i].x; 
				xStart = xStart - offsetLeft;
				if (xStart < 0) {
					xStart = 0;
				}
				var xStartScaled = xStart*scale;

				var yStart = comp[i].y;
				yStart = yStart - offsetUp;
				if (yStart < 0) {
					yStart = 0;
				}
				var yStartScaled = yStart*scale;

				var newWidth = comp[i].width;
				newWidth = newWidth + offsetRight;
				if (newWidth > this.width) {
					newWidth = this.width;
				}
				var widthScaled = newWidth*scale;

				var newHeight = comp[i].height;
				newHeight = newHeight + offsetDown;
				
				if (newHeight > this.height) {
					newHeight = this.height;
				}
				var heightScaled = newHeight*scale;
/*
				if (newWidth < 128 || newHeight < 128) {
					logEvent("Discarded, too small face");
					continue;
				} */
				
				var newValue = [[xStart,yStart],[newWidth,newHeight],[xStartScaled,yStartScaled],[widthScaled,heightScaled]];
				findValues.push(newValue);


				/* apply second step of face detection */
			}
			if (findValues.length ==0 ) { 
				logError("It was not detected faces");
			} else {
				isFace(image,findValues);
			}
		}
		/* call main detect_objects function */
		if (async) {
			ccv.detect_objects({ "canvas" : ccv.grayscale(ccv.pre(image)),
								 "cascade" : cascade,
								 "interval" : 5,
								 "min_neighbors" : 1,
								 "async" : true,
								 "worker" : 1 })(post);
		} else {
			var t0=performance.now();
			var comp = ccv.detect_objects({ "canvas" : ccv.grayscale(ccv.pre(image)),
											"cascade" : cascade,
											"interval" : 5,
											"min_neighbors" : 1 });
			var t1=performance.now();
			logEvent("time:" + (t1-t0)+ " milliseconds");
			post(comp);
		}
	};
	image.src = src;
}

function handleLocalFile(file) {
	if (file.type.match(/image.*/)) {
		var reader = new FileReader();
		reader.onload = function (e) {
			predict(e.target.result, async);
		};
		reader.readAsDataURL(file);
	}
}
