import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import {MongoClient, ObjectId} from "mongodb"
import dayjs from "dayjs"

import {schemaParticipant, schemaMessage} from "./schema.js"

dotenv.config()

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL)

mongoClient.connect()
.then(() => {
    db = mongoClient.db()
})
.catch(err => console.log(err))


const server = express()
server.use(cors())
server.use(express.json())

server.listen(process.env.PORT, () => console.log(`Running on PORT: ${process.env.PORT}`))


server.post('/status', async (req, res) => {
    try{
        const {user} = req.headers

        const userIsRegistered = await db.collection('participants').findOne({name: user})

        if(!userIsRegistered) return res.sendStatus(404)

        await db.collection('participants').updateOne({name: user}, { $set: {lastStatus:Date.now()}})

        return res.sendStatus(200)

    }catch(err){
        console.log(err)
        return res.sendStatus(500)
    }
})

server.get('/participants', async (req, res) => {
    try{
        let participantsPromise = await db.collection('participants').find().toArray()
        
        return res.send(participantsPromise)
    } catch (err){
        console.log(err)
        return res.sendStatus(404)
    }
    
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
        
        const participantRegister = {
            from: participant.name,
            to: 'Todos',
            text: 'entra na sala...',
            type:'status',
            time: dayjs(Date.now()).format('HH:mm:ss')
        }

        await db.collection('messages').insertOne(participantRegister)
        
        return res.sendStatus(201)
    } catch(err){
        return res.status(422).send('Não foi possível fazer o cadastro!')
    }

})

server.get('/messages', async (req, res) => {
    try{
        const {query} = req
        const {user} = req.headers


        let messagesPromise = await db.collection('messages').find({ $or: [{ from: user }, { to: user }, { to: "Todos" }] }).toArray()


        if(query.limit){
            const limit = Number(query.limit)

            return res.send([...messagesPromise].slice(-limit))
        }

        return res.send([messagesPromise].slice(-100))
    }catch(err){
        console.log(err)
        return res.sendStatus(422)
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

function removeInactiveParticipants(){
    const tolerance = 10000 //10 seconds

    setInterval(async () => {
        const limit = Date.now() - tolerance

        try{
            const allParticipants = await db.collection('participants').find().toArray()

            allParticipants.forEach(async participant => {
                if(participant.lastStatus < limit){
                    await db.collection('participants').deleteOne({_id: ObjectId(participant._id)})

                    await db.collection('messages').insertOne({
                        from: participant.name,
                        to: 'Todos',
                        text: 'saiu na sala...',
                        type:'status',
                        time: dayjs(Date.now()).format('HH:mm:ss')
                    })
                }
            })
        }catch(err){
            console.log(err)
            return res.sendStatus(500)
        }
    }, tolerance)
}
removeInactiveParticipants()

