const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_KEY)
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// Middle ware
app.use(cors());
app.use(express.json());


const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized token" });
  }
  // toekn
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_WEB_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized token' })
    }
    req.decoded = decoded
    next()
  })
};

// console.log(process.env.DB_USER);

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0i3pjbq.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const ClassesCollection = client.db("Classes").collection("class");
    const usersCollection = client.db("Classes").collection("user");
    const SelectedCollection = client.db("Classes").collection("select");
    const menuCollection = client.db("Classes").collection("menu");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_WEB_TOKEN,
        { expiresIn: '1h' })
      res.send(token)
    })

    // admin check
    // const AdminCheck = async(req, res) =>{
    //   const email = req.decoded.email;
    //   const query = {email:email}
    //   const user = await usersCollection.findOne(query)
    //   if(user?.role !== 'admin'){
    //     return res.status(403).send({error:true, message:'forbidden access'})
    //   }
    //   next()
    // }







    // users api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      // console.log(existingUser);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        res.send({ admin: false })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role == 'admin' }
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.get('/users/instructor/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        res.send({ instructor: false })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role == 'instructor' }
      res.send(result)
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })



    // classs pai
    app.get("/class", async (req, res) => {
      const result = await ClassesCollection.find().toArray();
      res.send(result);
    });



    // selected api
    app.get('/selected', verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        return [];
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden Access' })
      }

      const step = { email: email };
      const result = await SelectedCollection.find(step).toArray()
      res.send(result)
    })

    app.post("/selected", async (req, res) => {
      const SelectClass = req.body;
      const result = await SelectedCollection.insertOne(SelectClass);
      res.send(result);
    });
    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await SelectedCollection.deleteOne(query)
      res.send(result)
    })


    // payment
    app.post('/payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Menu api
    // Menu api
    // app.get("/menu", async (req, res) => {
    //   const result = await menuCollection.find().toArray();
    //   res.send(result);
    // });

    // app.post('/menu',verifyToken, async(req, res) =>{
    //   const newItem = req.body;

    //   const result = await menuCollection.insertOne(newItem)
    //   res.send(result)
    // })

    // app.delete('/menu/:id',verifyToken, verifyAdmin, async(req, res) =>{
    //   const id = req.params.id;
    //   const query = {_id :new ObjectId(id)}
    //   const result = await menuCollection.deleteOne(query)
    //   res.send(result)
    // })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Photography Sever is running");
});
app.listen(port);