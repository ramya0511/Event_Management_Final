const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();

/* Middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* MongoDB */
mongoose.connect("mongodb://127.0.0.1:27017/eventDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

/* Models */
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: String,
  password: String
}));

const Event = mongoose.model("Event", new mongoose.Schema({
  title: String,
  date: String,
  location: String,
  category: String,
  image: String,
  favorite: { type: Boolean, default: false },
  rsvp: { type: String, default: "Interested" },
  totalSeats: { type: Number, default: 50 },
  seatsLeft: { type: Number, default: 50 }
}));

/* Pages */
app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"public","login.html")));
app.get("/signup",(req,res)=>res.sendFile(path.join(__dirname,"public","signup.html")));
app.get("/dashboard",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

/* Auth */
app.post("/signup", async (req,res)=>{
  const {name,email,password}=req.body;
  const exists = await User.findOne({email});
  if(exists) return res.status(400).send("Email exists");

  const hash = await bcrypt.hash(password,10);
  await User.create({name,email,password:hash});

  res.send("Signup successful");
});

app.post("/login", async (req,res)=>{
  const {email,password}=req.body;
  const user = await User.findOne({email});
  if(!user) return res.status(400).send("User not found");

  const ok = await bcrypt.compare(password,user.password);
  if(!ok) return res.status(400).send("Wrong password");

  res.json({name:user.name});
});

/* Events */
app.post("/addEvent", async (req,res)=>{
  const data = req.body;
  data.totalSeats = data.totalSeats || 50;
  data.seatsLeft = data.totalSeats;

  await Event.create(data);
  res.send("Added");
});

app.get("/events", async (req,res)=>{
  const data = await Event.find().sort({date:1});
  res.json(data);
});

app.put("/update/:id", async (req,res)=>{
  await Event.findByIdAndUpdate(req.params.id, req.body);
  res.send("Updated");
});

app.delete("/delete/:id", async (req,res)=>{
  await Event.findByIdAndDelete(req.params.id);
  res.send("Deleted");
});

/* Booking */
app.put("/book/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send("Event not found");

    const today = new Date().toISOString().split("T")[0];

    if (event.date < today) {
      return res.status(400).send("Cannot book past events");
    }

    if (event.seatsLeft <= 0) {
      return res.status(400).send("No seats left");
    }

    event.seatsLeft -= 1;
    await event.save();

    res.send("Booking confirmed");

  } catch (err) {
    res.status(500).send("Booking error");
  }
});

/* Favorite */
app.put("/favorite/:id", async (req,res)=>{
  const event = await Event.findById(req.params.id);
  event.favorite = !event.favorite;
  await event.save();
  res.send("Favorite updated");
});

/* RSVP */
app.put("/rsvp/:id", async (req,res)=>{
  await Event.findByIdAndUpdate(req.params.id,{
    rsvp:req.body.rsvp
  });
  res.send("RSVP updated");
});

/* Static */
app.use(express.static(path.join(__dirname, "public")));

app.listen(5000, ()=>{
  console.log("Server running on http://localhost:5000");
});