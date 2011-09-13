(function(){

  // Save a reference to the global object.
  var root = this;

  // The top-level namespace. Exported for both CommonJS and the browser.
  var FITS;
  if (typeof exports !== 'undefined') {
    FITS = exports;
  } else {
    FITS = root.FITS = {};
  }
  
  FITS.version = '0.0.1';
  
  var blockSize = 2880; // In bytes
  var recordSize = 80;
  var fitsCharacters = /\b([\020-\126]*)\b/;
  
  function extend(objTarget, objSource){
    for (var prop in objSource) {
      if (objSource[prop] !== void 0) objTarget[prop] = objSource[prop];
    }
    return objTarget; 
  }
  
  if (!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s*(\S*(?:\s+\S+)*)\s*$/, "$1");
    };
  }
  
  function parseHeaderRecord(recordString){
    var record = {};
    // Replace multiple spaces by a single one
    recordString = recordString.replace(/\s{2,}/g, ' ');
    if(/^COMMENT/.test(recordString)){
      record.comment = recordString.replace(/^COMMENT/,'');
      return record;
    }
    recordString = recordString.split(/ \/ /);
    if(recordString.length > 2){
      console.log("Malformed record");
      return;
    }
    // Trim spaces at beggining and end
    if(!/\s*/.test(recordString[1])){
      record.comment = recordString[1].trim();
    }
    recordString = recordString[0].split(/=/);
    if(recordString.length != 2){
      console.log("Malformed record");
      return;
    }
    // Remove spaces from id and value
    recordString[0] = recordString[0].replace(/\s*/g,'');
    recordString[1] = recordString[1].replace(/\s*/g,'');
    record.value = recordString[1].replace(/^[\'|\"](\S*)[\'|\"]$/,'$1');
    record.id = recordString[0];
    return record;
  }
  
  function parseHeaderBlock(blockString){
     var records = {};
     var record = {};
     var bytePointer = 0;
     var recordString;
     var previousRecordId;
     while(bytePointer < blockString.length){
         recordString = blockString.substring(bytePointer, bytePointer + recordSize - 1);
         if(/^END[\x20]*/.test(recordString)){
           records.end = true;
           return records;
         }
         //console.log(recordString);
         bytePointer+=recordSize;
         record = parseHeaderRecord(recordString);
         if(record){
           if(record.id){
             previousRecordId = record.id;
             records[record.id] = record.value;
           }
           else{ // It's a comment record
           records[previousRecordId].comment += record.comment; 
         }
       }
     }
    return records;
  }
  
  FITS.FileReader = function(){
    var file;
    var headerRecords = {};
    var data = [];
    var fileBytePointer = 0;
    var slice;
    
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      console.error('The File APIs are not fully supported in this browser.');
      return;
    }
    else{
      slice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
      // For Mozilla 4.0+ || Chrome and Safari || Opera and standard browsers
    }

    function readBlock(){
      var fileBlock;
      var reader = new FileReader(); 
      reader.onload = function(e) {
        var parsedHeaderRecords;
        // Checking allowed characters in Header Data Unit (HDU). 
        // Subset of ASCII characters between 32 and 126 (20 and 7E in hex)
        if(!/[\x20-\x7E]*/.test(this.result)){
          console.error("Ilegal character in header block")
        }
        parsedHeaderRecords = parseHeaderBlock(this.result);
        headerRecords = extend(headerRecords, parsedHeaderRecords);
        if(!parsedHeaderRecords.end){
          readBlock();
        }
      };

      reader.onerror = function(e) {
        console.error("Error reading file");
      };
      
      fileBlock = slice.call(file, fileBytePointer, fileBytePointer + blockSize);
      fileBytePointer += blockSize;
      reader.readAsText(fileBlock);
    }
   
    this.read = function(inputFile){
      headerRecords = {};
      data = [];
      fileBytePointer = 0;
      file = inputFile;
      if (!file) {
        console.error('Failed when loading file. No file selected');
        return;
      }
      readBlock();
    };
    
    this.onParsed = function(header, data){};

  }

}).call(this);