require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const cors = require('cors')
const port = process.env.PORT || 5000;


// console.log(process.env.STRIPE_SECRET_KEY);
//middleware
app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fgd8wc9.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const adminUserCollection = await client.db("assetDB").collection("adminUsers")
        const employeeUserCollection = await client.db("assetDB").collection("employeeUsers")


        //admin user collection
        app.post('/adminUsers', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await adminUserCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await adminUserCollection.insertOne(user);
            res.send(result)
        })

        app.get('/adminUsers', async (req, res) => {
            const result = await adminUserCollection.find().toArray();
            res.send(result)
        })



        //employee user collection
        app.post('/employeeUsers', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await employeeUserCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await employeeUserCollection.insertOne(user);
            res.send(result)
        })



        //payment method
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log("amount item inside the item", amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            console.log("payment tk dollar asse", paymentIntent);
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("Hello Asset Management")
})

app.listen(port, () => {
    console.log(`Asset Management is sitting on port ${port}`);
})