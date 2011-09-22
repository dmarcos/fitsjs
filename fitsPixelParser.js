// Parses FITS pixel data and converts to the desired format
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

// FITS images have arbitrary pixel values. Cameras count individual photons
// Highest pixel value is the brightest and lowest value the faintest

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

  function convertToRGBA(pixelValue, highestPixelValue, lowestPixelValue, meanPixelValue){
    var colorValue = 255 * (pixelValue - lowestPixelValue) / (highestPixelValue - lowestPixelValue);
    return {
      "red" : colorValue,
      "green" : colorValue,
      "blue" : colorValue,
      "alpha" : 255
    }
  }
  
  function convertToRGB() {
     
  }
  
  var pixelFormats = { 
    "RGB" : { "size" : 4, "convert" : convertToRGB },
    "RGBA" : { "size" : 4, "convert" : convertToRGBA }
  };

  function readPixel(dataView, bitpix){
    var pixelValue;
    switch (bitpix) {
      case 8:
        pixelValue = dataView.getUint8();
        break;
      case 16:
        pixelValue = dataView.getUint16(0, false);
        break;
      case 32:
        pixelValue = dataView.getUint32(0, false);
        break;
      case 64:
        pixelValue = dataView.getFloat64(0, false);
        break;
      case -32:
        pixelValue = dataView.getFloat32();
        if (pixelValue){
          pixelValue = (1.0 + ((pixelValue & 0x007fffff) / 0x0800000)) * Math.pow(2, ((pixelValue&0x7f800000)>>23) - 127);
        }
        pixelValue = Math.abs(pixelValue);	
        break;
      case -64:
        pixelValue = dataView.getFloat64(0, false);
        break;
      default: 
        error('Unknown bitpix value');
    }
    return pixelValue; 
  }

  function error (message) {
    throw new Error('PIXEL PARSER - ' + message); 
  }
  
  function transposePixels(pixels, width, height){
    var transposedPixels = [];
    var column = 0;
    var row = 0;
    while (row < height) {
      column = 0;
      while (column < width) {
        transposedPixels[row*width + column] = pixels[column*height + row];
        column += 1;  
      }
      row += 1;
    } 
    return transposedPixels;
  }
    
  FITS.parsePixels = function (header, data, format) {
    
    var pixels = [];
    var bzero = header.BZERO || 0.0;
    var bscale = header.BSCALE || 1.0;
    var bitpix = header.BITPIX;
    var pixelSize = Math.abs(bitpix) / 8; // In bytes
    var pixelValue;
    var lowestPixelValue;
    var highestPixelValue;
    var meanPixelValue;
    var dataView;
    var remainingDataBytes = data.length;
    var imagePixelsNumber = header.NAXIS1 * header.NAXIS2;
    var i = 0;
    
    if (!format || !pixelFormats[format]) {
     error('Unknown pixel format');
    }
    
    if (!header) {
      error('No header available in HDU');
    }
    
    if (!data) {
      error('No data available in HDU');
    }
    
    dataView = new FITS.BinaryDataView(data);
    while(remainingDataBytes){
      pixelValue = readPixel(dataView, bitpix)*bscale + bzero;        
    
      if(!lowestPixelValue){
        lowestPixelValue = pixelValue;
      } else {
        lowestPixelValue = pixelValue < lowestPixelValue? pixelValue : lowestPixelValue;
      }
      
      if(!highestPixelValue){
        highestPixelValue = pixelValue;
      } else {
        highestPixelValue = pixelValue > highestPixelValue? pixelValue : highestPixelValue;
      }
      
      pixels.push(pixelValue);
      
      if(!meanPixelValue){
        meanPixelValue = pixelValue;
      } else {
        meanPixelValue = ((pixels.length - 1) / pixels.length) * meanPixelValue + (1 / pixels.length) * pixelValue; // Iterative mean formula
      }
      remainingDataBytes -= pixelSize;
    }
    
    // Convert pixels to the specified format
    while (i < imagePixelsNumber) {
      pixels[i] = pixelFormats["RGBA"].convert(pixels[i], highestPixelValue, lowestPixelValue, meanPixelValue);
      i += 1;
    }
    
    pixels = transposePixels(pixels, header.NAXIS1, header.NAXIS2); // FITS store pixels in column major order
    return pixels;
    
  };

}).call(this);