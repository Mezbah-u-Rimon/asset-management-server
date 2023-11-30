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
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://asset-management-website.netlify.app'
    ],
    credentials: true
}))
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
        const addItemCollection = await client.db("assetDB").collection("addItems")
        const addTeamCollection = await client.db("assetDB").collection("addTeam")
        const requestItemCollection = await client.db("assetDB").collection("requestItem")



        // require('crypto').randomBytes(64).toString('hex')
        //jwt token create
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECURE, { expiresIn: '100001h' });
            res.send({ token })
        })

        // create middleware verify token
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access token' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECURE, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access token' })
                }
                req.decoded = decoded;
                next();
            })

        }


        //use verify Admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await adminUserCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access token' })
            }
            next();
        }


        //use verify Employee after verify token
        const verifyEmployee = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await employeeUserCollection.findOne(query);
            const isEmployee = user?.role === 'employee';
            if (!isEmployee) {
                return res.status(403).send({ message: 'forbidden access token' })
            }
            next();
        }


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

        app.get('/adminUsers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await adminUserCollection.findOne(query)
            const admin = user?.role === 'admin' && true;
            if (!admin) {
                return res.status(403).send({ message: 'forbidden access token' })
            }
            res.send({ user, admin });
        })

        app.patch("/adminUsers/:id", async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    members: item.members,
                }
            }
            const result = await adminUserCollection.updateOne(filter, updatedDoc)
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

        app.get('/employeeUsers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await employeeUserCollection.findOne(query)
            const employee = user?.role === 'employee' && true;
            if (!employee) {
                return res.status(403).send({ message: 'forbidden access token' })
            }
            res.send({ employee });
        })


        app.get('/employeeUsers', async (req, res) => {
            const result = await employeeUserCollection.find().toArray();
            res.send(result)
        })

        app.patch('/employeeUsers/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    approved: item.approved,
                }
            }
            const result = await employeeUserCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })



        //add items collection
        app.post('/addItems', async (req, res) => {
            const items = req.body;
            const result = await addItemCollection.insertOne(items);
            res.send(result)
        })

        app.get('/addItems', async (req, res) => {
            let queryType = {};
            let filter = {};
            const min = parseFloat(req.query.min);
            const max = parseFloat(req.query.max);
            const search = req.query.search;
            const filterType = req.query.filter;

            if (min || max) {
                if (!isNaN(min) && !isNaN(max)) {
                    filter = { quantity: { $gte: min, $lte: max } };
                } else if (!isNaN(min)) {
                    filter = { quantity: { $gte: min } };
                } else if (!isNaN(max)) {
                    filter = { quantity: { $lte: max } };
                }
            }

            if (filterType) {
                queryType.type = filterType;
            }

            const itemResult = {
                name: { $regex: search, $options: 'i' },
            };

            const result = await addItemCollection.find(itemResult, queryType, filter,).toArray();
            res.send(result)
        })

        app.get("/addItems/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await addItemCollection.findOne(query);
            res.send(result)
        })

        app.patch("/addItems/:id", async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    image: item.image,
                    productType: item.productType,
                    quantity: item.quantity,
                    price: item.price,
                    type: item.type,
                    name: item.name,
                }
            }
            const result = await addItemCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete("/addItems/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await addItemCollection.deleteOne(query)
            res.send(result);
        })


        // add a requested item
        app.post('/requestItem', async (req, res) => {
            const item = req.body;
            const result = await requestItemCollection.insertOne(item);
            res.send(result);
        })

        app.get('/requestItem', async (req, res) => {
            const search = req.query.search;
            const itemSearch = {
                productName: { $regex: search, $options: 'i' },
            };

            const result = await requestItemCollection.find(itemSearch).toArray();
            res.send(result)
        })


        app.get('/requestItem/:email', async (req, res) => {
            let queryType = {};
            const search = req.query.search;
            const filterType = req.query.filter;
            const email = req.params.email;

            const query = { requesterEmail: email }

            if (filterType) {
                queryType.type = filterType;
            }

            const itemResult = {
                productName: { $regex: search, $options: 'i' },
            };

            const result = await requestItemCollection.find(query, itemResult, queryType,).toArray();
            res.send(result)
        })


        app.patch("/requestItem/:id", async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    approved: item.approved,
                    pending: item.pending,
                    approvalDate: item.approvalDate,
                }
            }
            const result = await requestItemCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete("/requestItem/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await requestItemCollection.deleteOne(query)
            res.send(result);
        })



        //add the team member collection
        app.post('/addTeam', async (req, res) => {
            const member = req.body;
            const result = await addTeamCollection.insertOne(member);
            res.send(result)
        })

        app.get("/addTeam/:email", async (req, res) => {
            const email = req.params.email;

            const query = { adminEmail: email }
            const queryEmail = { email: email }
            const result = await addTeamCollection.find(query, queryEmail).toArray();
            res.send(result)
        })

        app.delete("/addTeam/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await addTeamCollection.deleteOne(query)
            res.send(result);
        })


        //payment method
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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