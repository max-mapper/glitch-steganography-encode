var nconf = require('nconf')
var bodyParser = require('body-parser')
var dataUriToBuffer = require('data-uri-to-buffer')
var express = require('express')
var lsb = require('lsb')
var getPixels = require('get-pixels')
var savePixels = require('save-pixels')
var concat = require('concat-stream')
var os = require('os')
var fs = require('fs')
var path = require('path')
var app = express()

nconf.argv().env().file({ file: 'local.json'})

app.use(bodyParser.json({limit: '2mb'}))
app.use(express.static(__dirname + '/public'))

app.get('/', function(req, res) {
  res.sendFile( __dirname + '/index.html')
})

app.post('/service', function(req, res) {
  var imgBuff = dataUriToBuffer(req.body.content.data)
  
  var tmp = randomTmpPath() + '.png'
  fs.writeFile(tmp, imgBuff, function(err) {
    if (err) console.error('error', err)
    
    getPixels(tmp, function(err, pixels) {
      if(err) {
        console.log("Bad image path")
        return
      }

      var pxlArray = pixels.shape.slice()
      
      lsb.encode(pixels.data, 'SUP DAWGZ', pickRGB)
      
      savePixels(pixels, "png").pipe(concat(function(png) {
        console.log('DONE')
        var dataUri = 'data:' + imgBuff.type + ';base64,' + png.toString('base64')
        req.body.content.data = dataUri
        req.body.content.type = imgBuff.type
        res.json(req.body)
      }))
    })
  })
})

var port = nconf.get('port')
app.listen(port)
console.log('server running on port: ', port)

// skips every fourth byte when encoding images,
// i.e. leave the alpha channel
// alone and only change RGB
function pickRGB(idx) {
  return idx + (idx/3) | 0
}

function randomTmpPath() {
  return path.join(os.tmpdir(), Date.now() + '-' + Math.random().toString().substring(2))
}
