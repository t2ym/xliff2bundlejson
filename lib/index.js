module.exports = Xliff2JSON;

var xml2js = require('xml2js'),
  _ = require('underscore');

function Xliff2JSON (options) {
  options = options || {};
  var defaultXliffTemplate = 
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE xliff PUBLIC "-//XLIFF//DTD XLIFF//EN" "http://www.oasis-open.org/committees/xliff/documents/xliff.dtd">\n' +
    '<xliff version="1.0">\n' +
    '  <file source-language="<%= __XMLEscape(xliff.file[0].$["source-language"]) %>" ' +
            'target-language="<%= __XMLEscape(xliff.file[0].$["target-language"]) %>" ' +
            'datatype="plaintext" ' +
            'original="<%= __XMLEscape(xliff.file[0].$["original"]) %>" ' +
            'date="<%= __ISODate() %>" ' +
            'product-name="<%= __XMLEscape(xliff.file[0].$["product-name"]) %>">\n' +
    '  <header/>\n' +
    '    <body>\n' +
    '      <% _.each(xliff.file[0].body[0]["trans-unit"],function(unit){ %>' +
          '<trans-unit id="<%= unit.$["id"] %>">\n' +
    '        <source><%= __XMLEscape(unit.source[0]) %></source>\n' +
    '        <target><%= __XMLEscape(unit.target[0]) %></target>\n' +
    '      </trans-unit>\n' +
    '      <% }); %>\n' +
    '    </body>\n' +
    '  </file>\n' +
    '</xliff>';
  this.parser = new xml2js.Parser();
  this.xliffTemplate = options.xliffTemplate || defaultXliffTemplate;
  this.useSources = options.useSources || false;
  this.date = options.date || new Date();
}

Xliff2JSON.prototype.parseXliff = function (xliff, options, cb) {
  var that = this;
  if (typeof xliff !== 'string'){
    throw new Error('xliff parameter must be a string.');
  }
  if (arguments.length === 2){
    cb = options;
    options = {};
  }
  else {
    options = options || {};
  }
  if (typeof cb !== 'function'){
    throw new Error('callback must be a function');
  }
  this.parser.parseString(xliff, function (err, json) {
    that._parseXliffToCleanJSON(json,options,cb);
  });
};

Xliff2JSON.prototype._parseXliffToCleanJSON = function (json, options, cb) {
  if (typeof json !== 'object') {
    throw new Error('xliff parameter must be JSON.');
  }
  if (typeof json.xliff === 'undefined' || typeof json.xliff.file === 'undefined' || json.xliff.file.length === 0) {
    throw new Error('xliff parameter must be valid xliff JSON.');
  }
  if (typeof cb !== 'function') {
    throw new Error('callback must be a function');
  }
  var output = {};
  var root = json.xliff;
  var newRoot = output;
  var file = root.file[0];
  var language = file.$['target-language'];
  if (options.languageHeader) {
    newRoot = output[language] = {};
  }
  var fields = file.body[0]['trans-unit'];
  var i;
  var id;
  var cursor;
  var paths;
  var parsed;
  newRoot = options.bundle;
  for (i = 0; i < fields.length; i++) {
    id = fields[i].$.id;
    paths = id.split('.').map(function (p) { return p.replace(/_\$DOT\$_/g, '.'); });
    cursor = newRoot;
    while (paths.length > 0) {
      if (paths.length === 1) {
        if (cursor[paths[0]]) {
          parsed = fields[i].target[0].match(/^_\$([a-zA-Z]*)\$_(.*)$/);
          if (parsed) {
            switch (parsed[1]) {
            case 'number':
              cursor[paths[0]] = Number(parsed[2]);
              break;
            case 'boolean':
              cursor[paths[0]] = Boolean(parsed[2] === 'true');
              break;
            case 'object':
              cursor[paths[0]] = JSON.parse(parsed[2]);
              break;
            default:
              cursor[paths[0]] = parsed[2];
              break;
            }
          }
          else {
            cursor[paths[0]] = fields[i].target[0];
          }
          paths.shift();
        }
        else {
          //missing resource
        }
        break;
      }
      else {
        if (!cursor[paths[0]]) {
          //missing resource
          break;
        }
        cursor = cursor[paths.shift()];
      }
    }
  }
  output = newRoot;
  cb(output);
};

