import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import initMongo from './src/database/database.js'

dotenv.config()

const app = express()
const { mongoClient, db } = await initMongo()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send('Hello world!')
})

app.post('/participants', async (req, res) => {
    const name = req.body.name

    try {
        mongoClient.connect()

        const participantsCollection = db.collection('participants')
        const dbMessages = db.collection('messages')

        await participantsCollection.insertOne({name , lastStatus: Date.now()})
        await dbMessages.insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(Date.now()).format('HH:mm:ss')})

        res.sendStatus(201)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }

    mongoClient.close()
})

app.get('/participants', async (req, res) => {
    try {
        mongoClient.connect()

        const participantsCollection = db.collection('participants')
        const participants = await participantsCollection.find({}).toArray()
  
        res.send(participants)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
  
    mongoClient.close()
})

app.post('/messages', async (req,res) => {
    console.log(`user ~> ${req.header('User')}`)

    const { to, text, type } = req.body
    let from = req.header('User')

    try {
        mongoClient.connect()

        const messagesCollection = db.collection('messages')
        await messagesCollection.insertOne({from, to, text, type, time: dayjs(Date.now()).format('HH:mm:ss')})

        res.sendStatus(201)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }

    mongoClient.close()
})

app.get('/messages', async (req, res) => {
    let name = req.header('User')
    console.log(req.header('User'))

    try {
        mongoClient.connect()

        const messagesCollection = db.collection('messages')
        const messages = await messagesCollection
        .find({ $or: [{ type: 'message' }, { type: 'status' }, { from: name }, { to: name }]})
        .limit(parseInt(req.query.limit))
        .sort({ time: -1 }).toArray()
  
        res.send(messages)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
  
    mongoClient.close()
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
  
    mongoClient.close()
})

app.listen(process.env.PORT, () => {
    console.log('Servidor rodando na porta:', process.env.PORT)
})