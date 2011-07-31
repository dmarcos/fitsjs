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
  
  var file;
  var reader = new FileReader();
  reader.onload = function(e) {
    var records = {};
    var record = {};
    var id;
    var fields;
    var i = 0;
   
    // Checking allowed characters in Header Data Unit (HDU). 
    // Subset of ASCII characters between 32 and 126 (20 and 7E in hex)
    if(!/[\x20-\x7E]*/.test(this.result)){
      console.error("FITS Header contains non valid characterss")
    }
    while(i < blockSize){
      record = {};
      fields = this.result.substring(i, i + recordSize -1);
      i+=recordSize;
      // Replace multiple spaces by a single one
      fields = fields.replace(/\s{2,}/g, ' ');
      if(/^COMMENT/.test(fields)){
        records[id].comment = records[id].comment + fields.replace(/^COMMENT/,'');
        continue;
      }
      fields = fields.split(/ \/ /);
      // Trim spaces at beggining and end
      record.comment = fields[1].replace(/^\s*|\s*$/g,'');
      fields = fields[0].split(/=/);
      // Remove spaces from id and value
      fields[0] = fields[0].replace(/\s*/g,'');
      fields[1] = fields[1].replace(/\s*/g,'');
      record.value = fields[1].replace(/^[\'|\"](\S*)[\'|\"]$/,'$1');
      id = fields[0];
      records[id] = record;
    }
    //for(var j =0; j < records[0].length; ++j){
    //  asciiContent = asciiContent + records[0].charCodeAt(j) + " ";
    //}
    //console.log("ASCII Content " + asciiContent);
    console.log(this.result);   
  };
  
  reader.onerror = function(e) {
    console.error("Error reading file");
  }
  
  var header;
  var data;
  var blockSize = 2880; // In bytes
  var recordSize = 80;
  var fitsCharacters = /\b([\020-\126]*)\b/;
  
  FITS.version = '0.0.1';
  
  FITS.loadFile = function(files){
    var blob; 
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      file = files[0];
      if (!file) {
        console.error('Failed when loading file. No file selected');
        return;
      }
      blob = file.webkitSlice(0, blockSize);
      reader.readAsText(blob);
    }
    else{
      console.error('The File APIs are not fully supported in this browser.');
    }
  }


}).call(this);