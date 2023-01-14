import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import {MongoClient} from "mongodb"

dotenv.config()

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL)

mongoClient.connect()
.then(() => {
    db = mongoClient.db("projeto13-uol")
})
.catch(err => console.log(err))


const server = express()
server.use(cors())
server.use(express.json())

server.listen(process.env.PORT, () => console.log(`Running on PORT: ${process.env.PORT}`))


// server.get('/participants', async (req, res) => {
    
//     let participantsPromise = await db.collection('participants').find().toArray().then(res => {
//         return res
//     })
//     // const test = await db.collection('participants').find().toArray()
//     // console.log(test)
//     return res.send(participantsPromise)
// })

server.post('/participants', async (req, res) => {
    const user = {
        name: req.body.name,
        lastStatus: Date.now()
    }
    console.log(user)

    if(!user.name) return res.status(422).send('Não foi possível fazer o cadastro!')
    
    const userAlreadyRegistered = await db.collection('participants').findOne({name: user.name})
    
    if(userAlreadyRegistered) return res.status(409).send('Usuário já cadastrado!')
    

    await db.collection('participants').insertOne(user)

    console.log(user)

    return res.sendStatus(201)



})

server.post('/messages', async (req, res) => {
    const message = req.body
    console.log(message)
    return res.sendStatus(201)
})

