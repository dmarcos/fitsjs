(function () {
  "use strict";

  // Save a reference to the global object.
  var root = this;

  // The top-level namespace. Exported for both CommonJS and the browser.
  var FITS;
  if (typeof exports !== 'undefined') {
    FITS = exports;
  } else {
    FITS = root.FITS = root.FITS || {};
  }
  
  var offScreenCanvas;
  var onScreenCanvas;
  var viewportPosition = { x : 0, y : 0 };
  var viewportWidth;
  var viewportHeight;
  var mouseDown = false;
  
  function renderPixels(pixels, canvas){
    var context = canvas.getContext("2d");
    var image = context.createImageData(canvas.getAttribute('width'), canvas.getAttribute('height'));
    var pixelIndex = 0;
    var currentPixel;
    
    while (pixelIndex < pixels.length) {
      currentPixel = pixels[pixelIndex]; 
      image.data[pixelIndex*4] = currentPixel.red;
      image.data[pixelIndex*4 + 1] = currentPixel.green;
      image.data[pixelIndex*4 + 2] = currentPixel.blue;
      image.data[pixelIndex*4 + 3] = currentPixel.alpha;
      pixelIndex += 1;
    }
    context.putImageData(image, 0, 0);
  }
  
  function draw(){
    var offScreenContext = offScreenCanvas.getContext('2d');
    var onScreenContext = onScreenCanvas.getContext('2d');
    var pixels = offScreenContext.getImageData(viewportPosition.x, viewportPosition.y, viewportWidth, viewportHeight);
    onScreenContext.putImageData(pixels, 0, 0);
  }
  
  function mouseMoved(event){
    if (mouseDown) {
      if (event.layerX || event.layerX == 0) { // Firefox
        viewportPosition.x = event.layerX;
        viewportPosition.y = event.layerY;
      } else if (event.offsetX || event.offsetX == 0) { // Opera
        viewportPosition.x = event.offsetX;
        viewportPosition.y = event.offsetY;
      }
      console.log(viewportPosition.x + " " + viewportPosition.y);
      draw();
    }
  }
  
  var buttonPressed = function(){
    mouseDown = true;
  }
  
  var buttonReleased = function(){
    mouseDown = false;
  }
  
  FITS.renderFile = function(file, canvas, success){
    var fitsParser = new FITS.FileParser();
    
    canvas.onmousedown = buttonPressed;
    canvas.onmouseup = buttonReleased;
    canvas.addEventListener('mousemove', mouseMoved, false);
    offScreenCanvas = document.createElement('canvas');
    onScreenCanvas = canvas;
    viewportWidth = canvas.getAttribute('width');
    viewportHeight = canvas.getAttribute('height');
    
    fitsParser.onParsed = function(headerDataUnits){
      var HDUs = headerDataUnits;
      var pixels = FITS.parsePixels(HDUs[0].header, HDUs[0].data, 'RGBA', 'linear');
      var imageWidth = HDUs[0].header.NAXIS1;
      var imageHeight = HDUs[0].header.NAXIS2;
      offScreenCanvas.setAttribute('width', imageWidth);
      offScreenCanvas.setAttribute('height', imageHeight);
      renderPixels(pixels, offScreenCanvas);
      draw();
      console.log("File read!");
      if(success){
        success();
      }
    }
    var fitsHeader = fitsParser.parse(file);
  }
  
}).call(this);