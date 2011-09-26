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
  
  function renderImage(canvas, pixels, width, height){
    var context = canvas.getContext("2d");
    var image = context.createImageData(width, height);
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
  
  FITS.renderFile = function(file, canvas, success){
    var fitsParser = new FITS.FileParser();
    fitsParser.onParsed = function(headerDataUnits){
      var HDUs = headerDataUnits;
      var pixels = FITS.parsePixels(HDUs[0].header, HDUs[0].data, 'RGBA', 'linear');
      var imageWidth = HDUs[0].header.NAXIS1;
      var imageHeight = HDUs[0].header.NAXIS2;
      canvas.setAttribute('width', imageWidth);
      canvas.setAttribute('height', imageHeight);
      renderImage(canvas, pixels, imageWidth, imageHeight);
      console.log("File read!");
      if(success){
        success();
      }
    }
    var fitsHeader = fitsParser.parse(file);
  }
  
}).call(this);