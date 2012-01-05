// FITS Standard 3.0 Parser
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define(function () {
  "use strict";
  
  var blockSize = 2880; // In bytes
  var recordSize = 80;
  var mandatoryKeywordsPrimaryHeader = ['BITPIX', 'NAXIS'];  // Sec 4.4.1.1
  var mandatoryKeywordsExtensionHeader = ['XTENSION', 'BITPIX', 'NAXIS', 'PCOUNT', 'GCOUNT']; // Sec 4.4.1.2
  
  var expressions = {
    "keyword" : /^[\x30-\x39\x41-\x5A\x5F\x2D]+$/, // Sec 4.1.2.1
    "comment" : /^[\x20-\x7E]*$/, // Sec 4.1.2.3
    "string" : /^\x27[\x20-\x7E]*\x27$/,
    "integer" : /^[\-+]{0,1}\d+$/,
    "complexInteger" : /^\(\s*([\-+]{0,1}\d)\s*,\s*([\-+]{0,1}\d)\s*\)$/,
    "float" : /^[\-+]{0,1}\d*(\.\d*){0,1}([ED][\-+]{0,1}\d+){0,1}$/,
    "complexFloat" : /^\(\s*([\-+]{0,1}\d*(?:\.\d*){0,1}(?:[ED][\-+]{0,1}\d+){0,1})\s*,\s*([\-+]{0,1}\d*(?:\.\d*){0,1}(?:[ED][\-+]{0,1}\d+){0,1})\s*\)$/,
    "valueComment" : /^(\s*\x27.*\x27\s*|[^\x2F]*)\x2F{0,1}(.*)$/,
    "logical" : /^(T|F)$/,
    "date" : /^\d{2,4}[:\/\-]\d{2}[:\/\-]\d{2}(T\d{2}:\d{2}:\d{2}(\.\d*){0,1}){0,1}$/,
    "dateXXXX" : /^DATE(.){1,4}$/,
    "ptypeXXX" : /^PTYPE\d{1,3}$/,
    "pscalXXX" : /^PSCAL\d{1,3}$/,
    "pzeroXXX" : /^PZERO\d{1,3}$/,
    "naxis" : /^NAXIS\d{1,3}$/
  };

  var trim = function(inputString, leading, trailing) {
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
  
  var validateLogical = function(value, error){
    if (value) {
      if (!expressions.logical.test(value)) {
        error('Logical value: ' + value + 'not valid. Must be T or F');
        return;
      }
    } 
    return value === 'T'? true : false;
  };
  
  var validateDate = function(value, error){
    if (value) {  
      value = value.replace(/\x27/g, ''); // Removing enclosing quotes.
      if (!expressions.date.test(value)) {
        error('Date ' + value + ' has no valid format');
        return;
      }
    }
    return value;
  };
  
  var validateFloat = function(value, error){ // Sec 4.2.4
    if (value) {  
      if (!expressions.float.test(value)) {
        error('Float ' + value + ' has no valid format. Sec 4.2.4');
        return;
      }
    }
    return parseFloat(value);
  };
  
  var validateComplexFloat = function(value, error) { // Sec 4.2.6
    var parts;
    if (value) {  
      if (!expressions.complexFloat.test(value)) {
        error('Complex Float ' + value + ' has no valid format. Sec 4.2.6');
        return;
      }
      parts = expressions.complexFloat.exec(value);
    }
    return { 
      real : parseFloat(parts[1]),
      imaginary : parseFloat(parts[2])  
    };
  };
  
  var validateInteger = function(value, error) { // Sec 4.2.3
    if (value) {  
      if (!expressions.integer.test(value)) {
        error('Integer ' + value + ' has no valid format. Sec 4.2.3');
        return;
      }
    }
    return parseInt(value, 10);       
  };
  
  var validateComplexInteger = function(value, error) { // Sec 4.2.5
    var parts;
    if (value) {  
      if (!expressions.complexInteger.test(value)) {
        error('Complex Integer ' + value + ' has no valid format. Sec 4.2.5');
      return;
      }
      parts = expressions.complexInteger.exec(value);
    }
    return { 
      real : parseInt(parts[1], 10),
      imaginary : parseInt(parts[2], 10)  
    };
  };
  
  var validateString = function(value, error) { // Sec 4.2.1
    if (value) {  
      if (!expressions.string.test(value)) {
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
  };
  
  var validateNAXIS = function(value, error) {
    value = parseInt(validateInteger(value, error), 10);
    if (value <= 0 || value > 999) {
      error('Not valid value for NAXIS: ' + value + ' Accepted values between 1 and 999. Sec 4.4.1');
      return;
    } 
    return value;
  };

  var validateBITPIX = function(value, error) {
    var validValues = fixedFormatKeywords.BITPIX.validValues;
    var i = 0;
    var valid = false;
    value = parseInt(validateInteger(value, error), 10);
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
  };
  
  var validatePrimaryHeader = function(header, error) {
    var i = 0;
    while (i < mandatoryKeywordsPrimaryHeader.length) {
      if (header[mandatoryKeywordsPrimaryHeader[i]] === undefined) {
        error('Keyword ' + mandatoryKeywordsPrimaryHeader[i] + ' not found in primary header');
      }
      i += 1;
    }
  };
  
  var validateExtensionHeader = function(header, error) {
    var i = 0;
    while (i < mandatoryKeywordsExtensionHeader.length) {
      if (header[mandatoryKeywordsExtensionHeader[i]] === undefined) {
        error('Keyword ' + mandatoryKeywordsExtensionHeader[i] + ' not found in primary header');
      }
      i += 1;
    }
  };

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
  
  var extend = function(objTarget, objSource) {
    var prop;
    for (prop in objSource) {
      if (objSource[prop] !== void 0) {
        objTarget[prop] = objSource[prop];
      }
    }
    return objTarget; 
  };
  
  var validateComment = function(comment, keyword, error) { 
    if (comment) {
      comment = trim(comment);
      if (!expressions.comment.test(comment)) { 
        error("Illegal characther in record comment for record " + keyword);
        return;
      }
    }
    return comment;
  };
  
  var validateKeyword = function(keyword, error) { 
    keyword = trim(keyword);
    if (keyword) {
      if (!expressions['keyword'].test(keyword)) { 
        error("Illegal characther in header keyword " + keyword);
        return;
      } 
    }
    return keyword;
  };
  
  var validateFreeFormatValue = function(value, keyword, error){
    if (expressions.dateXXXX.test(keyword)) {
      return validateDate(value, error);
    }
    if (expressions.ptypeXXX.test(keyword)) {
      return validateString(value, error);
    }
    if (expressions.pscalXXX.test(keyword)) {
      return validateFloat(value, error);
    }
    if (expressions.pzeroXXX.test(keyword)) {
      return validateFloat(value, error);
    }
    if (expressions.naxis.test(keyword)) {
      return validateInteger(value, error);
    }
    if (expressions.string.test(value)) {
      return validateString(value, error);
    }
    if (expressions.logical.test(value)) {
      return validateLogical(value, error);
    }
    if (expressions.integer.test(value)) {
      return validateInteger(value, error);
    }
    if (expressions.float.test(value)) {
      return validateFloat(value, error);
    }
    return value;
  };
  
  var validateValue = function(value, keyword, recordString, error){
    if(value){
      value = trim(value);
      if (fixedFormatKeywords[keyword]) {
        if (expressions.string.test(value) && recordString.charCodeAt(10) !== 39) {
          error("Illegal characther in header keyword " + keyword + " Fixed format keyword values must start with simple quote after ="); // Sec 4.2.1
          return;
        }
        return fixedFormatKeywords[keyword].validate(value, error);
      } else {
        return validateFreeFormatValue(value, keyword, error);
      }
    }
    return value;
  };

  var parseHeaderRecord = function(recordString, error, warning) {
    var record = {};
    var valueComment = expressions.valueComment.exec(recordString.substring(10));
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
    record.comment = validateComment(comment, keyword, warning) || undefined;
    record.value = validateValue(value, record.keyword, recordString, error);
    return record;
  };
  
  var parseHeaderBlock = function(blockString, error, warning) {
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
  };
  
  var FitsFileParser = function () {
    var file;
    var data = "";
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
      
    var parseDataBlocks = function(dataSize, success, error) {
      var fileBlock;
      var reader = new FileReader();
      var blocksToRead = Math.ceil(dataSize / blockSize);
      var bytesToRead = blocksToRead * blockSize;
      var parseError = function (message) {
        error("Error parsing file: " + message);
      };
     
      reader.onload = function (e) {
        data = this.result; //.substring(0, dataSize); // Triming last bytes in excess in last block
        success(); 
      };

      reader.onerror = function (e) {
        console.error("Error loading data block");
      };
   
      fileBlock = slice.call(file, fileBytePointer, fileBytePointer + bytesToRead);
      fileBytePointer += bytesToRead;
      reader.readAsArrayBuffer(fileBlock);
    };
    
    var parseHeaderJSON = function(headerRecords){
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
    };
    
    var parseHeaderDataUnit = function(success, error) {
      var headerJSON;
      var dataSize;
      var successParsingData = function () {
        success({
          "header": headerJSON,
          "data": data,
          "headerRecords": headerRecords
        });
      };
      
      var succesParsingHeader = function (records) {
        var i = 1;
        headerRecords = records;
        headerJSON = parseHeaderJSON(headerRecords);
        dataSize = Math.abs(headerJSON.BITPIX) / 8;
        while (i <= headerJSON.NAXIS) {
          dataSize = dataSize * headerJSON["NAXIS" + i];
          i += 1;
        }
        parseDataBlocks(dataSize, successParsingData, error);
      };
      
      headerRecords = [];
      data = [];
      parseHeaderBlocks(succesParsingHeader, error);
    
    };
   
    this.parse = function (inputFile) {
      fileBytePointer = 0;
      file = inputFile;
      var that = this;
      if (!file) {
        console.error('Failed when loading file. No file selected');
        return;
      }
      
      var onErrorParsingHeaderDataUnit = function(error) {
        that.onError(error);
      };
      
      var onParsedHeaderDataUnit = function(headerDataUnit){
        if (headerDataUnits.length === 0){
          validatePrimaryHeader(headerDataUnit.header, onErrorParsingHeaderDataUnit);
        } else {
          validateExtensionHeader(headerDataUnit.header, onErrorParsingHeaderDataUnit);
        }
        headerDataUnits.push(headerDataUnit);
        if (fileBytePointer < file.fileSize){
          parseHeaderDataUnit(onParsedHeaderDataUnit, onErrorParsingHeaderDataUnit);
        } else {
          that.onParsed(headerDataUnits);
        }
      };    
      parseHeaderDataUnit(onParsedHeaderDataUnit, onErrorParsingHeaderDataUnit);
       
    };
    
    this.onParsed = function (headerDataUnits) {};
    this.onError = function (error) {
      console.error(error);
    };

  };

  return FitsFileParser;

});