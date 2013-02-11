var swig = require("swig")
  , juiceDocument = require("juice").juiceDocument
  , path = require("path")
  , jsdom = require("jsdom")
  , createDummyContext = require('swig-dummy-context')

module.exports = init;
init.createDummyContext = createDummyContext;

function init(options, cb) {
  options = extend({
    root: path.join(__dirname, "templates"),
    allowErrors: true,
    urlRewriteFn: function(urlString) { return urlString; },
  }, options || {});
  swig.init(options);

  cb(null, render, dummyContext);

  function dummyContext(templateName, cb) {
    // compile file into swig template
    compileTemplate(templateName, function(err, template) {
      if (err) return cb(err);
      // return the tokens
      cb(null, createDummyContext(template));
    });
  }
    
  function render(templateName, context, cb) {
    // compile file into swig template
    compileTemplate(templateName, function(err, template) {
      if (err) return cb(err);
      // render template with context
      renderTemplate(template, context, function(err, html) {
        if (err) return cb(err);
        createJsDomInstance(html, function(err, document) {
          if (err) return cb(err);
          var fileUrl = "file://" + path.resolve(process.cwd(), path.join(options.root, templateName));
          juiceDocument(document, { url: fileUrl }, function(err) {
            if (err) {
              // free the associated memory
              // with lazily created parentWindow
              try {
                document.parentWindow.close();
              } catch (cleanupErr) {}
              cb(err);
            } else {
              var inner = document.innerHTML;
              document.parentWindow.close();
              cb(null, inner);
            }
          });
        });
      });
    });
  }
}

function createJsDomInstance(content, cb) {
  // hack to force jsdom to see this argument as html content, not a url
  // or a filename. https://github.com/tmpvar/jsdom/issues/554
  var html = content + "\n";
  var options = {
    features: {
      QuerySelector: ['1.0'],
      FetchExternalResources: false,
      ProcessExternalResources: false,
      MutationEvents: false,
    },
  };
  try {
    cb(null, jsdom.html(html, null, options));
  } catch (err) {
    cb(err);
  }
}

function compileTemplate(name, cb) {
  try {
    cb(null, swig.compileFile(name + ".html"));
  } catch (err) {
    cb(err);
  }
}

function renderTemplate(template, context, cb) {
  try {
    cb(null, template.render(context));
  } catch (err) {
    cb(err);
  }
}

var owns = {}.hasOwnProperty;
function extend(obj, src) {
  for (var key in src) if (owns.call(src, key)) obj[key] = src[key];
  return obj;
}
