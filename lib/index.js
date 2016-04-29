module.exports = Xliff2JSON;

var xml2js = require('xml2js'),
  _ = require('underscore'),
  flat = require('flat');

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
  translations = flat.flatten(translations, { delimiter: '/' });
  sources = flat.flatten(sources, { delimiter: '/' });
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