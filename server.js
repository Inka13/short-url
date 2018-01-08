
var express = require('express');
var app = express();

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.MONGOLAB_URI;

// creating a schema for our DB document
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var urlSchema = new Schema({
  longURL:  String,
  shortURL: String
});
var URLs = mongoose.model('urls', urlSchema);
app.use(express.static('public'));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/short/:longURL(*)", function (request, response) { 
  var longURL = request.params.longURL, 
      shortURL,
      data;
  
  var regexp = new RegExp(/^(http|https)/);
  if(regexp.test(longURL)===false) {longURL = 'http://' + longURL;}
  
  regexp = new RegExp(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/);
  if (regexp.test(longURL)===true){
    // URL is valid
    // connecting to our DB
    MongoClient.connect(mongoUrl, function (err, db) {
      if(err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
        throw err;
      }
      console.log('Connected...');
      
      function insertData(data){
        console.log(data);
        db.collection('urls').insert(data, (err,res) =>{
              if(err) {
                console.log('Unable to insert a document');
                return response.send('something went wrong');
              } else {
                console.log('inserted new entry');
                return response.send(data);;
              }
              db.close();
        });
      }
      
      function checkExist(){
        db.collection('urls').findOne({'longURL': longURL}, (err, res) => {
          if(err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            throw err;
          }
          // if longURL is already in db
          if(res) {
            console.log('Found one...');
            db.close();
           return response.send(res);
          } else {
                console.log('New entry...');
              //check the biggest entry 
                var biggest = db.collection('urls').find().sort({"shortURL":-1}).limit(1);
                biggest.forEach((doc, err) =>{
                  if(err) throw err;
                  shortURL = (+doc.shortURL + 1).toString();
                  console.log(shortURL);
                  data = new URLs({
                    longURL,
                    shortURL
                  });
                }, function(){
                  insertData(data);
                });
          }
        });
      }
      
     checkExist();
    }); // mongodb end
  } else {
      response.send('Not a valid URL');
  }
});
app.get("/:shortURL(*)", function (request, response) {
  mongodb.connect(mongoUrl, function (err, db) {
    var {shortURL} = request.params;
      if (err) {
        console.log('Unable to connect to mongoDB');
      } else {
        console.log('Connection established to', mongoUrl);
        db.collection('urls').findOne({'shortURL': shortURL}, (err, res) => {
          if(err) throw err;
        if(res){
        response.redirect(res.longURL);
        } else {
         response.send('No such url in database, please create one'); 
        }
        });
      }
    db.close();
    }); // mongodb end
  
  
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
