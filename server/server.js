const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // Add this line
const { fileURLToPath } = require('url');
const { dirname } = require('path');
const { MongoClient } = require('mongodb');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://jagetiyard:xNjXBvYCbnILcRQZ@specialworddictionary.iwkwwyd.mongodb.net/";
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

const wordSchema = new mongoose.Schema({
  word: String,
  description: String,
});

const Word = mongoose.model('Word', wordSchema);

const backupWordSchema = new mongoose.Schema({
  word: String,
  description: String,
});

const BackupWord = mongoose.model('BackupWord', backupWordSchema);

// app.get('/', (req, res) => {
//   res.send('Hello from our server!')
// })

app.get('/api/words', async (req, res) => {
  try {
    const words = await Word.find();
    res.json(words);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Add this route to your server.js or routes file
app.get('/api/words/all', async (req, res) => {
    try {
      const words = await Word.find();
      res.json(words);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });  

// API route to add a new word
app.post('/api/words', async (req, res) => {
    try {
      const { word, description } = req.body;
  
      // Validate if word and description are present
      if (!word || !description) {
        return res.status(400).json({ message: 'Word and description are required.' });
      }
  
      // Save the word and description to MongoDB
      const newWord = new Word({ word, description });
      await newWord.save();
      
      const newBackupWord = new BackupWord({ word, description });
      await newBackupWord.save();

      // Respond with success
      res.status(201).json({ message: 'Word added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

app.put('/api/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, description } = req.body;
    await Word.findByIdAndUpdate(id, { word, description });
    res.json({ message: 'Word updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Your existing route definition
app.delete('/api/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Word ID to delete:', id); // Log the ID to check if it's correct

    const deletedWord = await Word.findOneAndDelete({ _id: id });
    console.log('Deleted word:', deletedWord); // Log the deleted word to see if it's successful

    if (!deletedWord) {
      return res.status(404).json({ message: 'Word not found' });
    }

    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a route to delete words from the backup database
app.delete('/api/backupwords/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Backup Word ID to delete:', id); 

    const deletedBackupWord = await BackupWord.findOneAndDelete({ _id: id });
    console.log('Deleted backup word:', deletedBackupWord); 

    if (!deletedBackupWord) {
      return res.status(404).json({ message: 'Word not found in backup database' });
    }

    res.json({ message: 'Word deleted successfully from backup database' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a route to fetch all words from the backup database
app.get('/api/backupwords/all', async (req, res) => {
  try {
    const backupWords = await BackupWord.find();
    res.json(backupWords);
  } catch (error) {
    console.error('Error fetching backup words:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add console log to print out resolved path for serving index.html
const indexPath = path.join(__dirname, '../client/build/index.html');
console.log("Resolved index.html path:", indexPath);

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