Xliff2JSON.prototype.parseJSON = function (xliffJson, options, cb){
  var that = this;
  if (typeof xliffJson !== 'object'){
    throw new Error('xliff parameter must be JSON.');
  }
  if (arguments.length === 2){
    cb = options;
    options = {};
  }
  else {
    options = options || {};
  }
  if (typeof cb !== 'function'){
    throw new Error('callback must be a function');
  }
  var template = _.template(this.xliffTemplate);
  that._parseJSONAndDecorate(xliffJson, options, function (decoratedJson) {
    cb(template(_.extend(decoratedJson, {
      __XMLEscape: function (str) {
        if (typeof str === 'string') {
          return str.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');//.replace(/"/g, '&quot;');
        }
        else if (typeof str === 'object') {
          return '_$' + (typeof str) + '$_' + JSON.stringify(str);
        }
        else if (typeof str !== 'undefined') {
          return '_$' + (typeof str) + '$_' + str.toString();
        }
        else {
          return '';
        }
      },
      __ISODate: function () {
        return that.date.toISOString().replace(/[.][0-9]*Z$/, 'Z');
      }
    })));
  });
};

/* The following _flatten method is based on https://github.com/hughsk/flat/blob/master/index.js */
Xliff2JSON.prototype._flatten = function (target, opts) {
  /*
  https://github.com/hughsk/flat/blob/master/LICENSE

  Copyright (c) 2014, Hugh Kennedy
  All rights reserved.

  Redistribution and use in source and binary forms, with or without modification,
  are permitted provided that the following conditions are met:

  1. Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

  3. Neither the name of the  nor the names of its contributors may be used
    to endorse or promote products derived from this software without specific
    prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
  OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
  OF THE POSSIBILITY OF SUCH DAMAGE.
  */

  opts = opts || {};

  var delimiter = opts.delimiter || '.';
  var output = {};

  function step (object, prev) {
    Object.keys(object).forEach(function (key) {
      var value = object[key];
      var isArray = opts.safe && Array.isArray(value);
      var type = Object.prototype.toString.call(value);
      var isObject = (
        type === '[object Object]' ||
        type === '[object Array]'
      );

      var newKey = prev
        ? prev + delimiter + key
        : key;

      if (!isArray && isObject && Object.keys(value).length) {
        return step(value, newKey);
      }

      output[newKey] = value;
    });
  }

  step(target);

  return output;
};

Xliff2JSON.prototype._parseJSONAndDecorate = function(json, options, cb) {
  if (typeof json !== 'object') {
    throw new Error('json parameter must be JSON.');
  }
  if (typeof options !== 'object') {
    throw new Error('options parameter must be an object.');
  }
  if (typeof cb !== 'function') {
    throw new Error('callback must be a function');
  }
  var language = options.destLanguage || 'fr';
  var output = {
    xliff: {
      '$': {
        'version': '1.0'
      },
      'file':[{
        '$': {
          'source-language': options.srcLanguage || 'en',
          'target-language': options.destLanguage || 'fr',

          'datatype': options.dataType || 'plaintext',
          'original': options.original || 'messages',
          'product-name': options.productName || 'messages'
        },
        'header': [{}],
        'body': [{
          'trans-unit': []
        }]
      }]
    }
  };
  var translations = json[language] || json;
  var translationKeys = Object.keys(translations);
  var sources = json[''];
  translations = this._flatten(translations, { delimiter: '/' });
  sources = this._flatten(sources, { delimiter: '/' });
  translationKeys = Object.keys(this.useSources ? sources : translations).filter(function (key) {
    return typeof translations[key] !== 'function' &&
      typeof translations[key] !== 'object' &&
      key !== 'bundle' &&
      !key.match(/^[^\/]*[\/]meta[\/]/) &&
      !key.match(/^[^\/]*[\/]meta$/);
  });

  for(var i = 0; i < translationKeys.length; i++) {
    var translationTarget = translations[translationKeys[i]];
    var targetValue = translationTarget || sources[translationKeys[i]];
    if (typeof targetValue === 'object' &&
        !targetValue.length) {
      continue;
    }
    var unit = {
      '$': {'id': translationKeys[i].replace(/[.]/g, '_$DOT$_').replace(/\//g, '.') },
      'source': typeof sources[translationKeys[i]] !== 'undefined'
                                  ? [sources[translationKeys[i]]]
                                  : [sources[translationKeys[i] + '/other']],
      'target': [targetValue]
    };
    output.xliff.file[0].body[0]['trans-unit'].push(unit);
  }
  cb(output);
};