// Parses FITS pixel data and converts to the desired format
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

// FITS images have arbitrary pixel values. Cameras count individual photons
// Highest pixel value is the brightest and lowest value the faintest

define(['./binaryDataView'], function (BinaryDataView) {
  "use strict";
  
  var mapPixel = function(pixelValue, colorMapping, maxColorValue, highestPixelValue, lowestPixelValue, meanPixelValue) {
    var mappedValue;
    var valuesRange = highestPixelValue - lowestPixelValue;
    switch (colorMapping) { 
        case 'linear' :
        mappedValue = maxColorValue * ((pixelValue - lowestPixelValue) / valuesRange );
        break;
      case 'sqrt' :
        mappedValue = maxColorValue * Math.sqrt((pixelValue - lowestPixelValue) / valuesRange );
        break;
      case 'cuberoot' :
        mappedValue = maxColorValue * Math.pow((pixelValue - lowestPixelValue) / valuesRange );
        break;
      case 'log' :
        mappedValue = maxColorValue * (Math.log((pixelValue - lowestPixelValue)) / valuesRange );
        break;
      case 'loglog':
        mappedValue = maxColorValue * (Math.log((Math.log(pixelValue) - lowestPixelValue)) / valuesRange );
        break;
      case 'sqrtlog':
        mappedValue = maxColorValue * (Math.sqrt((Math.log(pixelValue) - lowestPixelValue)) / valuesRange );
        break;
      default:
        break;
    }
    return mappedValue;
  };

  var convertToRGBA = function (pixelValue, colorMapping, highestPixelValue, lowestPixelValue, meanPixelValue){
    var colorValue = mapPixel(pixelValue, colorMapping, 255, highestPixelValue, lowestPixelValue, meanPixelValue);
    return {
      "red" : colorValue,
      "green" : colorValue,
      "blue" : colorValue,
      "alpha" : 255
    };
  };
  
  var convertToRGB = function () {
     
  };
  
  var pixelFormats = { 
    "RGB" : { "components" : 3, "convert" : convertToRGB },
    "RGBA" : { "components" : 4, "convert" : convertToRGBA }
  };

  var readPixel = function (dataView, bitpix) {
    var pixelValue;
    switch (bitpix) {
      case 8:
        pixelValue = dataView.getUint8();
        break;
      case 16:
        pixelValue = dataView.getInt16(0, false);
        break;
      case 32:
        pixelValue = dataView.getInt32(0, false);
        break;
      case 64:
        pixelValue = dataView.getFloat64(0, false);
        break;
      case -32:
        pixelValue = dataView.getFloat32(0, false);
        //if (pixelValue){
        //  pixelValue = (1.0 + ((pixelValue & 0x007fffff) / 0x0800000)) * Math.pow(2, ((pixelValue&0x7f800000)>>23) - 127);
        //}
        //pixelValue = Math.abs(pixelValue);  
        break;
      case -64:
        pixelValue = dataView.getFloat64(0, false);
        break;
      default: 
        //error('Unknown bitpix value');
    }
    return pixelValue; 
  };

  var error = function (message) {
    throw new Error('PIXEL PARSER - ' + message); 
  };
  
  var flipVertical = function (pixels, width, height) {
    var flippedPixels = [];
    var column = 0;
    var row = 0;
    while (row < height) {
      column = 0;
      while (column < width) {
        flippedPixels[(height - row -1)*width + column] = pixels[row*width + column];
        column += 1;  
      }
      row += 1;
    } 
    return flippedPixels;
  };
  
  var transpose = function (pixels, width, height) {
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
  };
  
  var mapPixels = function (header, data, format, colorMapping) {
    
    var bzero = header.BZERO || 0.0;
    var bscale = header.BSCALE || 1.0;
    var bitpix = header.BITPIX;
    var pixelSize = Math.abs(bitpix) / 8; // In bytes
    var pixelValue;
    var lowestPixelValue;
    var highestPixelValue;
    var meanPixelValue;
    var dataView;
    var remainingDataBytes;
    var imagePixelsNumber = header.NAXIS1 * header.NAXIS2;
    var pixels = [];
    var mappedPixel;
    var i = 0;
    colorMapping = colorMapping || 'linear';
    
    if (!format || !pixelFormats[format]) {
     error('Unknown pixel format');
    }
    
    if (!header) {
      error('No header available in HDU');
    }
    
    if (!data) {
      error('No data available in HDU');
    }
    
    dataView = new BinaryDataView(data, false, 0, imagePixelsNumber * pixelSize);
    remainingDataBytes = dataView.length();
    while(remainingDataBytes){
      pixelValue = readPixel(dataView, bitpix) * bscale + bzero;        
    
      if(lowestPixelValue === undefined){
        lowestPixelValue = pixelValue;
      } else {
        lowestPixelValue = pixelValue < lowestPixelValue? pixelValue : lowestPixelValue;
      }
      
      if(highestPixelValue === undefined){
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
    
    pixels = flipVertical(pixels, header.NAXIS1, header.NAXIS2); // FITS stores pixels in column major order
  
    while (i < imagePixelsNumber) {
      mappedPixel = pixelFormats.RGBA.convert(pixels[i], colorMapping, highestPixelValue, lowestPixelValue, meanPixelValue);
      mappedPixel.value = pixels[i];
      pixels[i] = mappedPixel;
      i += 1;
    }  
    return pixels;
  };

  return mapPixels;

});