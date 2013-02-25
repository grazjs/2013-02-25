var http = require('http');
var path = require('path');
var url = require('url');
var send = require('send');

var wwwRoot = path.resolve(__dirname, 'wwwRoot');
var port = process.argv[2] || 8000;
var address = process.argv[3] || '127.0.0.1'

http.createServer(function (req, res) {

    send(req, url.parse(req.url).pathname)
        .root(wwwRoot)
        .pipe(res);

}).listen(port, address);

console.log('server listening at http://' + address + ':' + port + '/');