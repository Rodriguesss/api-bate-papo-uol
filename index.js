import express from 'express'
import joi from 'joi'
import cors from 'cors'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import initMongo from './src/database/database.js'

dotenv.config()

const app = express()
const { mongoClient, db } = await initMongo()

mongoClient.connect()

const MILLISECONDS = 10000

app.use(express.json())
app.use(cors())

setInterval(async () => {
    let messages = []

    try {
        const participantsCollection = db.collection('participants')
        const messagesCollection = db.collection('messages')

        const participantsWithTimeOut = await participantsCollection.find({ lastStatus: { $lte: (Date.now() - MILLISECONDS) } }).toArray()
    
        if (participantsWithTimeOut.length === 0) {
            return
        }

        participantsWithTimeOut.forEach(participant => {
            messages.push({
                from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs(Date.now()).format('HH:mm:ss')
            })
        })

        await participantsCollection.deleteMany({ lastStatus: { $lte: (Date.now() - MILLISECONDS) } })
        await messagesCollection.insertMany([...messages])
        
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
}, 15000)

app.get('/', (req, res) => {
    res.send('Hello world!')
})

app.post('/participants', async (req, res) => {
    const bodySchema = joi.object({
        name: joi.string().required()
    })

    const validation = bodySchema.validate(req.body, { abortEarly: true })

    try {
        mongoClient.connect()

        const participantsCollection = db.collection('participants')
        const dbMessages = db.collection('messages')

        if (validation.error) {
            res.sendStatus(422)
        } else {
            const name = req.body.name
            const participant = await participantsCollection.find({ name }).toArray()

            if (participant.length !== 0) {
                res.sendStatus(409)
            } else {
                await participantsCollection.insertOne({name , lastStatus: Date.now()})
                await dbMessages.insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(Date.now()).format('HH:mm:ss')})

                res.sendStatus(201)
            }
        }
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
})

app.get('/participants', async (req, res) => {
    try {
        const participantsCollection = db.collection('participants')
        const participants = await participantsCollection.find({}).toArray()
  
        res.send(participants)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
})

app.post('/messages', async (req,res) => {
    const { to, text, type } = req.body
    let from = req.header('User')

    const bodySchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message', 'private_message').required()
    })

    const validation = bodySchema.validate(req.body, { abortEarly: true })

    try {
        const messagesCollection = db.collection('messages')
        const participantsCollection = db.collection('participants')

        if (validation.error) {
            res.sendStatus(422)
        } else {
            const participant = await participantsCollection.find({ name: from }).toArray()

            if (participant.length === 0) {
                res.sendStatus(422)
            } else {
                await messagesCollection.insertOne({from, to, text, type, time: dayjs(Date.now()).format('HH:mm:ss')})
                
                res.sendStatus(201)
            }
        }
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
})

app.get('/messages', async (req, res) => {
    let name = req.header('User')

    try {
        mongoClient.connect()

        const messagesCollection = db.collection('messages')
        const messages = await messagesCollection
        .find({ $or: [{ type: 'message' }, { type: 'status' }, { from: name }, { to: name }]})
        .limit(parseInt(req.query.limit))
        .sort({ time: 1 }).toArray()
  
        res.send(messages)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
})

app.post('/status', async (req, res) => {
    let name = req.header('User')

    try {
        mongoClient.connect()

        const participantsCollection = db.collection('participants')
        const participant = await participantsCollection.find({ name }).toArray()

        if (participant.length !== 0) {
            await participantsCollection.updateOne({ _id: participant[0]._id }, { $set: { lastStatus: Date.now() } })
            res.sendStatus(200) 
        } else {
            res.sendStatus(404)
        }
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
})

app.listen(process.env.PORT, () => {
    console.log('Servidor rodando na porta:', process.env.PORT)
})