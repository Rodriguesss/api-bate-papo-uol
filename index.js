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
  
        let participantsOnline = await participantsCollection.find({}).toArray()
  
        res.send(participantsOnline)
    } catch(err) {
        console.log(`Erro no servidor: ${err}`)
        res.sendStatus(500)
    }
  
    mongoClient.close()
});

app.listen(process.env.PORT, () => {
    console.log('Servidor rodando na porta:', process.env.PORT)
})