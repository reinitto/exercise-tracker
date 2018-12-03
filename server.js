const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.connect(process.env.MLAB_URI, {useMongoClient: true} )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
//Exercise type and schema
const exerciseSchema = new Schema({
description: {type: String, required:true},
  duration: {type: Number, required: true},
  date: Date
})
const Exercise = mongoose.model("exercise", exerciseSchema)

//Person type and schema
const personSchema = new Schema({
username: {type: String, required:true},
  exercises: [exerciseSchema]
})
const Person = mongoose.model("people", personSchema)

//Add new user
app.post("/api/exercise/:new-user", (req, res)=>{
  let person = new Person({
  username: req.body.username
})
  person.save()
    .then((data)=>{
      res.json(data)
   })
})
//Display all users 
app.get("/api/exercise/users", (req, res)=>{
  //Find all users and display username field, omit exercise 
  Person.find({}, "username" ,(err, doc)=>{
  if(err) res.json({error: err})
    else res.json(doc)
  })
})
app.post("/api/exercise/add", (req,res)=>{
  //Check if required fields are entered
  if(req.body.description && req.body.duration){
  Person.findById({_id: req.body.userId}, (err, person)=>{
    if(err) res.json({error:err})
      else {
        //Create new exercise
        let exercise = new Exercise({
          description: req.body.description,
          duration: req.body.duration,
          date: req.body.date || Date.now()
          })
        //Adding the new exercise to the array. Array.push is depricated or something
        person.exercises = person.exercises.concat(exercise)
             //Save the data and show to the user the person and the exercise added
        person.save( (err, person)=>{
          if(err) res.json({error: err})
            else {
              //Create a new obj to display result and omit _id from exercise
              res.json({
              _id: person._id,  
              username: person.username,
              exercise: {description: req.body.description, duration: req.body.duration, date: req.body.date|| new Date()}
              })
            }
        } )
      }
    })
    //Required fields not entered
  }else {
  res.json({error: "Description & duration fields are required"})
    }
})

//GET request
//Returns a Person object based on Query parameters
app.get("/api/exercises/log?", (req,res)=>{
  Person.findById({_id: req.query.userId}, (err, result)=>{
      if(err) res.json({error:err})
        else {
          //Shitty destructuring
          var exercises = result.exercises
          //filter out the correct exercises 
          if(req.query.from){
            var dateFrom = new Date(req.query.from)
              exercises = exercises.filter((item)=>{
                  return item.date > dateFrom
              })
          }
          //filtering out more items if the query exists
          if(req.query.to){  
            var dateTo = new Date(req.query.to)
            exercises = exercises.filter((item)=>{return item.date < dateTo})
          }
          //removing unnecessary items from the original object like _id and v
          exercises.map((exercise)=>{
                return {
                  description: exercise.description,
                  duration: exercise.duration,
                  date: exercise.date
                  }
            })
          //limiting how many exercise items to display
            if(req.query.limit){
                exercises.length = req.query.limit-1
              }
          //creating the response object
          var obj = {
             _id: result._id,
            username: result.username,
            count: exercises.length? exercises.length: 0,
            exercises: exercises
          }
          return res.json(obj)
      }
  })
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
