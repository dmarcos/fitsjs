// FITS Standard 3.0

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
  var mandatoryKeywordsPrimaryHeader = ['BITPIX','NAXIS'];  
  var mandatoryKeywordsExtensions = [];
  var fixedFormatKeywords = {
    BITPIX: {
      valueType: "integer",
      validValues: [8,16,32,64,-32,-64]
    },
    NAXIS: {
     valueType: "integer",
     validValues: { min: 0, max: 999} 
    }
  };
  
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
  
  function parseHeaderRecord(recordString, error, warning){
    var record = {};
    var valueComment = recordString.substring(10);
    var value;
    var comment;
    var keyWord = recordString.substring(0, 8); // Keyword in the first 8 bytes. Sec 4.1.2.1
    keyWord = keyWord.trim();
    if(keyWord&&!/^[\x30-\x39\x41-\x5A\x5F\x2D]+$/.test(keyWord)){ // Allowed characters in keyword Sec 4.1.2.1
      error("Illegal characther in header keyWord " + keyWord);
    }
    if(recordString.charCodeAt(8) != 61 || recordString.charCodeAt(9) != 32){ // Value indicator Sec 4.1.2.2
      comment = recordString.substring(8).trim(); // If not value all the rest of the record treated like a comment Sec 4.1.2.3
    }
    else{ 
      valueComment = valueComment.split(/\//);
      value = valueComment[0].trim();
      if(valueComment[1]){
        comment = valueComment[1].trim();
        if(!/^[\x20-\x7E]*$/.test(comment)){ // Allowed characters in comments Sec 4.1.2.3
          warning("Illegal characther in record comment for record " + keyWord);
        }
      }
    }
    record.keyWord = keyWord;
    record.comment = comment;
    record.value = value;
    return record;
  }
  
  function parseHeaderBlock(blockString, error, warning){
     var records = [];
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
       console.log(recordString);
       bytePointer += recordSize;
       record = parseHeaderRecord(recordString, error, warning);
       if(record){
         records.push(record);
       }  
     }
    return records;
  }
  
  FITS.FileParser = function(){
    var file;
    var data = [];
    var headerRecords = [];
    var headerDataUnits = [];
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

    function parseHeaderBlocks(success, error){
      var fileBlock;
      var reader = new FileReader();
      
      var parseError = function(message){
        error("Error parsing file: " + message);
      };
      
      var parseWarning = function(message){
        error("Warning: " + message);
      };
       
      reader.onload = function(e) {
        var parsedRecords;
        // Checking allowed characters in Header Data Unit (HDU). 
        // Subset of ASCII characters between 32 and 126 (20 and 7E in hex)
        if(!/^[\x20-\x7E]*$/.test(this.result)){ // Sec 3.2
          error("Ilegal character in header block")
        }
        parsedRecords = parseHeaderBlock(this.result, parseError, parseWarning);
        headerRecords = [].concat(headerRecords, parsedRecords);
        if(parsedRecords.errorMessage){
          parseError(parsedRecords.errorMessage);
        }
        if(!parsedRecords.end){
          parseHeaderBlocks(success, error);
        }
        else{
          success(headerRecords); 
        }
      };

      reader.onerror = function(e) {
        console.error("Error loading block");
      };
      
      if(fileBytePointer == blockSize){ // After reading the first block
        if(headerRecords[0].keyWord != 'SIMPLE'){  
          parseError('First keyword in primary header must be SIMPLE'); // Sec 4.4.1.1
        }
        else{
          if(headerRecords[0].value == 'F'){  
            parseWarning("This file doesn't conform the standard"); // Sec 4.4.1.1
          }
          else {
            if(headerRecords[0].value != 'T'){  
              parseError('First value in primary header must be T'); // Sec 4.4.1.1
            }
          }
        }
      }
      
      fileBlock = slice.call(file, fileBytePointer, fileBytePointer + blockSize);
      fileBytePointer += blockSize;
      reader.readAsText(fileBlock);
      
    }
    
    function parseDataBlocks(success, error){
      var data = [];
      success(data);
    }
    
    function parseHeaderDataUnit(success, error){
      var header;
      var extensions;
      var succesParsingHeader = function(headerRecords){
        header = headerRecords;
        parseDataBlocks(successParsingData, error);
      };
      
      var successParsingData = function(data){
        success({'header': header, 'data': data});
      };
      parseHeaderBlocks(succesParsingHeader,error);
    }
   
    this.parse = function(inputFile){
      headerRecords = [];
      data = [];
      fileBytePointer = 0;
      file = inputFile;
      if (!file) {
        console.error('Failed when loading file. No file selected');
        return;
      }
      parseHeaderDataUnit(this.onParsed, this.onError); 
    };
    
    this.onParsed = function(header, data){};
    this.onError = function(error){
      console.error(error);
    };

  }

}).call(this);