// DataView API wrapper. String -> ArrayBuffer converter
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define(function () {

  var BinaryDataView = function(binaryData, plittleEndian, start, offset){
    
    var littleEndian = littleEndian === undefined ? true : littleEndian;
    var dataBuffer;
    var dataView;
    var bytePointer = 0;
    var bufferLength;
    var dataSize = {
      'Int8': 1,
      'Int16': 2,
      'Int32': 4,
      'Uint8': 1,
      'Uint16': 2,
      'Uint32': 4,
      'Float32': 4,
      'Float64': 8
    };
    
    var dataGetter = function(byteOffset, plittleEndian, type){
      var data;
      if(plittleEndian === undefined){
        plittleEndian = littleEndian;
      }
      if(!byteOffset){
        byteOffset = bytePointer;
      }
      data = dataView['get' + type](byteOffset, plittleEndian);
      bytePointer = byteOffset + dataSize[type];
      return data;
    };
    
    if (!window.ArrayBuffer || !window.DataView) {
      throw new Error('The ArrayBuffer and DataView APIs are not supported in your browser.');
    }
    
    function parseBinaryString(binaryString){
      var i = 0;
      var character; 
      var byte;
      bufferLength = binaryString.length;
      dataBuffer = new ArrayBuffer(binaryString.length);
      dataView = new DataView(dataBuffer, 0, bufferLength);
      while (i < binaryString.length) {
        character = binaryString.charCodeAt(i);
        byte = character & 0xff;  
        dataView.setUint8(i, byte);
        i += 1;
      }
    }
    
    if (typeof binaryData === 'string') {
      parseBinaryString(binaryData);
    } else {
      if (binaryData instanceof ArrayBuffer) {
        dataBuffer = binaryData;
        bufferLength = offset || dataBuffer.byteLength;
        dataView = new DataView(dataBuffer, start !== undefined? start: 0, bufferLength);
      }
    }
    
    this.getInt8 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Int8'); };
    this.getInt16 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Int16'); };
    this.getInt32 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Int32'); };
    this.getUint8 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Uint8'); };    
    this.getUint16 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Uint16'); };    
    this.getUint32 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Uint32'); };    
    this.getFloat32 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Float32'); };    
    this.getFloat64 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Float64'); };
    this.length = function() { return dataView.byteLength; };    
  
  };

  return BinaryDataView;

});