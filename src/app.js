import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import {MongoClient} from "mongodb"
import dayjs from "dayjs"

import {schemaParticipant, schemaMessage} from "./schema.js"

dotenv.config()

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL)

mongoClient.connect()
.then(() => {
    db = mongoClient.db('projeto13-uol')
})
.catch(err => console.log(err))


const server = express()
server.use(cors())
server.use(express.json())

server.listen(process.env.PORT, () => console.log(`Running on PORT: ${process.env.PORT}`))


server.get('/participants', async (req, res) => {
    
    let participantsPromise = await db.collection('participants').find().toArray().then(res => {
        return res
    })
    // const test = await db.collection('participants').find().toArray()
    // console.log(test)
    return res.send(participantsPromise)
})

server.post('/participants', async (req, res) => {
    try{
        const participantValidated = await schemaParticipant.validateAsync(req.body)
        
        const newParticipantName = req.body.name
        
        const participant = {
            name: newParticipantName,
            lastStatus: Date.now()
        }

        const userAlreadyRegistered = await db.collection('participants').findOne({name: participant.name})
        
        
        if(userAlreadyRegistered) return res.status(409).send('Usuário já cadastrado!')      
        
        await db.collection('participants').insertOne(participant)
        
        
        return res.sendStatus(201)
    } catch(err){
        return res.status(422).send('Não foi possível fazer o cadastro!')
    }

})

server.post('/messages', async (req, res) => {
    try{
        const participantExist = await db.collection('participants').findOne({name: req.headers.user})

        console.log(participantExist.name)
        
        if(!participantExist) return res.sendStatus(422)

        const message = await schemaMessage.validateAsync(req.body)

        const savedMessage = await db.collection('messages').insertOne({
            from: participantExist.name,
            ...message,
            time: dayjs(Date.now()).format('HH:mm:ss')
        })
        
        return res.sendStatus(201)

    }catch(err){
        console.log(err)
        return res.sendStatus(422)
    }

})

