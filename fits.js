// FITS Standard 3.0 Parser
// Author: Diego Marcos

(function () {
  "use strict";

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
  var stringValue = /^\x27[\x20-\x7E]*\x27$/;
  var mandatoryKeywordsPrimaryHeader = ['BITPIX', 'NAXIS'];  // Sec 4.4.1.1
  var mandatoryKeywordsExtensions = ['XTENSION', 'BITPIX', 'NAXIS', 'PCOUNT', 'GCOUNT']; // Sec 4.4.1.2
  
  function validateLogical(value, error) {
    if (!/^(T|F)$/.test(value)) {
      error('Logical value: ' + value + 'not valid. Must be T or F');
    } 
  }
  
  function validateDate(value, error) {
  }
  
  function validateInteger(value, error) {
  }
  
  function validateString(value, error) { // Sec 4.2.1
    if (!stringValue.test(value)) {
      error('String ' + value + ' contains non valid characters. Sec 4.2.1');
      return false;
    }
    if (value.length > 68) {
      error('String ' + value + 'too long. Limit is 68 characters. Sec 4.2.1');
      return false;
    }
    value.replace(/\x27{2}/g, "'"); // Replace two sucesive quotes with a single one.
    return value;
  }
  
  function validateBITPIX(value, error) {
  }
  
  function validateNAXIS(value, error) {
  }
  
  function validatePrimaryHeader() {
  }
  
  function validateExtensionHeader() {
  }
  
  function extend(objTarget, objSource) {
    var prop;
    for (prop in objSource) {
      if (objSource[prop] !== void 0) {
        objTarget[prop] = objSource[prop];
      }
    }
    return objTarget; 
  }
  
  var fixedFormatKeywords = {
    BITPIX: { // Sec 4.4.1.1
      type: "integer",
      validValues: [8, 16, 32, 64, -32, -64],
      validate: validateBITPIX
    },
    NAXIS: { // Sec 4.4.1.1
      type: "integer",
      validValues: { min: 0, max: 999 },
      validate: validateNAXIS
    },
    PCOUNT: {
      type: "integer",
      validate: validateInteger
    },
    GCOUNT: {
      type: "integer",
      validate: validateInteger
    },
    DATE: {
      type: "date",
      validate: validateDate 
    },
    ORIGIN: {
      type: "string",
      validate: validateString 
    },
    EXTEND: {
      type: "logical",
      validate: validateLogical
    }
  };
  
  var trim = function (inputString, leading, trailing) {
    var trimmedString = inputString;
    if (!leading && !trailing) {
      return trimmedString.replace(/^\s*(\S*(?:\s+\S+)*)\s*$/, "$1");
    } else {
      if (leading) {
        trimmedString = trimmedString.replace(/^\s*(\S*(?:\s+\S+)*\s*)$/, "$1");
      }
      if (trailing) {
        trimmedString = trimmedString.replace(/^(\s*\S*(?:\s+\S+)*)\s*$/, "$1");
      }
      return trimmedString;
    }
  };
  
  function validateComment(comment, error) { 
    var commentExpression = /^[\x20-\x7E]*$/; // Allowed characters in comments Sec 4.1.2.3
    if (comment) {
      comment = trim(comment);
      if (!commentExpression.test(comment)) { 
        error("Illegal characther in record comment for record " + keyword);
        return;
      }
    }
    return comment;
  }
  
  function validateKeyword(keyword, error) { 
    var keywordExpression = /^[\x30-\x39\x41-\x5A\x5F\x2D]+$/; // Allowed characters in keyword Sec 4.1.2.1
    keyword = trim(keyword);
    if (keyword) {
      if (!keywordExpression.test(keyword)) { 
        error("Illegal characther in header keyword " + keyword);
        return;
      } 
    }
    return keyword;
  }
  
  function validateValue(value, keyword, recordString, error){
    var stringExpression = /^\s*\x27.*\x27\s*$/;
    if(value){
      value = trim(value);
      if (stringExpression.test(value)) {
        if (fixedFormatKeywords[keyword]) {
          if (recordString.charCodeAt(10) !== 39) {
            error("Illegal characther in header keyword " + keyword + " Fixed format keyword values must start with simple quote after ="); // Sec 4.2.1
            return;
          }
        }
        value = validateString(value, error).replace(/\x27/g, '');
        value = trim(value, false, true); // Removing non significant trailing spaces. Sec. 4.2.1 
        return value;
      }
      return value;
    }
  }

  function parseHeaderRecord(recordString, error, warning) {
    var record = {};
    var valueCommentExpression = /^(\s*\x27.*\x27\s*|[^\x2F]*)\x2F{0,1}(.*)$/;
    var valueComment = valueCommentExpression.exec(recordString.substring(10));
    var value;
    var comment;
    var keyword = recordString.substring(0, 8); // Keyword in the first 8 bytes. Sec 4.1.2.1
    
    if (recordString.charCodeAt(8) !== 61 || recordString.charCodeAt(9) !== 32) { // Value indicator Sec 4.1.2.2
      comment = recordString.substring(8); // If not value all the rest of the record treated like a comment Sec 4.1.2.3
    } else {
      value = valueComment[1];
      comment = valueComment[2];
    }
    
    record.keyword = validateKeyword(keyword, error) || undefined;
    record.comment = validateComment(comment, warning) || undefined;
    record.value = validateValue(value, record.keyword, recordString, error) || undefined;
    return record;
  }
  
  function parseHeaderBlock(blockString, error, warning) {
    var records = [];
    var record = {};
    var bytePointer = 0;
    var recordString;
    while (bytePointer < blockString.length) {
      recordString = blockString.substring(bytePointer, bytePointer + recordSize - 1);
      if (/^END[\x20]*/.test(recordString)) {
        records.end = true;
        return records;
      }
      console.log(recordString);
      bytePointer += recordSize;
      record = parseHeaderRecord(recordString, error, warning);
      if (record) {
        records.push(record);
      }  
    }
    return records;
  }
  
  FITS.FileParser = function () {
    var file;
    var data = [];
    var headerRecords = [];
    var headerDataUnits = [];
    var fileBytePointer = 0;
    var slice;
    
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      console.error('The File APIs are not fully supported in this browser.');
      return;
    } else {  // For Mozilla 4.0+ || Chrome and Safari || Opera and standard browsers
      slice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
    }

    function parseHeaderBlocks(success, error) {
      var fileBlock;
      var reader = new FileReader();
      
      var parseError = function (message) {
        error("Error parsing file: " + message);
      };
      
      var parseWarning = function (message) {
        error("Warning: " + message);
      };
       
      reader.onload = function (e) {
        var parsedRecords;
        // Checking allowed characters in Header Data Unit (HDU). 
        // Subset of ASCII characters between 32 and 126 (20 and 7E in hex)
        if (!/^[\x20-\x7E]*$/.test(this.result)) { // Sec 3.2
          error("Ilegal character in header block");
        }
        parsedRecords = parseHeaderBlock(this.result, parseError, parseWarning);
        headerRecords = [].concat(headerRecords, parsedRecords);
        if (parsedRecords.errorMessage) {
          parseError(parsedRecords.errorMessage);
        }
        if (!parsedRecords.end) {
          parseHeaderBlocks(success, error);
        } else {
          success(headerRecords); 
        }
      };

      reader.onerror = function (e) {
        console.error("Error loading block");
      };
      
      if (fileBytePointer === blockSize) { // After reading the first block
        if (headerRecords[0].keyword !== 'SIMPLE') {  
          parseError('First keyword in primary header must be SIMPLE'); // Sec 4.4.1.1
        } else {
          if (headerRecords[0].value === 'F') {  
            parseWarning("This file doesn't conform the standard"); // Sec 4.4.1.1
          } else {
            if (headerRecords[0].value !== 'T') {  
              parseError('First value in primary header must be T'); // Sec 4.4.1.1
            }
          }
        }
      }
      
      fileBlock = slice.call(file, fileBytePointer, fileBytePointer + blockSize);
      fileBytePointer += blockSize;
      reader.readAsText(fileBlock);
    }
    
    function parseDataBlocks(success, error) {
      var data = [];
      success(data);
    }
    
    function parseHeaderDataUnit(success, error) {
      var header;
      var extensions;
      var successParsingData = function (data) {
        success({'header': header, 'data': data});
      };
      
      var succesParsingHeader = function (headerRecords) {
        header = headerRecords;
        parseDataBlocks(successParsingData, error);
      };
      
      parseHeaderBlocks(succesParsingHeader, error);
    }
   
    this.parse = function (inputFile) {
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
    
    this.onParsed = function (header, data) {};
    this.onError = function (error) {
      console.error(error);
    };

  };

}).call(this);