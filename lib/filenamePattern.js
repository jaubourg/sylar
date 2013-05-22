var reserved = "\\.?*+(){}[]^$:=!|,".split( "" ).map( function( char ) {
	return "\\" + char;
} ).join( "|" );

var r_items = new RegExp( "(\\*\\*|" + reserved + ")", "g" );
var r_root = /^\//;
var r_optional = /<([^>]+)>/g;

var special = {
	"*": "[^/]*",
	"**": ".*",
	"?": "[^/]"
};

module.exports = function( expr ) {
	var newExpr = [];
	expr.split( ";" ).forEach( function( expr ) {
		expr = expr.trim();
		if ( expr ) {
			newExpr.push( expr.replace( r_items, function( _, item ) {
				return special[ item ] || ( "\\" + item );
			} ).replace( r_optional, "(?:$1)?" ).replace( r_root, "^/" ) + "$" );
		}
	} );
	if ( !newExpr.length ) {
		throw "no file expression in '" + expr + "'";
	}
	return new RegExp( newExpr.join( "|" ) );
}
