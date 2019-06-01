/**
 * Load cookies from a file
 *
 * @param {String} file name of da file.
 *
 * @return {Array} of cookies.
 */
casper.loadCookies = function (file) {
  "use strict";
  var fs = require('fs');

  var cookies = [];
  if (fs.exists(file)) {
    cookies = fs.read(file).split("\r\n");
    cookies.forEach(function (cookie) {
      var detail = cookie.split("\t"),
          newCookie = {
        'name':   detail[5],
        'value':  detail[6],
        'domain': detail[0],
        'path':   detail[2],
        'httponly': false,
        'secure':   false,
        'expires':  (new Date()).getTime() + 3600 * 24 * 30 /* <- expires in 1 month */
      };
      phantom.addCookie(newCookie);
    });
  } else {
    //this.log("Unable to load cookies from " + file + ". File doesn't exist", "warning");
  }

  return cookies;
};

/**
 * Save cookies to a file
 *
 * @param {String} file name of da file.
 */
casper.saveCookies = function (file) {
  "use strict";
  var fs = require('fs');
  var utils = require('utils');

  var res = '';
  this.page.cookies.forEach(function (cookie) {
    res += utils.format("%s\t%s\t%s\t%s\t%s\t%s\t%s\r\n", cookie.domain, 'TRUE', cookie.path, 'FALSE', cookie.expiry, cookie.name, cookie.value);
  });
  fs.write(file, res, 'w');
};
