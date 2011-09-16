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
  var mandatoryKeywordsPrimaryHeader = ['BITPIX', 'NAXIS'];  // Sec 4.4.1.1
  var mandatoryKeywordsExtensions = ['XTENSION', 'BITPIX', 'NAXIS', 'PCOUNT', 'GCOUNT']; // Sec 4.4.1.2
  
  var grammar = {
    "keyword" : /^[\x30-\x39\x41-\x5A\x5F\x2D]+$/, // Sec 4.1.2.1
    "comment" : /^[\x20-\x7E]*$/, // Sec 4.1.2.3
    "string" : /^\x27[\x20-\x7E]*\x27$/,
    "integer" : /^[-+]{0,1}\d+$/,
    "float" : /^[-+]{0,1}\d*(\.\d*){0,1}([ED][-+]{0,1}\d+){0,1}$/,
    "valueComment" : /^(\s*\x27.*\x27\s*|[^\x2F]*)\x2F{0,1}(.*)$/,
    "logical" : /^(T|F)$/,
    "naxis" : /^NAXIS\d{1,3}$/
  };
  
  function validateLogical(value, error) {
    if (value) {
      if (!grammar.logical.test(value)) {
        error('Logical value: ' + value + 'not valid. Must be T or F');
        return;
      }
    } 
    return value === 'T'? true : false;
  }
  
  function validateDate(value, error) {
    return value;
  }
  
  function validateFloat(value, error){
    if (value) {  
      if (!grammar['float'].test(value)) {
        error('Float ' + value + ' has no valid format');
        return;
      }
    }
    return parseFloat(value);
  }
  
  function validateInteger(value, error) { // Sec 4.2.3
    if (value) {  
      if (!grammar.integer.test(value)) {
        error('Integer ' + value + ' has no valid format. Sec 4.2.3');
        return;
      }
    }
    return parseInt(value);       
  }
  
  function validateString(value, error) { // Sec 4.2.1
    if (value) {  
      if (!grammar.string.test(value)) {
        error('String ' + value + ' contains non valid characters. Sec 4.2.1');
        return;
      }
      if (value.length > 68) {
        error('String ' + value + 'too long. Limit is 68 characters. Sec 4.2.1');
        return;
      }
      value = value.replace(/\x27{2}/g, "'"); // Replace two sucesive quotes with a single one.
      value = value.replace(/\x27/g, ''); // Enclosing single quotes are redundant at this point. We have a JavaScript native String.
      value = trim(value, false, true); // Removing non significant trailing spaces. Sec. 4.2.1 
    }
    return value;
  }
  
  function validateBITPIX(value, error) {
    var validValues = fixedFormatKeywords.BITPIX.validValues;
    var i = 0;
    var valid = false;
    value = parseInt(validateInteger(value, error));
    while (i < validValues.length) {
      if (validValues[i] === value) {
        valid = true;
        break;
      }
      i += 1;
    } 
    if(!valid){
      error('Not valid value for NAXIS: ' + value + ' Accepted values are ' + validValues.toString() + ' Sec 4.4.1');
      return;
    }
    return value;
  }
  
  function validateNAXIS(value, error) {
    value = parseInt(validateInteger(value, error));
    if (value <= 0 || value > 999) {
      error('Not valid value for NAXIS: ' + value + ' Accepted values between 1 and 999. Sec 4.4.1');
      return;
    } 
    return value;
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
    "BITPIX": { // Sec 4.4.1.1
      validValues: [8, 16, 32, 64, -32, -64],
      validate: validateBITPIX
    },
    "NAXIS": { // Sec 4.4.1.1
      validValues: { min: 0, max: 999 },
      validate: validateNAXIS
    },
    "PCOUNT": {
      validate: validateInteger
    },
    "GCOUNT": {
      validate: validateInteger
    },
    "DATE": {
      validate: validateDate 
    },
    "ORIGIN": {
      validate: validateString 
    },
    "EXTEND": {
      validate: validateLogical
    },
    "DATE-OBS": {
      validate: validateDate
    },
    "TELESCOP": {
      validate: validateString
    },
    "INSTRUME": {
      validate: validateString
    },
    "OBSERVER": {
      validate: validateString
    },
    "OBJECT": {
     validate: validateString
    },
    "BSCALE": {
      validate: validateFloat 
    },
    "BZERO": {
      validate: validateFloat 
    },
    "BUNIT": {
      validate: validateString
    },
    "BLANK": {
      validate: validateString
    },
    "DATAMAX": {
      validate: validateFloat
    },
    "DATAMIN": {
      validate: validateFloat
    },
    "EXTNAME": {
      validate: validateString
    },
    "EXTVER": {
      validate: validateInteger
    },
    "EXTLEVEL": {
      validate: validateInteger
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
    if (comment) {
      comment = trim(comment);
      if (!grammar.comment.test(comment)) { 
        error("Illegal characther in record comment for record " + keyword);
        return;
      }
    }
    return comment;
  }
  
  function validateKeyword(keyword, error) { 
    keyword = trim(keyword);
    if (keyword) {
      if (!grammar['keyword'].test(keyword)) { 
        error("Illegal characther in header keyword " + keyword);
        return;
      } 
    }
    return keyword;
  }
  
  function validateFreeFormatValue(value, keyword, error){
    if (grammar.naxis.test(keyword)) {
      return validateInteger(value,error);
    }
    if (grammar.string.test(value)) {
      return validateString(value, error);
    }
    if (grammar.logical.test(value)) {
      return validateLogical(value, error);
    }
    if (grammar.integer.test(value)) {
      return validateInteger(value, error);
    }
    if (grammar['float'].test(value)) {
      return validateFloat(value, error);
    }
    return value;
  }
  
  function validateValue(value, keyword, recordString, error){
    if(value){
      value = trim(value);
      if (fixedFormatKeywords[keyword]) {
        if (grammar.string.test(value) && recordString.charCodeAt(10) !== 39) {
          error("Illegal characther in header keyword " + keyword + " Fixed format keyword values must start with simple quote after ="); // Sec 4.2.1
          return;
        }
        return fixedFormatKeywords[keyword].validate(value);
      } else {
        return validateFreeFormatValue(value, keyword, error);
      }
    }
    return value;
  }

  function parseHeaderRecord(recordString, error, warning) {
    var record = {};
    var valueComment = grammar.valueComment.exec(recordString.substring(10));
    var value;
    var comment;
    var keyword = recordString.substring(0, 8); // Keyword in the first 8 bytes. Sec 4.1.2.1
    
    if (recordString.charCodeAt(8) !== 61 || recordString.charCodeAt(9) !== 32) { // Value indicator Sec 4.1.2.2
      comment = recordString.substring(8); // If not value all the rest of the record treated like a comment Sec 4.1.2
      comment = comment.trim().replace(/^\/(.*)$/,"$1"); // Removing comment slash indicator
    } else {
      value = valueComment[1];
      comment = valueComment[2];
    }
    
    record.keyword = validateKeyword(keyword, error) || undefined;
    record.comment = validateComment(comment, warning) || undefined;
    record.value = validateValue(value, record.keyword, recordString, error);
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
          if (!headerRecords[0].value) {  
            parseWarning("This file doesn't conform the standard. SIMPLE keyword value different than T"); // Sec 4.4.1.1
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
    
    function parseHeaderJSON(headerRecords){
      var i = 0;
      var header = {};
      var keyword;
      var record;
      while (i < headerRecords.length) {
        record = headerRecords[i];
        keyword = record.keyword;
        if(keyword && keyword !== "COMMENT" && keyword !== "HISTORY"){
          if (record.value) {
            header[keyword] = record.value;
          }
        }
        i += 1;
      }
      return header;
    }
    
    function parseHeaderDataUnit(success, error) {
      var header;
      var extensions;
      var successParsingData = function (data) {
        success({'header': parseHeaderJSON(header), 'data': data, 'headerRecords': header});
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
    
    this.onParsed = function (header, data, headerRecords) {};
    this.onError = function (error) {
      console.error(error);
    };

  };

}).call(this);