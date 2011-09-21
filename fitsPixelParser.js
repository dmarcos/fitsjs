// Parses FITS pixel data and converts to the desired format
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

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

  function convertToRGBA(pixelValue){
    return pixelValue;
  }
  
  var pixelFormats = { 
    "RGBA": { "size": 4, "convert" : convertToRGBA },
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
    
  FITS.parsePixels = function (header, data, format) {
    
    var pixels = [];
    var bzero = header.BZERO || 0.0;
    var bscale = header.BSCALE || 1.0;
    var bitpix = header.BITPIX;
    var pixelSize = Math.abs(bitpix) / 8; // In bytes
    var pixelValue;
    var dataView;
    var remainingDataBytes = data.length;
    
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
      pixelValue = pixelFormats[format].convert(pixelValue);
      pixels.push(pixelValue);
      remainingDataBytes -= pixelSize;
    }
    
    return pixels;
  };

}).call(this);