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
  var offScreenContext;
  var offScreenCanvasWidth;
  var offScreenCanvasHeight;
  var onScreenCanvas;
  var onScreenContext;
  var onScreenCanvasWidth;
  var onScreenCanvasHeight;
  var viewportPosition = { x : 0, y : 0 };
  var viewportWidth;
  var viewportHeight;
  var lastScrollPosition = {};
  var mouseDown = false;
  var zoomFactor = 1;
  
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
  
  function centerViewport(scaleFactor, zoomIn){
    var scaledViewportWidth = zoomIn? onScreenCanvasWidth / scaleFactor : viewportWidth;
    var scaledViewportHeight = zoomIn? onScreenCanvasHeight / scaleFactor : viewportHeight;
    var newX = scaledViewportWidth; 
    var newY = scaledViewportHeight;
    if (!zoomIn) {
      newX = -newX;
      newY = -newY;
    }
    newX = viewportPosition.x + newX / 2; 
    newY = viewportPosition.y + newY / 2; 
    if (newX < 0 || newY < 0) {
      return;
    }
    viewportPosition.x = newX, 
    viewportPosition.y = newY;
  }

  function scaleViewport(zoomFactor){
    viewportWidth = onScreenCanvasWidth / zoomFactor;
    viewportHeight = onScreenCanvasHeight / zoomFactor;
  }
  
  function draw(){
    // onScreenContext.putImageData(offScreenCanvas.getImageData(viewportPosition.x, viewportPosition.y, viewportWidth, viewportHeight), 0, 0);
    scaleViewport(zoomFactor); 
    onScreenContext.clearRect(0, 0, viewportWidth, viewportHeight);
    onScreenContext.drawImage(offScreenCanvas, viewportPosition.x, viewportPosition.y, viewportWidth, viewportHeight, 0, 0, onScreenCanvasWidth, onScreenCanvasHeight);
  }
  
  function mouseMoved(event){
    var scrollVector;
    var mousePosition;
    if (mouseDown) {
      scrollVector = {};
      mousePosition = {};
      mousePosition.x = event.layerX || event.offsetX; 
      mousePosition.y = event.layerY || event.offsetY;
      scrollVector.x = lastScrollPosition.x - mousePosition.x; 
      scrollVector.y = lastScrollPosition.y - mousePosition.y;
      if (viewportPosition.x + scrollVector.x >= 0 && 
          viewportPosition.x + scrollVector.x + viewportWidth <= offScreenCanvasWidth ) {
            viewportPosition.x = viewportPosition.x + scrollVector.x / zoomFactor;
            lastScrollPosition.x = mousePosition.x;
      }
          
      if(viewportPosition.y + scrollVector.y >= 0 && 
         viewportPosition.y + scrollVector.y + viewportHeight <= offScreenCanvasHeight ) {
           viewportPosition.y = viewportPosition.y + scrollVector.y / zoomFactor;
           lastScrollPosition.y = mousePosition.y;
      }
      draw();
    }
  }
  
  var buttonPressed = function(event){
    mouseDown = true;
    lastScrollPosition.x = event.layerX || event.offsetX;
    lastScrollPosition.y = event.layerY || event.offsetY;
  }
  
  var buttonReleased = function(){
    mouseDown = false;
  }
  
  var mouseOut = function(){
    mouseDown = false;
  }
  
  var wheelMoved = function (event){
    var wheel = event.wheelDelta/120;//n or -n
    var newZoomFactor = wheel > 0? zoomFactor*2 : zoomFactor/2;
    if (newZoomFactor >= 1 && newZoomFactor < zoomFactor || // Zoom out
        newZoomFactor > zoomFactor && viewportHeight >= 2 && viewportWidth >= 2) { // Zoom In
      centerViewport(newZoomFactor, newZoomFactor > zoomFactor);    
      zoomFactor = newZoomFactor; 
      draw();
    }
  }
  
  FITS.renderFile = function(file, canvas, success){
    var fitsParser = new FITS.FileParser();
    
    canvas.onmousedown = buttonPressed;
    canvas.onmouseup = buttonReleased;
    canvas.addEventListener('mousemove', mouseMoved, false);
    canvas.addEventListener('mouseout', mouseOut, false);
    canvas.addEventListener('mousewheel', wheelMoved, false);

    offScreenCanvas = document.createElement('canvas');
    onScreenCanvas = canvas;
    onScreenContext = onScreenCanvas.getContext('2d');
    offScreenContext = offScreenCanvas.getContext('2d');
    onScreenCanvas.onselectstart = function () { return false; } // ie 
    viewportWidth = parseInt(canvas.getAttribute('width'));
    viewportHeight = parseInt(canvas.getAttribute('height'));
    
    fitsParser.onParsed = function(headerDataUnits){
      var HDUs = headerDataUnits;
      var pixels = FITS.parsePixels(HDUs[0].header, HDUs[0].data, 'RGBA', 'linear');
      var imageWidth = HDUs[0].header.NAXIS1;
      var imageHeight = HDUs[0].header.NAXIS2;
      offScreenCanvas.setAttribute('width', imageWidth);
      offScreenCanvas.setAttribute('height', imageHeight);
      offScreenCanvasWidth = imageWidth;
      offScreenCanvasHeight = imageHeight;
      viewportWidth = offScreenCanvasWidth >= viewportWidth? viewportWidth : offScreenCanvasWidth;
      viewportHeight = offScreenCanvasHeight >= viewportHeight? viewportHeight : offScreenCanvasHeight;
      onScreenCanvasWidth = viewportWidth;
      onScreenCanvasHeight = viewportHeight;
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