/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB; 

function requiredFields(obj) {
  if (obj.issue_title && obj.issue_text && obj.created_by) {
    return true;
  }
      
return false;
}

function parseBoolean(val) {
 return val == 'true' || val == true; 
}

module.exports = function (app) {

  MongoClient.connect(CONNECTION_STRING, function(err, db) {
    console.log('Database connected');
    
    app.route('/api/issues/:project')
    .get(function (req, res){
      var project = req.params.project;
      
      if (req.query && req.query.open) {
        req.query.open = parseBoolean(req.query.open);
      }
      
      var query = {project, ...req.query};
      
      db.collection('issues').find(query).toArray()
      .then(result => {
        res.json(result);
      })
      .catch(err => {
        res.status(500).send(err);
      })
    })
    .post(function (req, res){
      var project = req.params.project;
      var {
        issue_title = "", 
        issue_text = "", 
        created_by = "", 
        assigned_to = "", 
        status_text = ""
      } = req.body;
      
      if (requiredFields(req.body)) {
        db.collection('issues').insertOne({
          project,
          issue_title, 
          issue_text, 
          created_by, 
          assigned_to, 
          status_text,
          created_on: new Date(),
          updated_on: new Date(),
          open: true
        })
          .then(result => {res.json(result.ops[0]);})
          .catch(err => {res.status(500).send(err);})
      } else {
        res.type('txt').send('missing required fields');
      }
    })
    .put(function (req, res){
      var project = req.params.project;

      if (Object.keys(req.body).length === 0){
        return res.type('txt').send('no updated field sent');
      }
      
      var {
        _id,
        issue_title, 
        issue_text, 
        created_by, 
        assigned_to, 
        status_text
      } = req.body;
      
      if (!_id) {
        return res.type('txt').send('missing _id');
      }
      
      var updates = {...req.body, project, updated_on: new Date()}
      delete updates._id;
      
      db.collection('issues').updateOne({_id: new ObjectId(_id)}, {$set: updates})
        .then(result => {
          var message = "";
        
          if (result.modifiedCount > 0) {
            message = "successfully updated"    ;
          } else { 
            message = "could not update " + _id;
          }
        
          res.type('txt').send(message);
        })
        .catch(err => {
          console.log(err);
          res.status(500).send(err);
      });
    })
    .delete(function (req, res){
      var project = req.params.project;
      
      var {_id} = req.body;
      
      if (!_id) {
        return res.type('txt').send('_id error');
      }
      
      db.collection('issues').deleteOne({_id: new ObjectId(_id)})
      .then(result => {
        if (result.deletedCount === 1) {
          res.type('txt').send('deleted ' + _id);
        } else {
          res.type('txt').send('could not delete ' + _id);
        }
      })
      .catch(err => {
        res.status(500).send(err);
      })
    });
    
    //404 Not Found Middleware
    app.use(function(req, res, next) {
      res.status(404)
        .type('text')
        .send('Page Not Found');
    });
  });
};
