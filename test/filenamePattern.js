var _ = require( "lodash" );
var compile = require( "../lib/filenamePattern.js" );

_.forOwn( {
	"*.js": {
		".js": true,
		"file.js": true,
		"file.Js": false,
		"file.json": false,
		"filepjs": false
	},
	"tmp??/file": {
		"tmp01/file": true,
		"tmp1/file": false,
		"tmp/1/file": false,
		"tmp012/file": false
	},
	"*.js;tmp??/file": {
		".js": true,
		"file.js": true,
		"file.Js": false,
		"file.json": false,
		"filepjs": false,
		"tmp01/file": true,
		"tmp1/file": false,
		"tmp/1/file": false,
		"tmp012/file": false
	},
	"tmp/*/file": {
		"tmp//file": true,
		"tmp/1/file": true,
		"tmp/dhjgfsgd/file": true,
		"tmp/0/1/file": false
	},
	"tmp/**/file": {
		"tmp//file": true,
		"tmp/1/file": true,
		"tmp/dhjgfsgd/file": true,
		"tmp/0/1/file": true,
		"tmp/0/1/2/file": true,
	},
	"/root/folder/file": {
		"/root/folder/file": true,
		"something/root/folder/file": false
	},
	"file<.min>.js" : {
		"path/to/file.js": true,
		"path/to/file.min.js": true,
		"path/to/file..js": false,
		"path/to/file<.min>.js": false
	}
}, function( results, pattern ) {
	module.exports[ pattern ] =  function( test ) {
		var regexp = compile( pattern );
		_.forOwn( results, function( result, filename ) {
			test.strictEqual( regexp.test( filename ), result, filename );
		} );
		test.done();
	};
} );
