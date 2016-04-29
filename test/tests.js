var assert = require("assert"),
	fs = require('fs');

var xliff2json = require("../lib/index");

function normalizeWhitespace(str) {
  return str.replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\s+\n/g, '\n')
            .replace(/\n\s+/g, '\n');
}

var x2 = new xliff2json({
    cleanJSON:true,
    decorateJSON:true
  });

var input = fs.readFileSync("test/fixture/test_less.xml",'utf8');

describe('Round trip', function(){
  /*
    it('to json', function(done){
      x2.parseXliff(input,function(json){
         x2.parseJSON(json,function(output){
           assert.equal(normalizeWhitespace(output),normalizeWhitespace(input));
           done();
         });
      });
    });
  */
});
