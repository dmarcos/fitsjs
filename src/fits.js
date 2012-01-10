define(['./fitsParser'], function (fitsParser) {
  "use strict";

  var FITSFileParser = fitsParser.FileParser;  
  var mapPixels = fitsParser.mapPixels;

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

  var pixelValues = [];

  var highLightedPixel;
  
  var renderPixels = function(pixels, canvas){
    var context = canvas.getContext("2d");
    var image = context.createImageData(canvas.getAttribute('width'), canvas.getAttribute('height'));
    var pixelIndex = 0;
    var currentPixel; 
    pixelValues = [];
    while (pixelIndex < pixels.length) {
      currentPixel = pixels[pixelIndex]; 
      image.data[pixelIndex*4] = currentPixel.red;
      image.data[pixelIndex*4 + 1] = currentPixel.green;
      image.data[pixelIndex*4 + 2] = currentPixel.blue;
      image.data[pixelIndex*4 + 3] = currentPixel.alpha;
      pixelValues.push(currentPixel.value);
      pixelIndex += 1;
    }
    context.putImageData(image, 0, 0);
  };

  var cursorToPixel = function(cursorX, cursorY){
    var viewportPixelX = cursorX / zoomFactor;
    var viewportPixelY = cursorY / zoomFactor;
    var xCoordinate = Math.floor(viewportPosition.x + viewportPixelX);
    var yCoordinate = Math.floor(viewportPosition.y + viewportPixelY);
    var raDec;
    var cursorInfo = {
      "x" : xCoordinate,
      "y" : yCoordinate,
      "value" : pixelValues[xCoordinate + yCoordinate*offScreenCanvasHeight]
    };
    if (FITS.wcsMapper) {
      raDec = FITS.wcsMapper.pixelToCoordinate(xCoordinate, yCoordinate);
      cursorInfo.ra = raDec.ra;
      cursorInfo.dec = raDec.dec;
    }
    return cursorInfo;
  };

  var coordinateToCanvasPixel = function(x,y){
    var imageCoordinates = cursorToPixel(x, y);
    var viewportCoordinates = cursorToPixel(x, y);
  };
  
  var centerViewport = function(scaleFactor, zoomIn, cursorX, cursorY){
    var newPositionX;
    var newPositionY;
    var translationX = cursorX / scaleFactor;
    var translationY = cursorY / scaleFactor;
    var xOffset = zoomIn? translationX : - translationX / 2; 
    var yOffset = zoomIn? translationY : - translationY / 2; 
    newPositionX = viewportPosition.x + xOffset; 
    newPositionY = viewportPosition.y + yOffset; 
    if (newPositionX < 0 || newPositionY < 0) {
      return;
    }
    viewportPosition.x = newPositionX;
    viewportPosition.y = newPositionY;
  };

  var scaleViewport = function(zoomFactor){
    viewportWidth = onScreenCanvasWidth / zoomFactor;
    viewportHeight = onScreenCanvasHeight / zoomFactor;
  };

  var copyPixels = function(){
    var zoomedImage = onScreenContext.createImageData(onScreenCanvasWidth, onScreenCanvasHeight);
    var viewportImage = onScreenContext.getImageData(viewportPosition.x, viewportPosition.y, viewportWidth, viewportHeight);
    var row = 0;
    var column = 0;
    var copied = 0;
    while (row < viewportImage.width) {
      while (column < viewportImage.height) {
        while (copiedRows < zoomFactor){
          zoomedImage[row*viewportWidth + column + copied] = viewportImage.data[row*viewportWidth + column];
          zoomedImage[row*viewportWidth + column + copied + 1] = viewportImage.data[row*viewportWidth + column + 1];
          zoomedImage[row*viewportWidth + column + copied + 2] = viewportImage.data[row*viewportWidth + column + 2];
          zoomedImage[row*viewportWidth + column + copied + 3] = viewportImage.data[row*viewportWidth + column + 3];
        }


      }
      row += 1;
    }
  };
  
  var draw = function(){
    // onScreenContext.putImageData(offScreenCanvas.getImageData(viewportPosition.x, viewportPosition.y, viewportWidth, viewportHeight), 0, 0);
    scaleViewport(zoomFactor); 
    onScreenContext.clearRect(0, 0, onScreenCanvasWidth, onScreenCanvasHeight);
    onScreenContext.drawImage(offScreenCanvas, viewportPosition.x, viewportPosition.y, viewportWidth, viewportHeight, 0, 0, onScreenCanvasWidth, onScreenCanvasHeight);
    //if (highLightedPixel) {
    //  onScreenContext.fillStyle = "rgba(255, 0, 0, 0.5)"; 
    //  onScreenContext.fillRect(highLightedPixel.x, highLightedPixel.y, highLightedPixel.size, highLightedPixel.size);
    //}
  };

  var highlightPixel = function(mouseX, mouseY){
    var xCoordinate = Math.floor(mouseX / zoomFactor);
    var yCoordinate = Math.floor(mouseY / zoomFactor);
    var size = zoomFactor;
    highLightedPixel = {
      "x" : xCoordinate,
      "y" : yCoordinate,
      "size" : size
    };
  };
  
  var onHoverPixelChanged = function(pixelInfo) {
    console.log("Pixel: " + pixelInfo.x + " " + pixelInfo.y + " " + pixelInfo.value);  
  };

  var mouseMoved = function(event){
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
    onHoverPixelChanged(cursorToPixel(event.offsetX, event.offsetY));
    //highlightPixel(event.offsetX, event.offsetY);
  };
  
  var buttonPressed = function(event){
    mouseDown = true;
    lastScrollPosition.x = event.layerX || event.offsetX;
    lastScrollPosition.y = event.layerY || event.offsetY;
  };
  
  var buttonReleased = function(){
    mouseDown = false;
  };
  
  var mouseOut = function(){
    mouseDown = false;
  };

  var zoom = function(newZoomFactor, mouseX, mouseY){
    if (newZoomFactor >= 1 && newZoomFactor < zoomFactor || // Zoom out
        newZoomFactor > zoomFactor && viewportHeight >= 2 && viewportWidth >= 2) { // Zoom In
      centerViewport(newZoomFactor, newZoomFactor > zoomFactor, mouseX, mouseY);    
      zoomFactor = newZoomFactor; 
      //highlightPixel(event.offsetX, event.offsetY);
      draw();
    }
  };

  var doubleClick = function (event) {
    zoomIn(event.offsetX, event.offsetY);
  };

  var zoomIn = function(mouseX, mouseY) {
    zoom(zoomFactor*2, mouseX, mouseY);
  };
  
  var wheelMoved = function (event){
    var wheel = event.wheelDelta/120;//n or -n
    zoom(wheel > 0? zoomFactor*2 : zoomFactor/2, event.offsetX, event.offsetY);
  };
  
  var renderFile = function(file, canvas, success){
    var fitsParser = new FITSFileParser();
    
    canvas.onmousedown = buttonPressed;
    canvas.onmouseup = buttonReleased;
    canvas.addEventListener('mousemove', mouseMoved, false);
    canvas.addEventListener('mouseout', mouseOut, false);
    canvas.addEventListener('mousewheel', wheelMoved, false);
    canvas.ondblclick = doubleClick;

    offScreenCanvas = document.createElement('canvas');
    offScreenContext = offScreenCanvas.getContext('2d');

    onScreenCanvas = canvas;
    onScreenContext = onScreenCanvas.getContext('2d');
    viewportWidth = parseInt(onScreenCanvas.getAttribute('width'), 10);
    viewportHeight = parseInt(onScreenCanvas.getAttribute('height'), 10);
    onScreenContext.clearRect(0, 0, viewportWidth, viewportHeight);
    onScreenCanvas.style.width = viewportWidth + 'px';
    onScreenCanvas.style.height = viewportHeight + 'px';

    onScreenCanvas.onselectstart = function () { return false; }; // ie 

    zoomFactor = 1;
    
    fitsParser.onParsed = function(headerDataUnits){
      var HDUs = headerDataUnits;
      var pixels = mapPixels(HDUs[0].header, HDUs[0].data, 'RGBA', 'linear');
      //if (FITS.WCS) {
      //  FITS.wcsMapper = new FITS.WCS(HDUs[0].header);
      //}
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
    };
    var fitsHeader = fitsParser.parse(file);
  };

  return {
    'onHoverPixelChanged' : onHoverPixelChanged,
    'renderFile' : renderFile
  };
  
});