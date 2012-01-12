define(['./libs/fitsParser/src/fitsParser.js', './libs/pixelCanvas/pixelCanvas.js'], function (fitsParser, pixelCanvas) {
  "use strict";

  var FitsParser = fitsParser.Parser;  
  var mapPixels = fitsParser.mapPixels;
  
  var renderImage = function(file, canvas, success){
    var fitsParser = new FitsParser();
    
    fitsParser.onParsed = function(headerDataUnits){
      var HDUs = headerDataUnits;
      var pixels = mapPixels(HDUs[0].header, HDUs[0].data, 'RGBA', 'linear');
      //if (FITS.WCS) {
      //  FITS.wcsMapper = new FITS.WCS(HDUs[0].header);
      //}
      var imageWidth = HDUs[0].header.NAXIS1;
      var imageHeight = HDUs[0].header.NAXIS2;
      var pixelsRGBA = [];
      for (var i = 0; i < pixels.length; ++i) {
        pixelsRGBA.push(pixels[i].red);
        pixelsRGBA.push(pixels[i].green);
        pixelsRGBA.push(pixels[i].blue);
        pixelsRGBA.push(pixels[i].alpha);
      }

      pixelCanvas.drawPixels(pixelsRGBA, imageWidth, imageHeight, canvas);
      console.log("File read!");
      if(success){
        success();
      }
    };

    fitsParser.parse(file);
  
  };

  return {
    'renderImage' : renderImage
  };
  
});